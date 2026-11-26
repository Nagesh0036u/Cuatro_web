'use strict';
/**
 * Interactive e-mail setup: npm run setup-email
 * Connects the site to a real mail service so verification codes and password reset links reach inboxes.
 *   1) Gmail (SMTP + Google App Password)  - for running on your own computer or paid hosting
 *   2) Brevo HTTP API key                   - for Render free (Render blocks SMTP ports)
 * The details are tested by sending a real test e-mail, then written to .env (never committed).
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');
const ENV = path.join(ROOT, '.env');

function ask(q, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => { if (s.includes(q)) rl.output.write(s); else if (s !== '\r\n' && s !== '\n') rl.output.write('*'); };
    }
    rl.question(q, (a) => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(a.trim()); });
  });
}

function writeEnv(values) {
  let text = fs.existsSync(ENV) ? fs.readFileSync(ENV, 'utf8') : '';
  for (const [k, v] of Object.entries(values)) {
    const line = `${k}=${v}`;
    const re = new RegExp(`^${k}=.*$`, 'm');
    text = re.test(text) ? text.replace(re, () => line) : `${text.replace(/\s*$/, '')}\n${line}\n`;
  }
  fs.writeFileSync(ENV, text);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function gmail() {
  console.log('\nGmail needs an App Password (your normal Gmail password will NOT work):');
  console.log('  1. Open https://myaccount.google.com/security and turn on 2-Step Verification.');
  console.log('  2. Open https://myaccount.google.com/apppasswords, create one named "Cuatro website".');
  console.log('  3. Copy the 16-letter password Google shows.\n');
  const user = (await ask('Gmail address that will send the emails: ')).toLowerCase();
  if (!EMAIL_RE.test(user)) throw new Error('That is not a valid email address.');
  const pass = (await ask('16-letter App Password (hidden): ', { hidden: true })).replace(/\s+/g, '');
  if (pass.length < 16) throw new Error('App Passwords are 16 letters. Create one at https://myaccount.google.com/apppasswords');
  const nodemailer = require('nodemailer');
  const t = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass }, connectionTimeout: 15000 });
  console.log('\nChecking the login with Gmail...');
  try { await t.verify(); } catch (e) {
    throw new Error(`Gmail refused the login (${e.message.split('\n')[0]}). Check the address and App Password.`);
  }
  const to = (await ask(`Send a test email to (Enter = ${user}): `)) || user;
  await t.sendMail({ from: `Cuatro Tech Solutions <${user}>`, to, subject: 'Cuatro website email test', text: 'Email sending works. Students will now receive verification codes and password reset links.' });
  writeEnv({ SMTP_HOST: 'smtp.gmail.com', SMTP_PORT: '465', SMTP_SECURE: 'true', SMTP_USER: user, SMTP_PASS: pass, MAIL_FROM: `Cuatro Tech Solutions <${user}>`, BREVO_API_KEY: '' });
  console.log(`\nTest email sent to ${to}. Check the inbox (and spam folder).`);
}

async function brevo() {
  console.log('\nBrevo (free, works on Render):');
  console.log('  1. Sign up at https://www.brevo.com');
  console.log('  2. Senders & IP > Senders: add and verify the email address that will send (e.g. your Gmail).');
  console.log('  3. SMTP & API > API keys: create a key and copy it.\n');
  const key = await ask('Brevo API key (hidden): ', { hidden: true });
  const sender = (await ask('Verified sender email in Brevo: ')).toLowerCase();
  if (!EMAIL_RE.test(sender)) throw new Error('That is not a valid email address.');
  const acct = await fetch('https://api.brevo.com/v3/account', { headers: { 'api-key': key, accept: 'application/json' } });
  if (!acct.ok) throw new Error(`Brevo rejected the API key (HTTP ${acct.status}).`);
  const to = (await ask(`Send a test email to (Enter = ${sender}): `)) || sender;
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: { name: 'Cuatro Tech Solutions', email: sender }, to: [{ email: to }], subject: 'Cuatro website email test', textContent: 'Email sending works.' })
  });
  if (!r.ok) throw new Error(`Brevo could not send (HTTP ${r.status}): ${(await r.text()).slice(0, 300)}. Is the sender verified in Brevo?`);
  writeEnv({ BREVO_API_KEY: key, MAIL_FROM: `Cuatro Tech Solutions <${sender}>` });
  console.log(`\nTest email sent to ${to}. Check the inbox (and spam folder).`);
  console.log('For Render: add BREVO_API_KEY and MAIL_FROM with the same values in the Render dashboard > Environment.');
}

(async () => {
  console.log('Cuatro website - email setup');
  const choice = await ask('Use 1) Gmail  or  2) Brevo API key ?  [1]: ');
  try {
    if (choice === '2') await brevo(); else await gmail();
    console.log('\nSaved to .env. Restart the website (Ctrl+C, then npm start) to use it.');
  } catch (e) {
    console.error('\nEmail setup failed: ' + e.message + '\nNothing was saved. Run "npm run setup-email" to try again.');
    process.exitCode = 1;
  }
})();
