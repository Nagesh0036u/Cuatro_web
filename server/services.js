'use strict';

const crypto = require('crypto');
const db = require('./db');
const { iso, lines } = require('./util');
const { splitList } = require('./matching');

const JOB_SELECT = `
  SELECT j.*, c.name AS category_name,
         (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.superseded = 0) AS applicant_count
  FROM jobs j JOIN categories c ON c.id = j.category_id`;

function todayStr() { return new Date().toISOString().slice(0, 10); }

function isAccepting(job) {
  if (job.status !== 'published') return false;
  if (job.deadline && job.deadline < todayStr()) return false;
  return true;
}

function salaryLabel(j) {
  if (j.salary_text) return j.salary_text;
  if (j.salary_min || j.salary_max) {
    const cur = j.salary_currency === 'INR' ? '\u20B9' : `${j.salary_currency || ''} `;
    const fmt = (n) => Number(n).toLocaleString('en-IN');
    const range = j.salary_min && j.salary_max ? `${cur}${fmt(j.salary_min)} - ${cur}${fmt(j.salary_max)}` : `${cur}${fmt(j.salary_min || j.salary_max)}`;
    return `${range} per ${j.salary_period || 'year'}`;
  }
  return null;
}

/** Public job representation (no internal fields). */
function jobView(j, { detail = false } = {}) {
  const view = {
    id: j.id,
    title: j.title,
    category: j.category_name,
    category_id: j.category_id,
    company: j.company_name,
    location: j.location,
    employment_type: j.employment_type,
    work_mode: j.work_mode,
    experience_level: j.experience_level,
    salary: salaryLabel(j),
    posted_at: iso(j.posted_at),
    deadline: j.deadline,
    short_description: j.short_description || String(j.description || '').slice(0, 180),
    is_demo: !!j.is_demo,
    status: j.status,
    accepting: isAccepting(j)
  };
  if (detail) {
    view.description = j.description;
    view.responsibilities = lines(j.responsibilities);
    view.skills = splitList(j.skills);
    view.qualifications = lines(j.qualifications);
    view.experience_years_min = j.experience_years_min;
  }
  return view;
}

/**
 * Creates a portal notification and (unless opts.email === false) e-mails the same update to the student.
 * The e-mail is sent after the current transaction finishes and only if the notification row still exists,
 * so a rolled-back operation never produces an e-mail.
 */
function notify(studentId, title, message, link, opts = {}) {
  const r = db.run('INSERT INTO notifications (student_id, title, message, link) VALUES (?,?,?,?)', studentId, title, message, link || null);
  if (opts.email === false) return;
  const id = Number(r.lastInsertRowid);
  setImmediate(() => {
    try {
      if (!db.get('SELECT 1 AS x FROM notifications WHERE id = ?', id)) return;
      const u = db.get('SELECT u.email, u.full_name FROM student_profiles p JOIN users u ON u.id = p.user_id WHERE p.id = ?', studentId);
      if (!u) return;
      const config = require('./config');
      const { sendMail } = require('./mailer');
      const url = link ? `${config.siteUrl}${link}` : `${config.siteUrl}/student-portal/dashboard`;
      const extra = opts.extra ? `\n\n${opts.extra}` : '';
      sendMail({
        to: u.email,
        subject: `${title} - Cuatro Tech Solutions`,
        text: `Hello ${u.full_name},\n\n${message}${extra}\n\nView it in your Student Portal:\n${url}\n\nCuatro Tech Solutions`
      }).catch((e) => console.error('Notification mail failed:', e.message));
    } catch (e) { console.error('Notification mail failed:', e.message); }
  });
}

/** E-mails the recruitment inbox (CONTACT_INBOX). Never throws. */
function notifyHr(subject, text) {
  const config = require('./config');
  const { sendMail } = require('./mailer');
  sendMail({ to: config.contactInbox, subject, text }).catch((e) => console.error('HR mail failed:', e.message));
}

function newApplicationCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 10; attempt++) {
    const bytes = crypto.randomBytes(6);
    let code = '';
    for (let i = 0; i < 6; i++) code += alphabet[bytes[i] % alphabet.length];
    const full = `CTS-${new Date().getFullYear()}-${code}`;
    if (!db.get('SELECT 1 AS x FROM applications WHERE application_code = ?', full)) return full;
  }
  throw new Error('Could not generate application ID');
}

const STATUS_INFO = {
  'Application Submitted': {
    title: 'Application submitted',
    message: (j) => `Your application for ${j} has been received.`,
    next: 'Our recruitment team will review your application.'
  },
  'Under Review': {
    title: 'Application under review',
    message: (j) => `Your application for ${j} is now being reviewed.`,
    next: 'We will update you once the review is complete.'
  },
  Shortlisted: {
    title: 'You have been shortlisted',
    message: (j) => `Good news. You have been shortlisted for ${j}.`,
    next: 'Watch this page for assessment or interview details.'
  },
  'Assessment Pending': {
    title: 'Assessment invitation',
    message: (j) => `An assessment has been requested for your application to ${j}.`,
    next: 'Complete the assessment using the details shared with you.'
  },
  'Interview Scheduled': {
    title: 'Interview scheduled',
    message: (j) => `An interview has been scheduled for ${j}.`,
    next: 'Attend the interview at the scheduled time.'
  },
  'Interview Completed': {
    title: 'Interview completed',
    message: (j) => `Your interview for ${j} has been completed.`,
    next: 'The team will share the final decision soon.'
  },
  Selected: {
    title: 'You have been selected',
    message: (j) => `Congratulations. You have been selected for ${j}.`,
    next: 'Our team will contact you with the next steps.'
  },
  Rejected: {
    title: 'Application update',
    message: (j) => `Thank you for applying for ${j}. We will not be moving forward with your application.`,
    next: null
  },
  Withdrawn: {
    title: 'Application withdrawn',
    message: (j) => `Your application for ${j} has been withdrawn.`,
    next: null
  }
};

module.exports = { JOB_SELECT, jobView, isAccepting, notify, notifyHr, newApplicationCode, STATUS_INFO, todayStr, salaryLabel };
