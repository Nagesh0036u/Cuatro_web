'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Load .env if present (Node >= 20.12). Real environment variables win.
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile(envFile); } catch (e) { console.warn('Could not read .env:', e.message); }
}

const env = process.env;
const isProd = env.NODE_ENV === 'production';

function resolveDir(value, fallback) {
  const p = value ? value : fallback;
  return path.isAbsolute(p) ? p : path.join(ROOT, p);
}

const config = {
  ROOT,
  isProd,
  port: parseInt(env.PORT || '3000', 10),
  siteUrl: (env.SITE_URL || env.RENDER_EXTERNAL_URL || `http://localhost:${env.PORT || 3000}`).replace(/\/$/, ''),
  dbPath: resolveDir(env.DATABASE_PATH, 'data/cuatro.sqlite'),
  // Resumes live OUTSIDE the static web root and are only served through authorised routes.
  resumeDir: resolveDir(env.RESUME_DIR, 'storage/resumes'),
  maxResumeBytes: parseInt(env.MAX_RESUME_MB || '5', 10) * 1024 * 1024,
  sessionHours: parseInt(env.SESSION_HOURS || '12', 10),
  secureCookies: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : isProd,
  trustProxy: env.TRUST_PROXY === 'true',
  bcryptRounds: parseInt(env.BCRYPT_ROUNDS || '12', 10),
  admin: {
    email: (env.ADMIN_EMAIL || '').trim().toLowerCase(),
    password: env.ADMIN_PASSWORD || '',
    name: env.ADMIN_NAME || 'Cuatro Administrator'
  },
  smtp: {
    host: env.SMTP_HOST || '',
    port: parseInt(env.SMTP_PORT || '587', 10),
    secure: env.SMTP_SECURE === 'true',
    user: env.SMTP_USER || '',
    pass: env.SMTP_PASS || '',
    from: env.MAIL_FROM || 'Cuatro Tech Solutions <hr@cuatrotechsolutions.com>'
  },
  contactInbox: env.CONTACT_INBOX || 'hr@cuatrotechsolutions.com'
};

module.exports = config;
