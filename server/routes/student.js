'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const db = require('../db');
const config = require('../config');
const sec = require('../security');
const matching = require('../matching');
const { extractSkills } = require('../skills');
const { detectType, extractText } = require('../resumeParser');
const { Validator, wrap, HttpError, iso } = require('../util');
const { JOB_SELECT, jobView, isAccepting, notify, newApplicationCode, STATUS_INFO, todayStr } = require('../services');

const router = express.Router();
router.use(sec.requireStudent);
router.use('/resume-builder', require('./resumeBuilder'));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.maxResumeBytes, files: 1, fields: 5 } });

/** Every query below is scoped by the profile id of the signed-in student. */
function profileOf(req) {
  const p = db.get(
    `SELECT p.*, u.full_name, u.email, u.contact_number FROM student_profiles p JOIN users u ON u.id = p.user_id WHERE p.user_id = ?`,
    req.user.id);
  if (!p) throw new HttpError(404, 'Student profile not found.');
  return p;
}
const currentResume = (studentId) => db.get('SELECT * FROM resumes WHERE student_id = ? AND is_current = 1 ORDER BY id DESC', studentId);

function resumeView(r) {
  if (!r) return null;
  return {
    id: r.id,
    original_name: r.original_name,
    file_type: r.file_type,
    file_size: r.file_size,
    uploaded_at: iso(r.uploaded_at),
    status: r.status,
    skills_found: r.extracted_skills ? JSON.parse(r.extracted_skills) : []
  };
}

function profileView(p) {
  return {
    full_name: p.full_name, email: p.email, contact_number: p.contact_number,
    college: p.college, degree: p.degree, specialisation: p.specialisation, graduation_year: p.graduation_year,
    skills: p.skills, experience: p.experience, experience_years: p.experience_years, location: p.location
  };
}

function profileCompleteness(p, resume) {
  const checks = [p.college, p.degree, p.specialisation, p.graduation_year, p.skills, p.location, p.contact_number, resume];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function openJobs() {
  return db.all(`${JOB_SELECT} WHERE j.status = 'published' AND (j.deadline IS NULL OR j.deadline >= ?)`, todayStr());
}

function matchView(result) {
  return {
    score: result.match.score,
    matching_skills: result.match.matchingSkills,
    missing_skills: result.match.missingSkills,
    additional_skills: result.match.additionalSkills,
    required_skills: result.match.requiredSkills,
    breakdown: result.match.breakdown,
    reasons: result.match.reasons
  };
}

function appliedJobIds(studentId) {
  return new Set(db.all('SELECT job_id FROM applications WHERE student_id = ? AND superseded = 0', studentId).map((r) => r.job_id));
}

function recommendationsFor(profile, limit = 50) {
  const resume = currentResume(profile.id);
  const rec = matching.recommend(profile, resume, openJobs(), { limit });
  if (!rec.sufficient) return { sufficient: false, message: rec.message, results: [], candidate_skills: rec.candidateSkills };
  const applied = appliedJobIds(profile.id);
  return {
    sufficient: true,
    candidate_skills: rec.candidateSkills,
    has_resume: !!resume,
    results: rec.results.map((r) => ({ job: jobView(r.job), match: matchView(r), applied: applied.has(r.job.id) }))
  };
}

// ---- dashboard ---------------------------------------------------------------------------
router.get('/dashboard', (req, res) => {
  const p = profileOf(req);
  const resume = currentResume(p.id);
  const counts = db.get(
    `SELECT COUNT(*) AS total,
       SUM(current_status = 'Under Review') AS under_review,
       SUM(current_status = 'Shortlisted') AS shortlisted,
       SUM(current_status = 'Interview Scheduled') AS interviews,
       SUM(current_status = 'Selected') AS selected,
       SUM(current_status = 'Rejected') AS rejected
     FROM applications WHERE student_id = ? AND superseded = 0`, p.id);
  const rec = recommendationsFor(p, 3);
  const notifications = db.all('SELECT id, title, message, link, is_read, created_at FROM notifications WHERE student_id = ? ORDER BY id DESC LIMIT 5', p.id)
    .map((n) => ({ ...n, is_read: !!n.is_read, created_at: iso(n.created_at) }));
  res.json({
    profile: profileView(p),
    completeness: profileCompleteness(p, resume),
    resume: resumeView(resume),
    counts: {
      total: counts.total || 0, under_review: counts.under_review || 0, shortlisted: counts.shortlisted || 0,
      interviews: counts.interviews || 0, selected: counts.selected || 0, rejected: counts.rejected || 0
    },
    recommended: rec,
    notifications,
    unread: db.get('SELECT COUNT(*) AS n FROM notifications WHERE student_id = ? AND is_read = 0', p.id).n
  });
});

// ---- profile -----------------------------------------------------------------------------
router.get('/profile', (req, res) => {
  const p = profileOf(req);
  res.json({ profile: profileView(p), completeness: profileCompleteness(p, currentResume(p.id)) });
});

router.put('/profile', wrap((req, res) => {
  const p = profileOf(req);
  const v = new Validator(req.body)
    .str('full_name', 'Full name', { min: 2, max: 100 })
    .phone('contact_number', 'Contact number')
    .str('college', 'College / University', { max: 150, required: false })
    .str('degree', 'Degree', { max: 100, required: false })
    .str('specialisation', 'Course / Specialisation', { max: 100, required: false })
    .int('graduation_year', 'Graduation year', { min: 1970, max: 2100 })
    .str('skills', 'Skills', { max: 1000, required: false })
    .str('experience', 'Experience', { max: 2000, required: false })
    .num('experience_years', 'Years of experience', { min: 0, max: 50 })
    .str('location', 'Location', { max: 100, required: false })
    .done();
  db.transaction(() => {
    db.run("UPDATE users SET full_name = ?, contact_number = ?, updated_at = datetime('now') WHERE id = ?", v.full_name, v.contact_number, req.user.id);
    db.run(
      `UPDATE student_profiles SET college=?, degree=?, specialisation=?, graduation_year=?, skills=?, experience=?, experience_years=?, location=?, updated_at=datetime('now')
       WHERE id = ?`,
      v.college, v.degree, v.specialisation, v.graduation_year, v.skills, v.experience, v.experience_years, v.location, p.id);
  });
  const fresh = profileOf(req);
  res.json({ ok: true, profile: profileView(fresh), completeness: profileCompleteness(fresh, currentResume(p.id)) });
}));

router.post('/change-password', wrap(async (req, res) => {
  const { current_password: cur, new_password: pw, confirm_password: conf } = req.body || {};
  const user = db.get('SELECT * FROM users WHERE id = ?', req.user.id);
  if (!(await sec.verifyPassword(String(cur || ''), user.password_hash))) {
    throw new HttpError(422, 'Current password is incorrect.', { current_password: 'Current password is incorrect.' });
  }
  const err = sec.validatePassword(pw);
  if (err) throw new HttpError(422, err, { new_password: err });
  if (pw !== conf) throw new HttpError(422, 'Passwords do not match.', { confirm_password: 'Passwords do not match.' });
  const hash = await sec.hashPassword(pw);
  db.run("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", hash, req.user.id);
  db.run('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?', req.user.id, req.session.token_hash);
  res.json({ ok: true, message: 'Your password has been changed.' });
}));

// ---- resume ------------------------------------------------------------------------------
router.get('/resume', (req, res) => {
  const p = profileOf(req);
  res.json({ resume: resumeView(currentResume(p.id)), max_mb: config.maxResumeBytes / 1024 / 1024 });
});

router.post('/resume', (req, res, next) => {
  upload.single('resume')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return next(new HttpError(413, `The file is too large. The maximum size is ${config.maxResumeBytes / 1024 / 1024} MB.`));
      return next(new HttpError(400, 'The file could not be uploaded.'));
    }
    next();
  });
}, wrap(async (req, res) => {
  const p = profileOf(req);
  if (!req.file) throw new HttpError(422, 'Please choose a resume file to upload.');
  const detected = detectType(req.file.originalname, req.file.buffer);
  if (detected.error) throw new HttpError(422, detected.error);

  let text = '';
  try { text = await extractText(detected.type, req.file.buffer); } catch (e) {
    throw new HttpError(422, 'We could not read this file. Please check that it is not corrupted or password protected.');
  }
  const skills = extractSkills(text);
  const stored = `${crypto.randomUUID()}.${detected.type}`;
  fs.mkdirSync(config.resumeDir, { recursive: true });
  const target = path.join(config.resumeDir, stored);
  fs.writeFileSync(target, req.file.buffer, { mode: 0o600 });
  const safeName = path.basename(req.file.originalname).replace(/[^\w.\- ()]/g, '_').slice(0, 150);
  const status = text.length >= 50 ? 'Processed' : 'Uploaded - text could not be read';

  try {
    db.transaction(() => {
      db.run('UPDATE resumes SET is_current = 0 WHERE student_id = ?', p.id);
      db.run(
        `INSERT INTO resumes (student_id, stored_name, original_name, file_type, file_size, extracted_text, extracted_skills, is_current, status)
         VALUES (?,?,?,?,?,?,?,1,?)`,
        p.id, stored, safeName, detected.type, req.file.size, text, JSON.stringify(skills), status);
      notify(p.id, 'Resume uploaded', `Your resume "${safeName}" was uploaded${skills.length ? ` and ${skills.length} skills were detected` : ''}.`, '/student-portal/find-jobs');
    });
  } catch (e) {
    fs.rmSync(target, { force: true });
    throw e;
  }
  const warning = text.length < 50
    ? 'We could not extract readable text from this file (it may be a scanned image). Add your skills to your profile so we can recommend jobs.'
    : null;
  res.status(201).json({ ok: true, resume: resumeView(currentResume(p.id)), warning });
}));

function sendResume(res, r) {
  const file = path.join(config.resumeDir, r.stored_name);
  if (!path.resolve(file).startsWith(path.resolve(config.resumeDir)) || !fs.existsSync(file)) throw new HttpError(404, 'Resume file not found.');
  const types = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', txt: 'text/plain; charset=utf-8' };
  res.set({
    'Content-Type': types[r.file_type] || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${r.original_name.replace(/"/g, '')}"`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store'
  });
  res.sendFile(file);
}

router.get('/resume/download', (req, res) => {
  const p = profileOf(req);
  const r = currentResume(p.id);
  if (!r) throw new HttpError(404, 'You have not uploaded a resume yet.');
  sendResume(res, r);
});

router.get('/resumes/:id/download', (req, res) => {
  const p = profileOf(req);
  const r = db.get('SELECT * FROM resumes WHERE id = ? AND student_id = ?', parseInt(req.params.id, 10) || 0, p.id);
  if (!r) throw new HttpError(404, 'Resume not found.');
  sendResume(res, r);
});

// ---- jobs / recommendations ----------------------------------------------------------------
router.get('/recommendations', (req, res) => {
  const p = profileOf(req);
  res.json(recommendationsFor(p, 50));
});

router.get('/jobs/:id/match', (req, res) => {
  const p = profileOf(req);
  const job = db.get(`${JOB_SELECT} WHERE j.id = ? AND j.status IN ('published','closed')`, parseInt(req.params.id, 10) || 0);
  if (!job) throw new HttpError(404, 'This job could not be found.');
  const candidate = matching.buildCandidate(p, currentResume(p.id));
  const sufficient = matching.candidateIsSufficient(candidate);
  const applied = db.get('SELECT application_code FROM applications WHERE student_id = ? AND job_id = ? AND superseded = 0', p.id, job.id);
  const base = { job: jobView(job, { detail: true }), applied: applied ? applied.application_code : null, sufficient };
  if (!sufficient) {
    return res.json({ ...base, message: 'We need more information to calculate a match. Add your skills, degree and experience to your profile and upload a resume.' });
  }
  const result = matching.scoreJob(candidate, job);
  res.json({ ...base, match: matchView({ match: result }) });
});

// ---- applications --------------------------------------------------------------------------
router.post('/applications', wrap((req, res) => {
  const p = profileOf(req);
  const v = new Validator(req.body)
    .int('job_id', 'Job', { min: 1, required: true })
    .str('applicant_name', 'Name', { min: 2, max: 100 })
    .email('applicant_email')
    .phone('applicant_phone', 'Contact number')
    .str('cover_letter', 'Cover letter', { max: 4000, required: false })
    .str('relevant_info', 'Relevant information', { max: 2000, required: false })
    .bool('confirmed')
    .done();
  if (!v.confirmed) throw new HttpError(422, 'Please review and confirm your application summary before submitting.');

  const job = db.get(`${JOB_SELECT} WHERE j.id = ?`, v.job_id);
  if (!job || job.status === 'draft') throw new HttpError(404, 'This job could not be found.');
  if (!isAccepting(job)) throw new HttpError(409, 'This job is closed or past its application deadline and is no longer accepting applications.');
  const resume = currentResume(p.id);
  if (!resume) throw new HttpError(422, 'Please upload your resume before applying.', { resume: 'A resume is required.' });

  const existing = db.get('SELECT * FROM applications WHERE student_id = ? AND job_id = ? AND superseded = 0', p.id, job.id);
  if (existing && !existing.reapply_allowed) {
    throw new HttpError(409, `You have already applied for this job (Application ID ${existing.application_code}).`);
  }
  const candidate = matching.buildCandidate(p, resume);
  const score = matching.candidateIsSufficient(candidate) ? matching.scoreJob(candidate, job).score : null;
  const code = newApplicationCode();
  const info = STATUS_INFO['Application Submitted'];

  try {
    db.transaction(() => {
      if (existing) db.run("UPDATE applications SET superseded = 1, updated_at = datetime('now') WHERE id = ?", existing.id);
      const r = db.run(
        `INSERT INTO applications (application_code, student_id, job_id, resume_id, applicant_name, applicant_email, applicant_phone,
           cover_letter, relevant_info, match_score, current_status, candidate_message, next_step)
         VALUES (?,?,?,?,?,?,?,?,?,?, 'Application Submitted', ?, ?)`,
        code, p.id, job.id, resume.id, v.applicant_name, v.applicant_email, v.applicant_phone,
        v.cover_letter, v.relevant_info, score, info.message(job.title), info.next);
      db.run(
        'INSERT INTO application_status_history (application_id, previous_status, new_status, candidate_message) VALUES (?,?,?,?)',
        Number(r.lastInsertRowid), null, 'Application Submitted', info.message(job.title));
      notify(p.id, info.title, `${info.message(job.title)} Your application ID is ${code}.`, `/student-portal/application-details?id=${encodeURIComponent(code)}`);
    });
  } catch (e) {
    if (/UNIQUE/i.test(e.message)) throw new HttpError(409, 'You have already applied for this job.');
    throw e;
  }
  res.status(201).json({ ok: true, application_id: code, job_title: job.title, applied_at: new Date().toISOString() });
}));

function applicationRow(row) {
  return {
    application_id: row.application_code,
    job_id: row.job_id,
    job_title: row.job_title,
    category: row.category_name,
    company: row.company_name,
    applied_at: iso(row.applied_at),
    updated_at: iso(row.updated_at),
    status: row.current_status,
    candidate_message: row.candidate_message,
    next_step: row.next_step,
    interview_at: row.interview_at,
    match_score: row.match_score
  };
}

const APP_SELECT = `
  SELECT a.*, j.title AS job_title, j.company_name, c.name AS category_name
  FROM applications a JOIN jobs j ON j.id = a.job_id JOIN categories c ON c.id = j.category_id`;

router.get('/applications', (req, res) => {
  const p = profileOf(req);
  const rows = db.all(`${APP_SELECT} WHERE a.student_id = ? AND a.superseded = 0 ORDER BY a.applied_at DESC, a.id DESC`, p.id);
  res.json({ applications: rows.map(applicationRow) });
});

function ownApplication(req, code) {
  const p = profileOf(req);
  // Ownership is enforced in SQL: another student's code simply returns "not found".
  const row = db.get(`${APP_SELECT} WHERE a.application_code = ? AND a.student_id = ?`, String(code || ''), p.id);
  if (!row) throw new HttpError(404, 'Application not found.');
  return { p, row };
}

router.get('/applications/:code', (req, res) => {
  const { row } = ownApplication(req, req.params.code);
  // Only candidate-visible columns are selected: no admin ids, no internal notes.
  const history = db.all(
    'SELECT previous_status, new_status, candidate_message, changed_at FROM application_status_history WHERE application_id = ? ORDER BY id ASC', row.id)
    .map((h) => ({ previous_status: h.previous_status, new_status: h.new_status, message: h.candidate_message, changed_at: iso(h.changed_at) }));
  res.json({
    application: {
      ...applicationRow(row),
      applicant_name: row.applicant_name,
      applicant_email: row.applicant_email,
      applicant_phone: row.applicant_phone,
      cover_letter: row.cover_letter,
      relevant_info: row.relevant_info,
      interview_details: row.interview_details,
      can_withdraw: !['Selected', 'Rejected', 'Withdrawn'].includes(row.current_status)
    },
    history
  });
});

router.post('/applications/:code/withdraw', wrap((req, res) => {
  const { p, row } = ownApplication(req, req.params.code);
  if (['Selected', 'Rejected', 'Withdrawn'].includes(row.current_status)) {
    throw new HttpError(409, 'This application can no longer be withdrawn.');
  }
  const info = STATUS_INFO.Withdrawn;
  db.transaction(() => {
    db.run("UPDATE applications SET current_status = 'Withdrawn', candidate_message = ?, next_step = NULL, updated_at = datetime('now') WHERE id = ?", info.message(row.job_title), row.id);
    db.run('INSERT INTO application_status_history (application_id, previous_status, new_status, candidate_message, changed_by) VALUES (?,?,?,?,NULL)',
      row.id, row.current_status, 'Withdrawn', 'You withdrew this application.');
    notify(p.id, info.title, info.message(row.job_title), `/student-portal/application-details?id=${encodeURIComponent(row.application_code)}`);
  });
  res.json({ ok: true });
}));

// ---- notifications -------------------------------------------------------------------------
router.get('/notifications', (req, res) => {
  const p = profileOf(req);
  const rows = db.all('SELECT id, title, message, link, is_read, created_at FROM notifications WHERE student_id = ? ORDER BY id DESC LIMIT 200', p.id);
  res.json({
    notifications: rows.map((n) => ({ ...n, is_read: !!n.is_read, created_at: iso(n.created_at) })),
    unread: rows.filter((n) => !n.is_read).length
  });
});

router.post('/notifications/read', (req, res) => {
  const p = profileOf(req);
  const id = req.body && req.body.id ? parseInt(req.body.id, 10) : null;
  if (id) db.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND student_id = ?', id, p.id);
  else db.run('UPDATE notifications SET is_read = 1 WHERE student_id = ?', p.id);
  res.json({ ok: true });
});

module.exports = router;
module.exports.matchView = matchView;
