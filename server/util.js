'use strict';

class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9][0-9\s\-()]{6,18}[0-9]$/;

/** Collects field level validation errors, then throws a single 422. */
class Validator {
  constructor(body) { this.body = body || {}; this.errors = {}; this.values = {}; }

  str(name, label, { min = 0, max = 255, required = true } = {}) {
    let v = this.body[name];
    v = v === undefined || v === null ? '' : String(v).trim();
    if (!v) { if (required) this.errors[name] = `${label} is required.`; this.values[name] = ''; return this; }
    if (v.length < min) this.errors[name] = `${label} must be at least ${min} characters.`;
    else if (v.length > max) this.errors[name] = `${label} must be at most ${max} characters.`;
    this.values[name] = v;
    return this;
  }

  email(name = 'email', label = 'Email address') {
    this.str(name, label, { max: 254 });
    if (!this.errors[name] && !EMAIL_RE.test(this.values[name])) this.errors[name] = `Enter a valid ${label.toLowerCase()}.`;
    if (this.values[name]) this.values[name] = this.values[name].toLowerCase();
    return this;
  }

  phone(name, label = 'Contact number', { required = true } = {}) {
    this.str(name, label, { max: 20, required });
    const v = this.values[name];
    if (v && !PHONE_RE.test(v)) this.errors[name] = `Enter a valid ${label.toLowerCase()}.`;
    return this;
  }

  int(name, label, { min = -Infinity, max = Infinity, required = false } = {}) {
    const raw = this.body[name];
    if (raw === undefined || raw === null || raw === '') {
      if (required) this.errors[name] = `${label} is required.`;
      this.values[name] = null;
      return this;
    }
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min || n > max) this.errors[name] = `${label} must be a whole number between ${min} and ${max}.`;
    else this.values[name] = n;
    return this;
  }

  num(name, label, { min = -Infinity, max = Infinity, required = false } = {}) {
    const raw = this.body[name];
    if (raw === undefined || raw === null || raw === '') {
      if (required) this.errors[name] = `${label} is required.`;
      this.values[name] = null;
      return this;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < min || n > max) this.errors[name] = `${label} must be between ${min} and ${max}.`;
    else this.values[name] = n;
    return this;
  }

  oneOf(name, label, options, { required = true } = {}) {
    const v = this.body[name] === undefined || this.body[name] === null ? '' : String(this.body[name]).trim();
    if (!v) { if (required) this.errors[name] = `${label} is required.`; this.values[name] = ''; return this; }
    if (!options.includes(v)) this.errors[name] = `${label} is not valid.`;
    this.values[name] = v;
    return this;
  }

  date(name, label, { required = false } = {}) {
    const v = this.body[name] === undefined || this.body[name] === null ? '' : String(this.body[name]).trim();
    if (!v) { if (required) this.errors[name] = `${label} is required.`; this.values[name] = null; return this; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) this.errors[name] = `${label} must be a valid date.`;
    this.values[name] = v;
    return this;
  }

  bool(name) { this.values[name] = this.body[name] === true || this.body[name] === 'true' || this.body[name] === 'on' || this.body[name] === 1; return this; }

  done(extraErrors = {}) {
    Object.assign(this.errors, extraErrors);
    if (Object.keys(this.errors).length) {
      throw new HttpError(422, 'Please correct the highlighted fields.', this.errors);
    }
    return this.values;
  }
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** SQLite "YYYY-MM-DD HH:MM:SS" (UTC) -> ISO string */
const iso = (s) => (s ? `${String(s).replace(' ', 'T')}Z` : null);

const likeEscape = (s) => String(s).replace(/[\\%_]/g, (m) => `\\${m}`);

const lines = (s) => (s ? String(s).split(/\r?\n/).map((x) => x.trim()).filter(Boolean) : []);

module.exports = { HttpError, Validator, wrap, iso, likeEscape, lines, EMAIL_RE };
