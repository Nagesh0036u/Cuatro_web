'use strict';

const express = require('express');
const db = require('../db');
const config = require('../config');
const { createSession, rateLimit } = require('../security');
const { Validator, wrap, HttpError, likeEscape } = require('../util');
const { JOB_SELECT, jobView, todayStr } = require('../services');
const { sendMail } = require('../mailer');
const meta = require('../categories');

const router = express.Router();

router.get('/session', (req, res) => {
  let session = req.session;
  if (!session) session = createSession(res, null);
  res.set('Cache-Control', 'no-store');
  res.json({
    csrfToken: session.csrf_token,
    user: req.user ? { id: req.user.id, name: req.user.full_name, email: req.user.email, role: req.user.role } : null
  });
});

router.get('/meta', (_req, res) => {
  res.json({
    categories: db.all('SELECT id, name FROM categories ORDER BY sort_order'),
    employmentTypes: meta.EMPLOYMENT_TYPES,
    workModes: meta.WORK_MODES,
    experienceLevels: meta.EXPERIENCE_LEVELS,
    applicationStatuses: meta.APPLICATION_STATUSES
  });
});

/** Builds the WHERE clause shared by the public listing. */
function listJobs(query) {
  const where = ["j.status = 'published'"];
  const params = [];
  if (query.includeExpired !== 'true') { where.push('(j.deadline IS NULL OR j.deadline >= ?)'); params.push(todayStr()); }
  if (query.title) { where.push("j.title LIKE ? ESCAPE '\\'"); params.push(`%${likeEscape(query.title)}%`); }
  if (query.keyword) {
    const k = `%${likeEscape(query.keyword)}%`;
    where.push("(j.title LIKE ? ESCAPE '\\' OR j.description LIKE ? ESCAPE '\\' OR j.short_description LIKE ? ESCAPE '\\' OR j.skills LIKE ? ESCAPE '\\' OR j.responsibilities LIKE ? ESCAPE '\\' OR c.name LIKE ? ESCAPE '\\')");
    params.push(k, k, k, k, k, k);
  }
  if (query.category) { where.push('j.category_id = ?'); params.push(parseInt(query.category, 10) || 0); }
  if (query.location) { where.push("j.location LIKE ? ESCAPE '\\'"); params.push(`%${likeEscape(query.location)}%`); }
  if (query.type) { where.push('j.employment_type = ?'); params.push(query.type); }
  if (query.experience) { where.push('j.experience_level = ?'); params.push(query.experience); }
  if (query.mode) { where.push('j.work_mode = ?'); params.push(query.mode); }
  if (query.salaryMin) {
    const n = parseInt(query.salaryMin, 10);
    if (Number.isFinite(n)) { where.push('COALESCE(j.salary_max, j.salary_min) >= ?'); params.push(n); }
  }
  return { where: where.join(' AND '), params };
}

router.get('/jobs', (req, res) => {
  const { where, params } = listJobs(req.query);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 9));
  const total = db.get(`SELECT COUNT(*) AS n FROM jobs j JOIN categories c ON c.id = j.category_id WHERE ${where}`, ...params).n;
  const order = req.query.sort === 'deadline' ? 'j.deadline IS NULL, j.deadline ASC' : 'j.posted_at DESC, j.id DESC';
  const rows = db.all(`${JOB_SELECT} WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`, ...params, pageSize, (page - 1) * pageSize);
  res.json({ total, page, pageSize, jobs: rows.map((r) => jobView(r)) });
});

router.get('/jobs/:id', (req, res) => {
  const row = db.get(`${JOB_SELECT} WHERE j.id = ? AND j.status IN ('published','closed')`, parseInt(req.params.id, 10) || 0);
  if (!row) throw new HttpError(404, 'This job could not be found.');
  res.json({ job: jobView(row, { detail: true }) });
});

router.get('/categories/counts', (_req, res) => {
  const rows = db.all(`
    SELECT c.id, c.name, COUNT(j.id) AS jobs
    FROM categories c LEFT JOIN jobs j
      ON j.category_id = c.id AND j.status = 'published' AND (j.deadline IS NULL OR j.deadline >= ?)
    GROUP BY c.id ORDER BY c.sort_order`, todayStr());
  res.json({ categories: rows });
});

router.post('/contact', rateLimit('contact', 5, 3600), wrap(async (req, res) => {
  if (req.body && req.body.website) return res.json({ ok: true }); // honeypot: pretend success to bots
  const v = new Validator(req.body)
    .str('name', 'Name', { min: 2, max: 100 })
    .email('email')
    .phone('contact_number', 'Contact number')
    .str('subject', 'Subject', { min: 3, max: 150 })
    .str('message', 'Message', { min: 10, max: 4000 })
    .bool('consent').done();
  if (!v.consent) throw new HttpError(422, 'Please correct the highlighted fields.', { consent: 'Consent to data processing is required.' });
  db.run('INSERT INTO contact_messages (name, email, contact_number, subject, message, consent) VALUES (?,?,?,?,?,1)',
    v.name, v.email, v.contact_number, v.subject, v.message);
  sendMail({
    to: config.contactInbox,
    replyTo: v.email,
    subject: `[Website enquiry] ${v.subject}`,
    text: `Name: ${v.name}\nEmail: ${v.email}\nPhone: ${v.contact_number}\n\n${v.message}`
  }).catch((e) => console.error('Contact mail failed:', e.message));
  res.status(201).json({ ok: true, message: 'Thank you. Your message has been sent and our team will respond soon.' });
}));

module.exports = router;
