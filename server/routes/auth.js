'use strict';

const express = require('express');
const db = require('../db');
const config = require('../config');
const sec = require('../security');
const { Validator, wrap, HttpError } = require('../util');
const { notify } = require('../services');
const crypto = require('crypto');
const dns = require('dns').promises;
const { sendMail, smtpConfigured } = require('../mailer');

const router = express.Router();

const GENERIC_LOGIN_ERROR = 'Incorrect email or password.';

function userPayload(u) { return { id: u.id, name: u.full_name, email: u.email, role: u.role }; }

const DISPOSABLE = new Set(['mailinator.com', 'guerrillamail.com', 'guerrillamail.net', '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'yopmail.com',
  'trashmail.com', 'sharklasers.com', 'getnada.com', 'dispostable.com', 'throwawaymail.com', 'maildrop.cc', 'fakeinbox.com', 'mailnesia.com', 'mohmal.com', 'tempail.com']);
const OTP_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const codeHash = (email, code) => sec.sha256(`${email}:${code}`);

/** Rejects addresses that cannot receive mail: disposable providers and domains without mail servers. */
async function assertDeliverableDomain(email) {
  const domain = email.split('@')[1];
  const bad = (msg) => new HttpError(422, msg, { email: msg });
  if (DISPOSABLE.has(domain)) throw bad('Temporary or disposable email addresses are not accepted. Use your real email address.');
  if (!config.verifyMx) return;
  try {
    const mx = await dns.resolveMx(domain);
    if (mx && mx.length) return;
  } catch (e) {
    if (!['ENOTFOUND', 'ENODATA'].includes(e.code)) return; // DNS temporarily unavailable: the code e-mail will decide
  }
  try {
    const a = await dns.resolve4(domain);
    if (a && a.length) return;
  } catch (_) { /* fall through */ }
  throw bad('This email domain cannot receive email. Check the spelling of your address.');
}

function requireMailService() {
  if (!smtpConfigured() && config.isProd) {
    throw new HttpError(503, 'Email service is not configured on this server yet, so verification emails cannot be sent. Please contact the administrator.');
  }
}

// Step 1 of registration: e-mail a 6-digit code to the address the student typed.
router.post('/student/register/send-code', sec.rateLimit('otp-send', 10, 3600), wrap(async (req, res) => {
  const v = new Validator(req.body).email('email').done();
  requireMailService();
  if (db.get('SELECT 1 AS x FROM users WHERE email = ?', v.email)) {
    throw new HttpError(409, 'An account with this email address already exists. Please log in or reset your password.', { email: 'An account with this email address already exists.' });
  }
  const last = db.get("SELECT created_at FROM email_verifications WHERE email = ? AND created_at > datetime('now','-60 seconds') ORDER BY id DESC LIMIT 1", v.email);
  if (last) throw new HttpError(429, 'A code was sent a moment ago. Please wait a minute before requesting another.', { email: 'Please wait a minute before requesting another code.' });
  await assertDeliverableDomain(v.email);
  const code = String(crypto.randomInt(100000, 1000000));
  db.transaction(() => {
    db.run('DELETE FROM email_verifications WHERE email = ?', v.email);
    db.run('INSERT INTO email_verifications (email, code_hash, expires_at) VALUES (?,?,?)',
      v.email, codeHash(v.email, code), sec.sqlDate(new Date(Date.now() + OTP_MINUTES * 60 * 1000)));
  });
  try {
    await sendMail({
      to: v.email,
      subject: `${code} is your Cuatro Tech Solutions verification code`,
      text: `Your verification code is ${code}\n\nEnter it on the registration page to confirm this email address. The code is valid for ${OTP_MINUTES} minutes.\n\nIf you did not request this, you can ignore this message.`
    });
  } catch (e) {
    db.run('DELETE FROM email_verifications WHERE email = ?', v.email);
    console.error('Verification mail failed:', e.message);
    throw new HttpError(502, 'We could not send an email to that address. Check that it is correct and try again.', { email: 'We could not send an email to this address.' });
  }
  res.json({ ok: true, message: `A 6-digit code has been sent to ${v.email}. It is valid for ${OTP_MINUTES} minutes.` });
}));

// Step 2: check the code. On success the browser receives a one-time token that registration requires.
router.post('/student/register/verify-code', sec.rateLimit('otp-verify', 30, 3600), wrap(async (req, res) => {
  const v = new Validator(req.body).email('email').done();
  const code = String((req.body && req.body.code) || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(code)) throw new HttpError(422, 'Enter the 6-digit code from the email.', { code: 'Enter the 6-digit code from the email.' });
  const row = db.get("SELECT * FROM email_verifications WHERE email = ? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1", v.email);
  if (!row || row.expires_at <= sec.sqlDate(new Date())) {
    throw new HttpError(400, 'This code has expired or was not requested. Please request a new code.', { code: 'Code expired. Request a new one.' });
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    throw new HttpError(429, 'Too many wrong attempts. Please request a new code.', { code: 'Too many attempts. Request a new code.' });
  }
  const given = Buffer.from(codeHash(v.email, code));
  const want = Buffer.from(row.code_hash);
  if (!crypto.timingSafeEqual(given, want)) {
    db.run('UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ?', row.id);
    throw new HttpError(400, 'That code is not correct.', { code: 'Incorrect code.' });
  }
  const token = sec.randomToken(32);
  db.run("UPDATE email_verifications SET verified_at = datetime('now'), token_hash = ? WHERE id = ?", sec.sha256(token), row.id);
  res.json({ ok: true, verifyToken: token, message: 'Email verified. You can now complete your registration.' });
}));

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
  const ver = req.body.verify_token ? db.get("SELECT * FROM email_verifications WHERE token_hash = ? AND email = ? AND consumed_at IS NULL AND verified_at > datetime('now','-30 minutes')", sec.sha256(String(req.body.verify_token)), v.email) : null;
  if (!ver) throw new HttpError(422, 'Please verify your email address with the code we send you before creating the account.', { email: 'Verify this email address first.' });

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
      db.run("UPDATE email_verifications SET consumed_at = datetime('now') WHERE id = ?", ver.id);
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

router.post('/student/forgot-password', sec.rateLimit('forgot', 10, 3600), wrap(async (req, res) => {
  const v = new Validator(req.body).email('email').done();
  requireMailService();
  const user = db.get("SELECT * FROM users WHERE email = ? AND role = 'student' AND is_active = 1", v.email);
  if (!user) {
    throw new HttpError(404, 'No student account is registered with this email address.', { email: 'No student account uses this email.' });
  }
  const recent = db.get("SELECT 1 AS x FROM password_resets WHERE user_id = ? AND created_at > datetime('now','-60 seconds')", user.id);
  if (recent) throw new HttpError(429, 'A reset link was sent less than a minute ago. Please check your inbox and spam folder.');
  const token = sec.randomToken(32);
  const expires = sec.sqlDate(new Date(Date.now() + 30 * 60 * 1000));
  db.run('UPDATE password_resets SET used_at = datetime(\'now\') WHERE user_id = ? AND used_at IS NULL', user.id); // only the newest link works
  const row = db.run('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?,?,?)', user.id, sec.sha256(token), expires);
  const link = `${config.siteUrl}/student-portal/reset-password?token=${token}`;
  try {
    await sendMail({
      to: user.email,
      subject: 'Reset your Cuatro Student Portal password',
      text: `Hello ${user.full_name},\n\nWe received a request to reset the password of your Cuatro Student Portal account.\nOpen the link below to choose a new password. It is valid for 30 minutes and can be used once.\n\n${link}\n\nIf you did not request this, you can ignore this email; your password stays the same.\n\nCuatro Tech Solutions`
    });
  } catch (e) {
    db.run('DELETE FROM password_resets WHERE id = ?', Number(row.lastInsertRowid));
    console.error('Reset mail failed:', e.message);
    throw new HttpError(502, 'The reset email could not be sent right now. Please try again in a few minutes.');
  }
  const [name, domain] = user.email.split('@');
  const masked = `${name.slice(0, 2)}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`;
  const devNote = smtpConfigured() ? '' : ' (Development mode: no email service is configured, so the link was printed in the server terminal instead. Run "npm run setup-email".)';
  res.json({ ok: true, message: `A password reset link has been sent to ${masked}. Check your inbox and spam folder.${devNote}` });
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
