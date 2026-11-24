'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const db = require('../db');
const config = require('../config');
const sec = require('../security');
const meta = require('../categories');
const { Validator, wrap, HttpError, iso, likeEscape } = require('../util');
const { JOB_SELECT, jobView, notify, STATUS_INFO } = require('../services');

const router = express.Router();
router.use(sec.requireAdmin);

// ---- overview ------------------------------------------------------------------------------
router.get('/overview', (_req, res) => {
  const c = db.get(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'student') AS students,
      (SELECT COUNT(*) FROM jobs WHERE status = 'published') AS published_jobs,
      (SELECT COUNT(*) FROM jobs) AS total_jobs,
      (SELECT COUNT(*) FROM applications WHERE superseded = 0) AS applications,
      (SELECT COUNT(*) FROM applications WHERE superseded = 0 AND current_status = 'Under Review') AS under_review,
      (SELECT COUNT(*) FROM applications WHERE superseded = 0 AND current_status = 'Shortlisted') AS shortlisted,
      (SELECT COUNT(*) FROM applications WHERE superseded = 0 AND current_status = 'Interview Scheduled') AS interviews,
      (SELECT COUNT(*) FROM applications WHERE superseded = 0 AND current_status = 'Selected') AS selected,
      (SELECT COUNT(*) FROM applications WHERE superseded = 0 AND current_status = 'Rejected') AS rejected,
      (SELECT COUNT(*) FROM contact_messages WHERE status = 'New') AS new_messages`);
  const recent = db.all(`${APP_SELECT} WHERE a.superseded = 0 ORDER BY a.applied_at DESC, a.id DESC LIMIT 6`).map(appRow);
  res.json({ counts: c, recent });
});

// ---- jobs ----------------------------------------------------------------------------------
function adminJobView(j) {
  return {
    ...jobView(j, { detail: true }),
    short_description: j.short_description,
    responsibilities_text: j.responsibilities,
    qualifications_text: j.qualifications,
    skills_text: j.skills,
    experience_level: j.experience_level,
    salary_min: j.salary_min, salary_max: j.salary_max, salary_currency: j.salary_currency, salary_period: j.salary_period, salary_text: j.salary_text,
    applicant_count: j.applicant_count,
    created_at: iso(j.created_at), updated_at: iso(j.updated_at)
  };
}

router.get('/jobs', (req, res) => {
  const where = ['1=1']; const params = [];
  if (req.query.status) { where.push('j.status = ?'); params.push(req.query.status); }
  if (req.query.category) { where.push('j.category_id = ?'); params.push(parseInt(req.query.category, 10) || 0); }
  if (req.query.q) { where.push("(j.title LIKE ? ESCAPE '\\' OR j.location LIKE ? ESCAPE '\\')"); const k = `%${likeEscape(req.query.q)}%`; params.push(k, k); }
  const rows = db.all(`${JOB_SELECT} WHERE ${where.join(' AND ')} ORDER BY j.updated_at DESC, j.id DESC`, ...params);
  res.json({ jobs: rows.map(adminJobView) });
});

router.get('/jobs/:id', (req, res) => {
  const row = db.get(`${JOB_SELECT} WHERE j.id = ?`, parseInt(req.params.id, 10) || 0);
  if (!row) throw new HttpError(404, 'Job not found.');
  res.json({ job: adminJobView(row) });
});

function parseJob(body) {
  const v = new Validator(body)
    .str('title', 'Job title', { min: 3, max: 150 })
    .int('category_id', 'Category', { min: 1, required: true })
    .str('company_name', 'Company name', { max: 150, required: false })
    .str('description', 'Job description', { min: 20, max: 8000 })
    .str('short_description', 'Short description', { max: 300, required: false })
    .str('responsibilities', 'Responsibilities', { max: 5000, required: false })
    .str('skills', 'Required skills', { max: 1000, required: false })
    .str('qualifications', 'Qualifications', { max: 3000, required: false })
    .oneOf('experience_level', 'Experience level', meta.EXPERIENCE_LEVELS, { required: false })
    .num('experience_years_min', 'Minimum years of experience', { min: 0, max: 50 })
    .str('location', 'Location', { max: 150 })
    .oneOf('employment_type', 'Employment type', meta.EMPLOYMENT_TYPES)
    .oneOf('work_mode', 'Work mode', meta.WORK_MODES)
    .int('salary_min', 'Minimum salary', { min: 0, max: 1e9 })
    .int('salary_max', 'Maximum salary', { min: 0, max: 1e9 })
    .str('salary_text', 'Salary text', { max: 120, required: false })
    .date('deadline', 'Application deadline')
    .done();
  if (!db.get('SELECT 1 AS x FROM categories WHERE id = ?', v.category_id)) {
    throw new HttpError(422, 'Please correct the highlighted fields.', { category_id: 'Select one of the listed categories.' });
  }
  if (v.salary_min && v.salary_max && v.salary_min > v.salary_max) {
    throw new HttpError(422, 'Please correct the highlighted fields.', { salary_max: 'Maximum salary must be greater than the minimum.' });
  }
  v.company_name = v.company_name || 'Cuatro Tech Solutions';
  return v;
}

router.post('/jobs', wrap((req, res) => {
  const v = parseJob(req.body);
  const publish = req.body.publish === true || req.body.publish === 'true';
  const r = db.run(
    `INSERT INTO jobs (title, category_id, company_name, description, short_description, responsibilities, skills, qualifications,
       experience_level, experience_years_min, location, employment_type, work_mode, salary_min, salary_max, salary_text,
       status, posted_at, deadline, created_by, is_demo)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,${publish ? "datetime('now')" : 'NULL'},?,?,0)`,
    v.title, v.category_id, v.company_name, v.description, v.short_description, v.responsibilities, v.skills, v.qualifications,
    v.experience_level || null, v.experience_years_min, v.location, v.employment_type, v.work_mode, v.salary_min, v.salary_max, v.salary_text,
    publish ? 'published' : 'draft', v.deadline, req.user.id);
  const id = Number(r.lastInsertRowid);
  sec.audit(req, 'job.create', 'job', id, { title: v.title, published: publish });
  res.status(201).json({ ok: true, id });
}));

router.put('/jobs/:id', wrap((req, res) => {
  const id = parseInt(req.params.id, 10) || 0;
  if (!db.get('SELECT 1 AS x FROM jobs WHERE id = ?', id)) throw new HttpError(404, 'Job not found.');
  const v = parseJob(req.body);
  db.run(
    `UPDATE jobs SET title=?, category_id=?, company_name=?, description=?, short_description=?, responsibilities=?, skills=?, qualifications=?,
       experience_level=?, experience_years_min=?, location=?, employment_type=?, work_mode=?, salary_min=?, salary_max=?, salary_text=?,
       deadline=?, updated_at=datetime('now') WHERE id = ?`,
    v.title, v.category_id, v.company_name, v.description, v.short_description, v.responsibilities, v.skills, v.qualifications,
    v.experience_level || null, v.experience_years_min, v.location, v.employment_type, v.work_mode, v.salary_min, v.salary_max, v.salary_text,
    v.deadline, id);
  sec.audit(req, 'job.update', 'job', id, { title: v.title });
  res.json({ ok: true });
}));

router.post('/jobs/:id/status', wrap((req, res) => {
  const id = parseInt(req.params.id, 10) || 0;
  const job = db.get('SELECT * FROM jobs WHERE id = ?', id);
  if (!job) throw new HttpError(404, 'Job not found.');
  const action = req.body && req.body.action;
  const map = { publish: 'published', unpublish: 'draft', close: 'closed', reopen: 'published' };
  if (!map[action]) throw new HttpError(422, 'Unknown action.');
  if (action === 'publish' || action === 'reopen') {
    if (job.deadline && job.deadline < new Date().toISOString().slice(0, 10)) {
      throw new HttpError(409, 'The application deadline has already passed. Edit the deadline before publishing.');
    }
  }
  db.run(`UPDATE jobs SET status = ?, posted_at = COALESCE(posted_at, CASE WHEN ? = 'published' THEN datetime('now') END), updated_at = datetime('now') WHERE id = ?`,
    map[action], map[action], id);
  sec.audit(req, `job.${action}`, 'job', id, { title: job.title });
  res.json({ ok: true, status: map[action] });
}));

router.delete('/jobs/:id', wrap((req, res) => {
  const id = parseInt(req.params.id, 10) || 0;
  const job = db.get('SELECT * FROM jobs WHERE id = ?', id);
  if (!job) throw new HttpError(404, 'Job not found.');
  const n = db.get('SELECT COUNT(*) AS n FROM applications WHERE job_id = ?', id).n;
  if (n > 0) throw new HttpError(409, `This job has ${n} application(s) and cannot be deleted. Close it instead to keep the records.`);
  db.run('DELETE FROM jobs WHERE id = ?', id);
  sec.audit(req, 'job.delete', 'job', id, { title: job.title });
  res.json({ ok: true });
}));

// ---- candidates ----------------------------------------------------------------------------
function candidateRow(r) {
  return {
    id: r.id, full_name: r.full_name, email: r.email, contact_number: r.contact_number, college: r.college, degree: r.degree,
    specialisation: r.specialisation, graduation_year: r.graduation_year, skills: r.skills, location: r.location,
    experience: r.experience, applications: r.applications, resume_name: r.resume_name, registered_at: iso(r.created_at), is_active: !!r.is_active
  };
}

const CANDIDATE_SELECT = `
  SELECT p.id, u.full_name, u.email, u.contact_number, u.created_at, u.is_active, p.college, p.degree, p.specialisation, p.graduation_year,
         p.skills, p.location, p.experience,
         (SELECT COUNT(*) FROM applications a WHERE a.student_id = p.id AND a.superseded = 0) AS applications,
         (SELECT r.original_name FROM resumes r WHERE r.student_id = p.id AND r.is_current = 1) AS resume_name
  FROM student_profiles p JOIN users u ON u.id = p.user_id`;

router.get('/candidates', (req, res) => {
  const where = ['1=1']; const params = [];
  if (req.query.q) {
    const k = `%${likeEscape(req.query.q)}%`;
    where.push("(u.full_name LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\' OR p.skills LIKE ? ESCAPE '\\' OR p.college LIKE ? ESCAPE '\\' OR p.degree LIKE ? ESCAPE '\\')");
    params.push(k, k, k, k, k);
  }
  if (req.query.category) {
    where.push('EXISTS (SELECT 1 FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.student_id = p.id AND a.superseded = 0 AND j.category_id = ?)');
    params.push(parseInt(req.query.category, 10) || 0);
  }
  if (req.query.job) {
    where.push('EXISTS (SELECT 1 FROM applications a WHERE a.student_id = p.id AND a.superseded = 0 AND a.job_id = ?)');
    params.push(parseInt(req.query.job, 10) || 0);
  }
  if (req.query.status) {
    where.push('EXISTS (SELECT 1 FROM applications a WHERE a.student_id = p.id AND a.superseded = 0 AND a.current_status = ?)');
    params.push(req.query.status);
  }
  const rows = db.all(`${CANDIDATE_SELECT} WHERE ${where.join(' AND ')} ORDER BY u.created_at DESC LIMIT 300`, ...params);
  res.json({ candidates: rows.map(candidateRow) });
});

router.get('/candidates/:id', (req, res) => {
  const id = parseInt(req.params.id, 10) || 0;
  const c = db.get(`${CANDIDATE_SELECT} WHERE p.id = ?`, id);
  if (!c) throw new HttpError(404, 'Candidate not found.');
  const resume = db.get('SELECT * FROM resumes WHERE student_id = ? AND is_current = 1', id);
  const apps = db.all(`${APP_SELECT} WHERE a.student_id = ? AND a.superseded = 0 ORDER BY a.applied_at DESC`, id).map(appRow);
  res.json({
    candidate: candidateRow(c),
    resume: resume ? {
      original_name: resume.original_name, file_type: resume.file_type, file_size: resume.file_size, uploaded_at: iso(resume.uploaded_at),
      status: resume.status, skills_found: resume.extracted_skills ? JSON.parse(resume.extracted_skills) : []
    } : null,
    applications: apps
  });
});

function sendResume(req, res, r) {
  const file = path.join(config.resumeDir, r.stored_name);
  if (!path.resolve(file).startsWith(path.resolve(config.resumeDir)) || !fs.existsSync(file)) throw new HttpError(404, 'Resume file not found.');
  sec.audit(req, 'resume.download', 'resume', r.id, { student_id: r.student_id });
  const types = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', txt: 'text/plain; charset=utf-8' };
  res.set({
    'Content-Type': types[r.file_type] || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${r.original_name.replace(/"/g, '')}"`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store'
  });
  res.sendFile(file);
}

router.get('/candidates/:id/resume', (req, res) => {
  const r = db.get('SELECT * FROM resumes WHERE student_id = ? AND is_current = 1', parseInt(req.params.id, 10) || 0);
  if (!r) throw new HttpError(404, 'This candidate has not uploaded a resume.');
  sendResume(req, res, r);
});

// ---- applications --------------------------------------------------------------------------
const APP_SELECT = `
  SELECT a.*, j.title AS job_title, j.company_name, c.name AS category_name, u.full_name AS candidate_name, u.email AS candidate_email, p.id AS candidate_id
  FROM applications a
  JOIN jobs j ON j.id = a.job_id JOIN categories c ON c.id = j.category_id
  JOIN student_profiles p ON p.id = a.student_id JOIN users u ON u.id = p.user_id`;

function appRow(a) {
  return {
    application_id: a.application_code, job_id: a.job_id, job_title: a.job_title, category: a.category_name,
    candidate_id: a.candidate_id, candidate_name: a.applicant_name || a.candidate_name, candidate_email: a.applicant_email || a.candidate_email,
    status: a.current_status, applied_at: iso(a.applied_at), updated_at: iso(a.updated_at), match_score: a.match_score,
    interview_at: a.interview_at, reapply_allowed: !!a.reapply_allowed
  };
}

router.get('/applications', (req, res) => {
  const where = ['a.superseded = 0']; const params = [];
  if (req.query.status) { where.push('a.current_status = ?'); params.push(req.query.status); }
  if (req.query.job) { where.push('a.job_id = ?'); params.push(parseInt(req.query.job, 10) || 0); }
  if (req.query.category) { where.push('j.category_id = ?'); params.push(parseInt(req.query.category, 10) || 0); }
  if (req.query.q) {
    const k = `%${likeEscape(req.query.q)}%`;
    where.push("(a.application_code LIKE ? ESCAPE '\\' OR a.applicant_name LIKE ? ESCAPE '\\' OR a.applicant_email LIKE ? ESCAPE '\\' OR j.title LIKE ? ESCAPE '\\')");
    params.push(k, k, k, k);
  }
  const rows = db.all(`${APP_SELECT} WHERE ${where.join(' AND ')} ORDER BY a.applied_at DESC, a.id DESC LIMIT 500`, ...params);
  res.json({ applications: rows.map(appRow) });
});

function loadApplication(code) {
  const a = db.get(`${APP_SELECT} WHERE a.application_code = ?`, String(code || ''));
  if (!a) throw new HttpError(404, 'Application not found.');
  return a;
}

router.get('/applications/:code', (req, res) => {
  const a = loadApplication(req.params.code);
  const history = db.all(
    `SELECT h.previous_status, h.new_status, h.candidate_message, h.changed_at, u.full_name AS admin_name
     FROM application_status_history h LEFT JOIN users u ON u.id = h.changed_by WHERE h.application_id = ? ORDER BY h.id ASC`, a.id)
    .map((h) => ({ ...h, changed_at: iso(h.changed_at) }));
  const notes = db.all(
    `SELECT n.id, n.note, n.created_at, u.full_name AS admin_name FROM application_internal_notes n
     LEFT JOIN users u ON u.id = n.admin_id WHERE n.application_id = ? ORDER BY n.id DESC`, a.id)
    .map((n) => ({ ...n, created_at: iso(n.created_at) }));
  const profile = db.get('SELECT * FROM student_profiles WHERE id = ?', a.student_id);
  const resume = a.resume_id ? db.get('SELECT * FROM resumes WHERE id = ?', a.resume_id) : null;
  res.json({
    application: {
      ...appRow(a),
      applicant_phone: a.applicant_phone, cover_letter: a.cover_letter, relevant_info: a.relevant_info,
      candidate_message: a.candidate_message, next_step: a.next_step, interview_details: a.interview_details,
      company: a.company_name
    },
    candidate: {
      id: profile.id, college: profile.college, degree: profile.degree, specialisation: profile.specialisation,
      graduation_year: profile.graduation_year, skills: profile.skills, experience: profile.experience, location: profile.location
    },
    resume: resume ? {
      original_name: resume.original_name, file_type: resume.file_type, uploaded_at: iso(resume.uploaded_at),
      skills_found: resume.extracted_skills ? JSON.parse(resume.extracted_skills) : []
    } : null,
    history, notes,
    statuses: meta.APPLICATION_STATUSES
  });
});

router.get('/applications/:code/resume', (req, res) => {
  const a = loadApplication(req.params.code);
  const r = a.resume_id ? db.get('SELECT * FROM resumes WHERE id = ?', a.resume_id) : null;
  if (!r) throw new HttpError(404, 'No resume is attached to this application.');
  sendResume(req, res, r);
});

router.post('/applications/:code/status', wrap((req, res) => {
  const a = loadApplication(req.params.code);
  const v = new Validator(req.body)
    .oneOf('status', 'Status', meta.APPLICATION_STATUSES)
    .str('message', 'Candidate message', { max: 1000, required: false })
    .str('next_step', 'Next step', { max: 500, required: false })
    .str('interview_at', 'Interview date and time', { max: 40, required: false })
    .str('interview_details', 'Interview details', { max: 1000, required: false })
    .done();
  if (a.current_status === 'Withdrawn') throw new HttpError(409, 'The candidate withdrew this application; its status can no longer be changed.');
  if (v.status === a.current_status && v.status !== 'Interview Scheduled') {
    throw new HttpError(422, 'The application already has this status.', { status: 'The application already has this status.' });
  }
  if (v.status === 'Interview Scheduled') {
    if (!v.interview_at || Number.isNaN(Date.parse(v.interview_at))) {
      throw new HttpError(422, 'Please enter a valid interview date and time.', { interview_at: 'Interview date and time is required.' });
    }
  }
  const info = STATUS_INFO[v.status];
  const isUpdate = v.status === 'Interview Scheduled' && a.current_status === 'Interview Scheduled';
  let message = v.message || info.message(a.job_title);
  if (v.status === 'Interview Scheduled') {
    const when = new Date(v.interview_at);
    message = `${v.message || info.message(a.job_title)} Date and time: ${when.toUTCString().replace('GMT', 'UTC')}.`;
  }
  const next = v.next_step || info.next;
  db.transaction(() => {
    db.run(
      `UPDATE applications SET current_status = ?, candidate_message = ?, next_step = ?, interview_at = ?, interview_details = ?, updated_at = datetime('now') WHERE id = ?`,
      v.status, message, next, v.status === 'Interview Scheduled' ? v.interview_at : a.interview_at,
      v.status === 'Interview Scheduled' ? v.interview_details : a.interview_details, a.id);
    db.run('INSERT INTO application_status_history (application_id, previous_status, new_status, candidate_message, changed_by) VALUES (?,?,?,?,?)',
      a.id, a.current_status, v.status, message, req.user.id);
    notify(a.student_id, isUpdate ? 'Interview updated' : info.title, message,
      `/student-portal/application-details?id=${encodeURIComponent(a.application_code)}`);
    sec.audit(req, 'application.status', 'application', a.application_code, { from: a.current_status, to: v.status });
  });
  res.json({ ok: true });
}));

router.post('/applications/:code/notes', wrap((req, res) => {
  const a = loadApplication(req.params.code);
  const v = new Validator(req.body).str('note', 'Note', { min: 2, max: 2000 }).done();
  db.run('INSERT INTO application_internal_notes (application_id, admin_id, note) VALUES (?,?,?)', a.id, req.user.id, v.note);
  sec.audit(req, 'application.note', 'application', a.application_code);
  res.status(201).json({ ok: true });
}));

router.post('/applications/:code/allow-reapply', wrap((req, res) => {
  const a = loadApplication(req.params.code);
  const allow = req.body && (req.body.allow === true || req.body.allow === 'true');
  db.run("UPDATE applications SET reapply_allowed = ?, updated_at = datetime('now') WHERE id = ?", allow ? 1 : 0, a.id);
  if (allow) notify(a.student_id, 'You may apply again', `You can submit a new application for ${a.job_title}.`, `/student-portal/find-jobs`);
  sec.audit(req, allow ? 'application.allow_reapply' : 'application.deny_reapply', 'application', a.application_code);
  res.json({ ok: true });
}));

// ---- contact messages -----------------------------------------------------------------------
router.get('/messages', (_req, res) => {
  const rows = db.all('SELECT * FROM contact_messages ORDER BY id DESC LIMIT 300').map((m) => ({ ...m, created_at: iso(m.created_at) }));
  res.json({ messages: rows });
});

router.post('/messages/:id/status', wrap((req, res) => {
  const status = req.body && req.body.status;
  if (!['New', 'Read', 'Replied'].includes(status)) throw new HttpError(422, 'Unknown status.');
  db.run('UPDATE contact_messages SET status = ? WHERE id = ?', status, parseInt(req.params.id, 10) || 0);
  res.json({ ok: true });
}));

// ---- audit & account ---------------------------------------------------------------------------
router.get('/audit', (_req, res) => {
  const rows = db.all(
    `SELECT l.id, l.action, l.entity_type, l.entity_id, l.details, l.ip, l.created_at, u.full_name AS admin_name
     FROM audit_logs l LEFT JOIN users u ON u.id = l.admin_id ORDER BY l.id DESC LIMIT 300`)
    .map((r) => ({ ...r, created_at: iso(r.created_at) }));
  res.json({ logs: rows });
});

router.post('/change-password', wrap(async (req, res) => {
  const { current_password: cur, new_password: pw, confirm_password: conf } = req.body || {};
  const user = db.get('SELECT * FROM users WHERE id = ?', req.user.id);
  if (!(await sec.verifyPassword(String(cur || ''), user.password_hash))) {
    throw new HttpError(422, 'Current password is incorrect.', { current_password: 'Current password is incorrect.' });
  }
  const err = sec.validatePassword(pw, { admin: true });
  if (err) throw new HttpError(422, err, { new_password: err });
  if (pw !== conf) throw new HttpError(422, 'Passwords do not match.', { confirm_password: 'Passwords do not match.' });
  db.run("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", await sec.hashPassword(pw), req.user.id);
  db.run('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?', req.user.id, req.session.token_hash);
  sec.audit(req, 'admin.change_password', 'user', req.user.id);
  res.json({ ok: true, message: 'Your password has been changed.' });
}));

module.exports = router;
