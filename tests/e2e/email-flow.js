'use strict';
/**
 * Browser check of e-mail verification at sign-up and the password reset link.
 * Usage: node tests/e2e/email-flow.js <baseUrl> <serverLogFile>
 * The server must run WITHOUT a mail service so codes / links are printed to its log, which this script reads.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const BASE = process.argv[2] || 'http://localhost:3108';
const LOG = process.argv[3];
const OUT = path.join(__dirname, 'screens'); fs.mkdirSync(OUT, { recursive: true });
const problems = [];
const check = (c, m) => { console.log((c ? '  ok  ' : '  FAIL ') + m); if (!c) problems.push(m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function lastFromLog(re) {
  for (let i = 0; i < 20; i++) { const buf = fs.readFileSync(LOG); const txt = buf.includes(0) ? buf.toString('utf16le') : buf.toString('utf8'); const all = [...txt.matchAll(re)]; if (all.length) return all[all.length - 1][1]; await sleep(250); }
  return null;
}
(async () => {
  const exe = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath: exe });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const email = `qa.student.${Date.now()}@gmail.com`;
  await page.goto(BASE + '/student-portal/register', { waitUntil: 'networkidle' });

  // 1. account cannot be created without verifying
  await page.click('#register-form button[type=submit]');
  check(/verify your email/i.test(await page.textContent('#register-form .cf-status')), 'submit without verification is blocked');

  // 2. invalid / fake addresses get no code
  await page.fill('#f-email', 'someone@no-such-domain-cuatro-qa-4821.com');
  await page.click('#send-code');
  await page.waitForFunction(() => { const t = document.getElementById('verify-msg').textContent; return t && !/Sending code/.test(t); }, null, { timeout: 15000 });
  check(/cannot receive email/i.test(await page.textContent('#verify-msg')), 'domain without mail server is rejected');
  check(await page.isHidden('#code-row'), 'no code box shown for a bad address');
  await page.fill('#f-email', 'temp@mailinator.com'); await page.click('#send-code'); await page.waitForTimeout(800);
  check(/disposable/i.test(await page.textContent('#verify-msg')), 'disposable address is rejected');

  // 3. real address: code is sent, wrong code fails, right code verifies
  await page.fill('#f-email', email); await page.click('#send-code');
  await page.waitForSelector('#code-row:not([hidden])', { timeout: 8000 });
  const code = await lastFromLog(new RegExp(`To: ${email.replace(/\./g, '\\.')}\\r?\\nSubject: (\\d{6}) is your`, 'g'));
  check(!!code, 'verification code e-mail generated for ' + email);
  await page.fill('#f-code', code === '000000' ? '111111' : '000000'); await page.click('#verify-code'); await page.waitForTimeout(600);
  check(/not correct/i.test(await page.textContent('#verify-msg')), 'wrong code is rejected');
  await page.fill('#f-code', code); await page.click('#verify-code'); await page.waitForTimeout(800);
  check(/verified/i.test(await page.textContent('#verify-msg')), 'correct code verifies the email');
  check(await page.$eval('#f-email', (e) => e.readOnly), 'verified email is locked');
  await page.screenshot({ path: path.join(OUT, 'email-verified.png'), fullPage: true });

  // 4. complete registration
  await page.fill('#f-full_name', 'QA Student');
  await page.fill('#f-contact_number', '+91 9876543210');
  await page.fill('#f-password', 'FirstPass123'); await page.fill('#f-confirm_password', 'FirstPass123');
  await page.fill('#f-graduation_year', '2025');
  await page.check('input[name=terms]');
  await Promise.all([page.waitForURL(/\/student-portal\/profile/, { timeout: 10000 }).catch(() => {}), page.click('#register-form button[type=submit]')]);
  check(/\/student-portal\/profile/.test(page.url()), 'account created and signed in -> ' + page.url());

  // 5. forgot password -> link -> reset -> login with the new password
  const ctx2 = await browser.newContext(); const p2 = await ctx2.newPage();
  await p2.goto(BASE + '/student-portal/login', { waitUntil: 'networkidle' });
  await p2.click('#forgot-link'); await p2.waitForTimeout(300);
  check(/type your account email/i.test(await p2.textContent('[data-error-for=email]')), 'forgot with empty email asks for the account email');
  check(/\/login/.test(p2.url()), 'forgot link stays on the login page');
  await p2.fill('#l-email', 'nobody.here@gmail.com'); await p2.click('#forgot-link'); await p2.waitForTimeout(800);
  check(/no student account/i.test(await p2.textContent('#login-form .cf-status')), 'unknown email gets no reset email');
  await p2.fill('#l-email', email); await p2.click('#forgot-link'); await p2.waitForTimeout(1000);
  check(/reset link has been sent to qa\*+/i.test(await p2.textContent('#login-form .cf-status')), 'forgot password sends to the account email: ' + await p2.textContent('#login-form .cf-status'));
  const link = await lastFromLog(/(https?:\/\/\S+\/student-portal\/reset-password\?token=[A-Za-z0-9_-]+)/g);
  check(!!link && link.startsWith(BASE), 'reset link e-mailed: ' + (link || 'none'));
  await p2.goto(link, { waitUntil: 'networkidle' });
  await p2.fill('#f-password', 'SecondPass456'); await p2.fill('#f-confirm_password', 'SecondPass456');
  await p2.click('#reset-form button[type=submit]'); await p2.waitForTimeout(800);
  check(/password has been updated/i.test(await p2.textContent('#reset-form .cf-status')), 'password reset succeeded');
  await p2.waitForURL(/\/student-portal\/login/, { timeout: 6000 }).catch(() => {});
  await p2.goto(BASE + '/student-portal/login', { waitUntil: 'networkidle' });
  await p2.fill('#l-email', email); await p2.fill('#l-password', 'FirstPass123'); await p2.click('#login-form button[type=submit]'); await p2.waitForTimeout(800);
  check(/incorrect/i.test(await p2.textContent('#login-form .cf-status')), 'old password no longer works');
  await p2.fill('#l-password', 'SecondPass456');
  await Promise.all([p2.waitForURL(/dashboard/, { timeout: 8000 }).catch(() => {}), p2.click('#login-form button[type=submit]')]);
  check(/dashboard/.test(p2.url()), 'login with the new password works');
  // reused link must fail
  const p3 = await ctx2.newPage(); await p3.goto(link, { waitUntil: 'networkidle' });
  await p3.fill('#f-password', 'ThirdPass789'); await p3.fill('#f-confirm_password', 'ThirdPass789');
  await p3.click('#reset-form button[type=submit]'); await p3.waitForTimeout(800);
  check(/invalid or has expired/i.test(await p3.textContent('#reset-form .cf-status')), 'reset link cannot be used twice');

  // mobile layout of the verify row
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(BASE + '/student-portal/register', { waitUntil: 'networkidle' });
  check(await m.evaluate(() => document.documentElement.scrollWidth <= 391), 'no horizontal overflow at 390px');
  await m.screenshot({ path: path.join(OUT, 'register-mobile.png') });
  check(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await browser.close();
  console.log(problems.length ? `\n${problems.length} problem(s)` : '\nAll email flow checks passed');
  process.exit(problems.length ? 1 : 0);
})();
