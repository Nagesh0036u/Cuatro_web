'use strict';

const express = require('express');
const db = require('../db');
const config = require('../config');
const sec = require('../security');
const { Validator, wrap, HttpError } = require('../util');
const { notify } = require('../services');
const { sendMail } = require('../mailer');

const router = express.Router();

const GENERIC_LOGIN_ERROR = 'Incorrect email or password.';

function userPayload(u) { return { id: u.id, name: u.full_name, email: u.email, role: u.role }; }

router.post('/student/register', sec.rateLimit('register', 10, 3600), wrap(async (req, res) => {
  const val = new Validator(req.body)
    .str('full_name', 'Full name', { min: 2, max: 100 })
    .email('email')
    .phone('contact_number', 'Contact number')
    .str('college', 'College / University', { max: 150, required: false })
    .str('degree', 'Degree', { max: 100, required: false })
    .str('specialisation', 'Course / Specialisation', { max: 100, required: false })
    .int('graduation_year', 'Graduation year', { min: 1970, max: 2100 })
    .str('skills', 'Skills', { max: 1000, required: false })
    .str('experience', 'Experience', { max: 2000, required: false })
    .str('location', 'Location', { max: 100, required: false });
  const pw = req.body.password;
  const pwError = sec.validatePassword(pw);
  const errors = {};
  if (pwError) errors.password = pwError;
  if (req.body.confirm_password !== pw) errors.confirm_password = 'Passwords do not match.';
  const v = val.done(errors);

  if (db.get('SELECT 1 AS x FROM users WHERE email = ?', v.email)) {
    throw new HttpError(409, 'An account with this email address already exists.', { email: 'An account with this email address already exists.' });
  }
  const hash = await sec.hashPassword(pw);
  let user;
  try {
    user = db.transaction(() => {
      const r = db.run("INSERT INTO users (full_name, email, password_hash, role, contact_number) VALUES (?,?,?,'student',?)",
        v.full_name, v.email, hash, v.contact_number);
      const uid = Number(r.lastInsertRowid);
      const p = db.run(
        `INSERT INTO student_profiles (user_id, college, degree, specialisation, graduation_year, skills, experience, location)
         VALUES (?,?,?,?,?,?,?,?)`,
        uid, v.college, v.degree, v.specialisation, v.graduation_year, v.skills, v.experience, v.location);
      notify(Number(p.lastInsertRowid), 'Registration completed',
        'Welcome to the Cuatro Student Portal. Upload your resume to receive job recommendations.', '/student-portal/resume');
      return db.get('SELECT * FROM users WHERE id = ?', uid);
    });
  } catch (e) {
    if (/UNIQUE/i.test(e.message)) throw new HttpError(409, 'An account with this email address already exists.', { email: 'An account with this email address already exists.' });
    throw e;
  }
  if (req.session) sec.destroySession(req, res);
  const session = sec.createSession(res, user);
  res.status(201).json({ ok: true, csrfToken: session.csrf_token, user: userPayload(user) });
}));

async function login(req, res, role) {
  const v = new Validator(req.body).email('email').str('password', 'Password', { max: 128 }).done();
  const emailBucket = `loginfail:${v.email}`;
  if (sec.peek(emailBucket, 900) >= 5) {
    res.set('Retry-After', '900');
    throw new HttpError(429, 'Too many failed attempts. Please wait 15 minutes or reset your password.');
  }
  const user = db.get('SELECT * FROM users WHERE email = ?', v.email);
  const ok = await sec.verifyPassword(v.password, user ? user.password_hash : sec.DUMMY_HASH);
  if (!user || !ok || user.role !== role || !user.is_active) {
    sec.hit(emailBucket, 900);
    throw new HttpError(401, GENERIC_LOGIN_ERROR);
  }
  if (req.session) sec.destroySession(req, res);
  const session = sec.createSession(res, user);
  if (role === 'admin') { req.user = user; sec.audit(req, 'admin.login', 'user', user.id); }
  res.json({ ok: true, csrfToken: session.csrf_token, user: userPayload(user) });
}

router.post('/student/login', sec.rateLimit('login', 20, 900), wrap((req, res) => login(req, res, 'student')));
router.post('/admin/login', sec.rateLimit('adminlogin', 20, 900), wrap((req, res) => login(req, res, 'admin')));

router.post('/logout', (req, res) => {
  sec.destroySession(req, res);
  // issue a fresh anonymous session so the page can keep making CSRF-protected calls
  const s = sec.createSession(res, null);
  res.json({ ok: true, csrfToken: s.csrf_token });
});

router.post('/student/forgot-password', sec.rateLimit('forgot', 5, 3600), wrap(async (req, res) => {
  const v = new Validator(req.body).email('email').done();
  const user = db.get("SELECT * FROM users WHERE email = ? AND role = 'student' AND is_active = 1", v.email);
  if (user) {
    const token = sec.randomToken(32);
    const expires = sec.sqlDate(new Date(Date.now() + 30 * 60 * 1000));
    db.run('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?,?,?)', user.id, sec.sha256(token), expires);
    const link = `${config.siteUrl}/student-portal/reset-password?token=${token}`;
    sendMail({
      to: user.email,
      subject: 'Reset your Cuatro Student Portal password',
      text: `Hello ${user.full_name},\n\nUse the link below to choose a new password. It is valid for 30 minutes and can be used once.\n\n${link}\n\nIf you did not request this, you can ignore this message.`
    }).catch((e) => console.error('Reset mail failed:', e.message));
  }
  // identical response whether or not the account exists
  res.json({ ok: true, message: 'If an account exists for that email address, a password reset link has been sent.' });
}));

router.post('/student/reset-password', sec.rateLimit('reset', 10, 3600), wrap(async (req, res) => {
  const token = String((req.body && req.body.token) || '');
  const pw = req.body && req.body.password;
  const pwError = sec.validatePassword(pw);
  if (pwError) throw new HttpError(422, pwError, { password: pwError });
  if (req.body.confirm_password !== pw) throw new HttpError(422, 'Passwords do not match.', { confirm_password: 'Passwords do not match.' });
  const row = db.get(
    "SELECT * FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')", sec.sha256(token));
  if (!row) throw new HttpError(400, 'This reset link is invalid or has expired. Please request a new one.');
  const hash = await sec.hashPassword(pw);
  db.transaction(() => {
    db.run("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", hash, row.user_id);
    db.run("UPDATE password_resets SET used_at = datetime('now') WHERE id = ?", row.id);
    db.run('DELETE FROM sessions WHERE user_id = ?', row.user_id);
  });
  res.json({ ok: true, message: 'Your password has been updated. You can now sign in.' });
}));

module.exports = router;
