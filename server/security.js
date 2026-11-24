'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('./config');
const db = require('./db');

const COOKIE = 'cts_sid';

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx < 0) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    try { out[k] = decodeURIComponent(v); } catch (_) { /* ignore malformed cookie */ }
  });
  return out;
}

function sqlDate(d) { return d.toISOString().replace('T', ' ').slice(0, 19); }

function setCookie(res, token, maxAgeSec) {
  const parts = [`${COOKIE}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSec}`];
  if (config.secureCookies) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}

function clearCookie(res) {
  const parts = [`${COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (config.secureCookies) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}

function createSession(res, user) {
  const token = randomToken();
  const csrf = randomToken(24);
  const ttl = config.sessionHours * 3600;
  const expires = sqlDate(new Date(Date.now() + ttl * 1000));
  db.run(
    'INSERT INTO sessions (token_hash, user_id, role, csrf_token, expires_at) VALUES (?,?,?,?,?)',
    sha256(token), user ? user.id : null, user ? user.role : null, csrf, expires
  );
  setCookie(res, token, ttl);
  return { csrf_token: csrf, user_id: user ? user.id : null, role: user ? user.role : null };
}

function destroySession(req, res) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (token) db.run('DELETE FROM sessions WHERE token_hash = ?', sha256(token));
  clearCookie(res);
}

/** Loads the session (if any) into req.session / req.user. Never creates one. */
function loadSession(req, _res, next) {
  req.session = null;
  req.user = null;
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (token) {
    const s = db.get(
      "SELECT * FROM sessions WHERE token_hash = ? AND expires_at > datetime('now')", sha256(token)
    );
    if (s) {
      req.session = s;
      if (s.user_id) {
        const u = db.get('SELECT id, full_name, email, role, contact_number, is_active FROM users WHERE id = ?', s.user_id);
        if (u && u.is_active) req.user = u;
      }
    }
  }
  next();
}

/** Double-submit style CSRF: state-changing API calls must echo the session token. */
function csrfProtect(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const header = req.get('x-csrf-token');
  if (!req.session || !header || !timingSafeEqual(header, req.session.csrf_token)) {
    return res.status(403).json({ error: 'Invalid or missing security token. Please refresh the page and try again.' });
  }
  next();
}

function timingSafeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Please sign in to continue.' });
    if (req.user.role !== role) return res.status(403).json({ error: 'You do not have permission to access this resource.' });
    next();
  };
}

const requireStudent = requireRole('student');
const requireAdmin = requireRole('admin');

/** Fixed-window rate limiter backed by SQLite so it survives restarts. */
function hit(bucket, windowSec) {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSec);
  db.run(
    'INSERT INTO rate_limits (bucket, window_start, hits) VALUES (?,?,1) ON CONFLICT(bucket, window_start) DO UPDATE SET hits = hits + 1',
    bucket, windowStart
  );
  const row = db.get('SELECT hits FROM rate_limits WHERE bucket = ? AND window_start = ?', bucket, windowStart);
  if (Math.random() < 0.02) db.run('DELETE FROM rate_limits WHERE window_start < ?', now - 86400);
  return { hits: row.hits, retryAfter: windowStart + windowSec - now };
}

function peek(bucket, windowSec) {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSec);
  const row = db.get('SELECT hits FROM rate_limits WHERE bucket = ? AND window_start = ?', bucket, windowStart);
  return row ? row.hits : 0;
}

function rateLimit(name, max, windowSec) {
  return (req, res, next) => {
    if (process.env.DISABLE_IP_RATE_LIMIT === 'true' && !config.isProd) return next(); // test runs only
    const r = hit(`${name}:${req.ip}`, windowSec);
    if (r.hits > max) {
      res.set('Retry-After', String(r.retryAfter));
      return res.status(429).json({ error: 'Too many requests. Please wait a few minutes and try again.' });
    }
    next();
  };
}

async function hashPassword(pw) { return bcrypt.hash(pw, config.bcryptRounds); }
async function verifyPassword(pw, hash) { return bcrypt.compare(pw, hash); }

// Pre-computed hash used to keep login timing similar when the e-mail does not exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

function validatePassword(pw, { admin = false } = {}) {
  const min = admin ? 10 : 8;
  if (typeof pw !== 'string' || pw.length < min) return `Password must be at least ${min} characters long.`;
  if (pw.length > 128) return 'Password is too long.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Password must contain at least one letter and one number.';
  return null;
}

function audit(req, action, entityType, entityId, details) {
  db.run(
    'INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details, ip) VALUES (?,?,?,?,?,?)',
    req && req.user ? req.user.id : null, action, entityType || null,
    entityId === undefined || entityId === null ? null : String(entityId),
    details ? JSON.stringify(details) : null, req ? req.ip : null
  );
}

module.exports = {
  COOKIE, sha256, randomToken, loadSession, createSession, destroySession, csrfProtect,
  requireStudent, requireAdmin, rateLimit, hit, peek, hashPassword, verifyPassword, DUMMY_HASH,
  validatePassword, audit, sqlDate, timingSafeEqual
};
