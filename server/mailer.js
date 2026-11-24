'use strict';

const config = require('./config');

let transporter = null;

function getTransport() {
  if (transporter !== null) return transporter;
  if (!config.smtp.host) { transporter = false; return transporter; }
  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined
  });
  return transporter;
}

/**
 * Sends an e-mail when SMTP is configured. Without SMTP the message is printed to the server log
 * (development only) so flows such as password reset can still be tested locally.
 */
async function sendMail({ to, subject, text, replyTo }) {
  const t = getTransport();
  if (!t) {
    if (!config.isProd) console.log(`\n[mail:not-sent - SMTP not configured]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return { sent: false };
  }
  await t.sendMail({ from: config.smtp.from, to, subject, text, replyTo });
  return { sent: true };
}

module.exports = { sendMail };
