'use strict';

const config = require('./config');

let transporter = null;
const outbox = []; // captured messages when no mail service is configured (non-production only; used by tests)

// MAIL_TRANSPORT=log forces print-only mode (used by test runs so they never e-mail real people).
const logOnly = () => process.env.MAIL_TRANSPORT === 'log';
const brevoKey = () => (logOnly() ? '' : process.env.BREVO_API_KEY || '');
/** True when real e-mail can be sent: Brevo HTTP API (for hosts that block SMTP) or SMTP. */
const smtpConfigured = () => !logOnly() && !!(brevoKey() || config.smtp.host);

function getTransport() {
  if (transporter !== null) return transporter;
  if (!config.smtp.host || logOnly()) { transporter = false; return transporter; }
  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000
  });
  return transporter;
}

/** "Name <a@b.com>" -> { name, email } */
function parseFrom(from) {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from || '');
  if (m) return { name: m[1].replace(/^"|"$/g, '') || undefined, email: m[2].trim() };
  return { email: String(from || '').trim() };
}

async function sendViaBrevo({ to, subject, text, replyTo }) {
  const body = { sender: parseFrom(config.smtp.from), to: [{ email: to }], subject, textContent: text };
  if (replyTo) body.replyTo = { email: replyTo };
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': brevoKey(), 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Brevo API ${res.status}: ${detail.slice(0, 300)}`);
  }
}

/**
 * Sends an e-mail through Brevo (if BREVO_API_KEY is set) or SMTP. Without either, the message is printed to
 * the server log (development only) so flows such as verification and password reset can still be tested locally.
 */
async function sendMail({ to, subject, text, replyTo }) {
  if (brevoKey()) { await sendViaBrevo({ to, subject, text, replyTo }); return { sent: true }; }
  const t = getTransport();
  if (!t) {
    if (!config.isProd) {
      outbox.push({ to, subject, text }); if (outbox.length > 50) outbox.shift();
      console.log(`\n[mail:not-sent - no mail service configured]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    }
    return { sent: false };
  }
  await t.sendMail({ from: config.smtp.from, to, subject, text, replyTo });
  return { sent: true };
}

module.exports = { sendMail, outbox, smtpConfigured };
