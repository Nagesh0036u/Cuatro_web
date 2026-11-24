'use strict';

const db = require('./db');
const sec = require('./security');

/**
 * Creates (or updates the password of) an administrator account.
 * Credentials always come from environment variables / CLI arguments, never from source code.
 */
async function createAdmin({ email, password, name }) {
  const mail = String(email || '').trim().toLowerCase();
  if (!mail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) throw new Error('A valid admin email is required.');
  const err = sec.validatePassword(password, { admin: true });
  if (err) throw new Error(err);
  const hash = await sec.hashPassword(password);
  const existing = db.get('SELECT * FROM users WHERE email = ?', mail);
  if (existing) {
    if (existing.role !== 'admin') throw new Error('That email already belongs to a student account.');
    db.run("UPDATE users SET password_hash = ?, full_name = ?, updated_at = datetime('now') WHERE id = ?", hash, name || existing.full_name, existing.id);
    return { id: existing.id, created: false };
  }
  const r = db.run("INSERT INTO users (full_name, email, password_hash, role) VALUES (?,?,?,'admin')", name || 'Cuatro Administrator', mail, hash);
  return { id: Number(r.lastInsertRowid), created: true };
}

/** On start-up: if ADMIN_EMAIL / ADMIN_PASSWORD are set and no admin exists yet, create the first one. */
async function ensureInitialAdmin(config) {
  const count = db.get("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").n;
  if (count > 0) return null;
  if (!config.admin.email || !config.admin.password) {
    console.warn('No administrator exists. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env, or run "npm run create-admin".');
    return null;
  }
  const r = await createAdmin(config.admin);
  console.log(`Initial administrator created: ${config.admin.email}`);
  return r;
}

module.exports = { createAdmin, ensureInitialAdmin };
