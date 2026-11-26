'use strict';

/**
 * Browser smoke test (Playwright + installed Microsoft Edge / Chrome).
 * Usage: node tests/e2e/smoke.js [baseUrl] [serverLogFile]
 *   server must already be running with demo data and WITHOUT a mail service, its output going to serverLogFile
 *   (the sign-up verification code is read from that log).
 * Walks every public page, checks console/CSP/network errors, horizontal overflow at 3 viewports,
 * and runs the student + admin journey through the real UI.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const BASE = process.argv[2] || 'http://localhost:3100';
const LOG = process.argv[3];
async function codeFromLog(email) {
  for (let i = 0; i < 20; i++) {
    const buf = fs.readFileSync(LOG); const txt = buf.includes(0) ? buf.toString('utf16le') : buf.toString('utf8');
    const m = [...txt.matchAll(new RegExp('To: ' + email.replace(/[.+]/g, '\\$&') + '\\r?\\nSubject: (\\d{6}) is your', 'g'))];
    if (m.length) return m[m.length - 1][1];
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('verification code not found in ' + LOG);
}
const OUT = path.join(__dirname, 'screens');
fs.mkdirSync(OUT, { recursive: true });
const ADMIN = { email: process.env.QA_ADMIN_EMAIL || 'qa-admin@example.com', password: process.env.QA_ADMIN_PASSWORD || 'QaAdminPass2026' };

const problems = [];
const ok = (m) => console.log('  ok  ' + m);
const bad = (m) => { problems.push(m); console.log('  FAIL ' + m); };
const check = (cond, m) => (cond ? ok(m) : bad(m));

const PUBLIC = ['index', 'about', 'services', 'service-hr-services', 'service-database-management', 'service-digital-marketing', 'service-ui-ux-design',
  'service-product-development', 'careers', 'contact', 'faq', '404'];
const VIEWPORTS = [{ n: 'desktop', w: 1440, h: 900 }, { n: 'tablet', w: 820, h: 1100 }, { n: 'mobile', w: 390, h: 844 }];

async function launch() {
  for (const channel of ['msedge', 'chrome']) {
    try { return await chromium.launch({ channel, headless: true }); } catch (_) { /* try next */ }
  }
  throw new Error('No Edge/Chrome found');
}

function watch(page, label) {
  page.on('console', (m) => { if (['error'].includes(m.type()) && !/favicon|brand\/cuatro|fonts\.(googleapis|gstatic)/.test(m.text() + m.location().url)) bad(`${label} console error: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => bad(`${label} page error: ${e.message}`));
  page.on('requestfailed', (r) => { if (!/fonts\.g|cuatro-(logo|icon)/.test(r.url())) bad(`${label} request failed: ${r.url()}`); });
  page.on('response', (r) => { if (r.status() >= 400 && !/cuatro-(logo|icon)|favicon/.test(r.url()) && !/\/api\/(student|admin)\//.test(r.url())) bad(`${label} HTTP ${r.status()}: ${r.url()}`); });
}

async function overflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

(async () => {
  const browser = await launch();
  console.log('Public pages');
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    watch(page, vp.n);
    for (const name of PUBLIC) {
      const res = await page.goto(`${BASE}/${name}.html`, { waitUntil: 'networkidle' });
      check(name === '404' ? res.status() === 200 || res.status() === 404 : res.status() === 200, `${vp.n} ${name}.html loads`);
      await page.waitForTimeout(1300);
      const ov = await overflow(page);
      check(ov <= 1, `${vp.n} ${name}: no horizontal overflow (${ov}px)`);
      if (vp.n !== 'tablet') await page.screenshot({ path: path.join(OUT, `${vp.n}-${name}.png`), fullPage: false });
    }
    await ctx.close();
  }

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  watch(page, 'journey');

  console.log('Navigation');
  await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
  const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')).filter((h) => h && !h.startsWith('#') && !/^(tel|mailto|https?):/.test(h)));
  const uniq = [...new Set(hrefs.map((h) => h.split('?')[0]))];
  for (const h of uniq) {
    const url = new URL(h, `${BASE}/index.html`).toString();
    const r = await fetch(url, { redirect: 'manual' });
    check(r.status === 200 || r.status === 302, `link ${h} -> ${r.status}`);
  }
  check((await page.textContent('body')).includes('Ostech') === false, 'no "Ostech" text on home page');

  console.log('Careers');
  await page.goto(`${BASE}/careers.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.cuatro-job');
  const chips = await page.$$eval('#category-chips .cuatro-chip', (c) => c.length);
  check(chips === 20, `19 category chips + All (${chips})`);
  const total = await page.$$eval('.cuatro-job', (c) => c.length);
  check(total > 0, `job cards render (${total})`);
  await page.fill('#title', 'python');
  await page.click('#job-filter button[type=submit]');
  await page.waitForTimeout(600);
  check((await page.$$eval('.cuatro-job', (c) => c.length)) === 1, 'title search narrows results');
  await page.screenshot({ path: path.join(OUT, 'careers-filtered.png') });
  await page.click('#filter-reset');
  await page.waitForTimeout(600);
  await page.click('.cuatro-job a:has-text("View Details")');
  await page.waitForSelector('.cuatro-jobdetail');
  check(await page.isVisible('text=Demonstration listing'), 'demo label shown on job detail');
  await page.screenshot({ path: path.join(OUT, 'job-details.png') });

  console.log('Student journey');
  await page.click('a:has-text("Apply Now")');
  await page.waitForURL(/student-portal\/login/);
  check(true, 'Apply Now redirects unauthenticated visitor to login');
  await page.click('a:has-text("Create a student account")');
  await page.waitForSelector('#register-form');
  const stamp = Date.now();
  const email = `ui.student.${stamp}@gmail.com`;
  await page.fill('#f-full_name', 'UI Student');
  await page.fill('#f-email', email);
  await page.click('#send-code');
  await page.waitForSelector('#code-row:not([hidden])');
  await page.fill('#f-code', await codeFromLog(email));
  await page.click('#verify-code');
  await page.waitForSelector('.cx-verified');
  check(true, 'email verified with the code from the email');
  await page.fill('#f-contact_number', '+91 9876501234');
  await page.fill('#f-password', 'Student1234');
  await page.fill('#f-confirm_password', 'Student1234');
  await page.fill('#f-college', 'Test University');
  await page.fill('#f-degree', "Bachelor's degree");
  await page.fill('#f-specialisation', 'Computer Science');
  await page.fill('#f-graduation_year', '2025');
  await page.fill('#f-skills', 'Python, SQL');
  await page.screenshot({ path: path.join(OUT, 'student-register.png'), fullPage: true });
  await page.click('#register-form button[type=submit]');
  await page.waitForTimeout(500);
  check(await page.isVisible('[data-error-for=terms]:not(:empty)'), 'terms must be accepted');
  await page.check('input[name=terms]');
  await page.click('#register-form button[type=submit]');
  await page.waitForURL(/student-portal\/profile/);
  check(true, 'registration completes and opens profile');
  await page.waitForSelector('#profile-form');
  await page.screenshot({ path: path.join(OUT, 'student-profile.png') });

  await page.goto(`${BASE}/student-portal/resume`, { waitUntil: 'networkidle' });
  await page.setInputFiles('#f-resume', { name: 'resume.txt', mimeType: 'text/plain', buffer: Buffer.from('UI Student\nBachelor of Technology Computer Science\n2 years of experience\nSkills: Python, SQL, Machine Learning, Data Analysis, Docker, Git, REST APIs') });
  await page.click('#resume-form button[type=submit]');
  await page.waitForSelector('text=resume.txt');
  check(true, 'resume uploaded');
  await page.setInputFiles('#f-resume', { name: 'bad.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ') });
  await page.click('#resume-form button[type=submit]');
  await page.waitForSelector('[data-error-for=resume]:not(:empty)');
  check(true, 'invalid file rejected in UI');
  await page.screenshot({ path: path.join(OUT, 'student-resume.png') });

  await page.goto(`${BASE}/student-portal/find-jobs`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.cuatro-reco__item');
  const top = await page.textContent('.cuatro-reco__item .cuatro-score__num');
  check(/^\d+%$/.test(top.trim()), `recommendation shows computed percentage (${top.trim()})`);
  await page.screenshot({ path: path.join(OUT, 'student-recommended.png'), fullPage: true });
  await page.click('.cuatro-reco__item a:has-text("Inspect match")');
  await page.waitForSelector('.cuatro-breakdown');
  await page.screenshot({ path: path.join(OUT, 'student-job-match.png'), fullPage: true });
  await page.click('a:has-text("Apply Now")');
  await page.waitForSelector('#apply-form');
  await page.fill('#f-cover_letter', 'I would like to join your team.');
  await page.click('#apply-form button[type=submit]');
  await page.waitForSelector('#confirm-form');
  await page.click('#confirm-form button[type=submit]');
  await page.waitForSelector('[data-error-for=confirmed]:not(:empty)');
  await page.check('#confirm-form input[name=confirmed]');
  await page.screenshot({ path: path.join(OUT, 'student-apply-summary.png') });
  await page.click('#confirm-form button[type=submit]');
  await page.waitForSelector('.cuatro-success-screen .code');
  const code = (await page.textContent('.cuatro-success-screen .code')).trim();
  check(/^CTS-\d{4}-[A-Z0-9]{6}$/.test(code), `application ID generated (${code})`);

  await page.goto(`${BASE}/student-portal/application-details?id=${code}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.cuatro-timeline');
  await page.screenshot({ path: path.join(OUT, 'student-application.png'), fullPage: true });
  await page.goto(`${BASE}/student-portal/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.cuatro-stats');
  await page.screenshot({ path: path.join(OUT, 'student-dashboard.png'), fullPage: true });

  console.log('Admin journey');
  const actx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ap = await actx.newPage();
  watch(ap, 'admin');
  await ap.goto(`${BASE}/admin-portal/dashboard`, { waitUntil: 'networkidle' });
  check(/admin-portal\/login/.test(ap.url()), 'admin dashboard redirects to login when signed out');
  await ap.fill('#f-email', ADMIN.email);
  await ap.fill('#f-password', ADMIN.password);
  await ap.click('#login-form button[type=submit]');
  await ap.waitForURL(/admin-portal\/dashboard/);
  await ap.waitForSelector('.cuatro-stats');
  await ap.screenshot({ path: path.join(OUT, 'admin-dashboard.png'), fullPage: true });
  await ap.goto(`${BASE}/admin-portal/application?id=${code}`, { waitUntil: 'networkidle' });
  await ap.waitForSelector('#status-form');
  await ap.selectOption('#f-status', 'Interview Scheduled');
  await ap.fill('#f-interview_at', '2030-06-01T10:30');
  await ap.fill('#f-interview_details', 'Video call');
  await ap.fill('#f-message', 'Please join the interview on time.');
  await ap.click('#status-form button[type=submit]');
  await ap.waitForSelector('.cuatro-toast');
  await ap.screenshot({ path: path.join(OUT, 'admin-application.png'), fullPage: true });
  await ap.goto(`${BASE}/admin-portal/job-edit`, { waitUntil: 'networkidle' });
  await ap.screenshot({ path: path.join(OUT, 'admin-job-edit.png'), fullPage: true });
  await ap.goto(`${BASE}/admin-portal/jobs`, { waitUntil: 'networkidle' });
  await ap.screenshot({ path: path.join(OUT, 'admin-jobs.png') });

  console.log('Student sees update');
  await page.goto(`${BASE}/student-portal/application-details?id=${code}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.cuatro-timeline');
  check(await page.isVisible('.cuatro-badge:has-text("Interview Scheduled")'), 'student sees Interview Scheduled status');
  check(await page.isVisible('text=Please join the interview on time.'), 'student sees candidate-visible message');
  await page.screenshot({ path: path.join(OUT, 'student-application-updated.png'), fullPage: true });
  await page.goto(`${BASE}/student-portal/notifications`, { waitUntil: 'networkidle' });
  check(await page.isVisible('text=Interview scheduled'), 'student sees interview notification');

  console.log('Student cannot reach admin');
  await page.goto(`${BASE}/admin-portal/dashboard`, { waitUntil: 'networkidle' });
  check(/admin-portal\/login/.test(page.url()), 'student session is redirected away from admin portal');

  console.log('Portal viewports');
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    for (const p of ['dashboard', 'applications', 'find-jobs']) {
      await page.goto(`${BASE}/student-portal/${p}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      check((await overflow(page)) <= 1, `${vp.n} student ${p}: no horizontal overflow`);
    }
    await page.goto(`${BASE}/student-portal/application-details?id=${code}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    check((await overflow(page)) <= 1, `${vp.n} application timeline: no horizontal overflow`);
    if (vp.n === 'mobile') await page.screenshot({ path: path.join(OUT, 'mobile-application.png'), fullPage: true });
  }

  await browser.close();
  console.log(problems.length ? `\n${problems.length} problem(s):\n- ${problems.join('\n- ')}` : '\nAll browser checks passed.');
  process.exit(problems.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
