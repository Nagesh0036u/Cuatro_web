'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const db = require('../db');
const config = require('../config');
const rb = require('../resumeBuilder');
const { extractSkills } = require('../skills');
const { HttpError, wrap, iso } = require('../util');
const { notify } = require('../services');

// Mounted under /api/student/resume-builder, behind requireStudent. Every query is scoped to the signed-in student.
const router = express.Router();

function profileOf(req) {
  const p = db.get(
    'SELECT p.*, u.full_name, u.email, u.contact_number FROM student_profiles p JOIN users u ON u.id = p.user_id WHERE p.user_id = ?', req.user.id);
  if (!p) throw new HttpError(404, 'Student profile not found.');
  return p;
}

function docView(r, withData) {
  const v = { id: r.id, title: r.title, template: r.template, created_at: iso(r.created_at), updated_at: iso(r.updated_at) };
  if (withData) v.data = JSON.parse(r.data);
  return v;
}

function ownDoc(req, id) {
  const p = profileOf(req);
  const r = db.get('SELECT * FROM resume_docs WHERE id = ? AND student_id = ?', parseInt(id, 10) || 0, p.id);
  if (!r) throw new HttpError(404, 'Resume not found.');
  return { p, r };
}

const cleanTitle = (t, fallback) => String(t === undefined || t === null ? fallback : t).replace(/[\r\n]+/g, ' ').trim().slice(0, 100) || fallback;

router.get('/documents', (req, res) => {
  const p = profileOf(req);
  const rows = db.all('SELECT id, title, template, created_at, updated_at FROM resume_docs WHERE student_id = ? ORDER BY updated_at DESC, id DESC', p.id);
  res.json({ documents: rows.map((r) => docView(r)), max: rb.MAX_DOCS_PER_STUDENT, templates: rb.TEMPLATES });
});

router.post('/documents', wrap((req, res) => {
  const p = profileOf(req);
  const template = req.body && req.body.template;
  if (!rb.TEMPLATES.includes(template)) throw new HttpError(422, 'Please choose a valid template.');
  const count = db.get('SELECT COUNT(*) AS n FROM resume_docs WHERE student_id = ?', p.id).n;
  if (count >= rb.MAX_DOCS_PER_STUDENT) throw new HttpError(409, `You can keep up to ${rb.MAX_DOCS_PER_STUDENT} resumes. Delete one to create another.`);
  const data = rb.defaultData(p);
  if (/^#[0-9a-fA-F]{6}$/.test(String(req.body.accent || ''))) data.settings.accent = req.body.accent;
  if (rb.FONTS.includes(req.body.font)) data.settings.font = req.body.font;
  const r = db.run('INSERT INTO resume_docs (student_id, title, template, data) VALUES (?,?,?,?)',
    p.id, cleanTitle(req.body.title, `${p.full_name} - Resume`), template, JSON.stringify(data));
  res.status(201).json({ ok: true, id: Number(r.lastInsertRowid) });
}));

router.get('/documents/:id', (req, res) => {
  const { r } = ownDoc(req, req.params.id);
  res.json({ document: docView(r, true) });
});

router.put('/documents/:id', wrap((req, res) => {
  const { r } = ownDoc(req, req.params.id);
  const body = req.body || {};
  const template = body.template === undefined ? r.template : body.template;
  if (!rb.TEMPLATES.includes(template)) throw new HttpError(422, 'Please choose a valid template.');
  const data = rb.sanitize(body.data);
  if (!data) throw new HttpError(413, 'This resume has too much content. Please shorten it.');
  db.run("UPDATE resume_docs SET title = ?, template = ?, data = ?, updated_at = datetime('now') WHERE id = ?",
    cleanTitle(body.title, r.title), template, JSON.stringify(data), r.id);
  res.json({ ok: true, updated_at: new Date().toISOString() });
}));

router.post('/documents/:id/duplicate', wrap((req, res) => {
  const { p, r } = ownDoc(req, req.params.id);
  const count = db.get('SELECT COUNT(*) AS n FROM resume_docs WHERE student_id = ?', p.id).n;
  if (count >= rb.MAX_DOCS_PER_STUDENT) throw new HttpError(409, `You can keep up to ${rb.MAX_DOCS_PER_STUDENT} resumes. Delete one to create another.`);
  const x = db.run('INSERT INTO resume_docs (student_id, title, template, data) VALUES (?,?,?,?)',
    p.id, cleanTitle(`${r.title} (copy)`, 'Resume (copy)'), r.template, r.data);
  res.status(201).json({ ok: true, id: Number(x.lastInsertRowid) });
}));

router.delete('/documents/:id', wrap((req, res) => {
  const { r } = ownDoc(req, req.params.id);
  db.run('DELETE FROM resume_docs WHERE id = ?', r.id);
  res.json({ ok: true });
}));

/** Saves a plain-text copy of this resume as the student's current resume, so job matching and recruiters can use it. */
router.post('/documents/:id/use-for-matching', wrap((req, res) => {
  const { p, r } = ownDoc(req, req.params.id);
  const data = JSON.parse(r.data);
  const body = rb.toText(data);
  if (body.length < 50) throw new HttpError(422, 'Add more details to your resume (at least your name, skills or experience) before using it for job matching.');
  const skills = extractSkills(body);
  const stored = `${crypto.randomUUID()}.txt`;
  fs.mkdirSync(config.resumeDir, { recursive: true });
  const target = path.join(config.resumeDir, stored);
  fs.writeFileSync(target, body, { mode: 0o600 });
  const name = `${r.title.replace(/[^\w.\- ()]/g, '_').slice(0, 120)}.txt`;
  try {
    db.transaction(() => {
      db.run('UPDATE resumes SET is_current = 0 WHERE student_id = ?', p.id);
      db.run(
        `INSERT INTO resumes (student_id, stored_name, original_name, file_type, file_size, extracted_text, extracted_skills, is_current, status)
         VALUES (?,?,?,?,?,?,?,1,'Processed')`,
        p.id, stored, name, 'txt', Buffer.byteLength(body), body, JSON.stringify(skills));
      notify(p.id, 'Resume updated', `Your resume "${r.title}" from Resume Builder is now your current resume${skills.length ? ` (${skills.length} skills detected)` : ''}.`, '/student-portal/find-jobs', { email: false });
    });
  } catch (e) {
    fs.rmSync(target, { force: true });
    throw e;
  }
  res.json({ ok: true, skills_found: skills });
}));

module.exports = router;
