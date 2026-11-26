'use strict';
/**
 * Browser check for the Resume Builder (server must be running with a fresh database).
 * Usage: node tests/e2e/resume-check.js [baseUrl] [serverLogFile]   (server without a mail service; the sign-up code is read from the log)
 * Registers a student, fills one resume per template, screenshots every preview, prints to PDF and checks the PDF text.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright-core');

const BASE = process.argv[2] || 'http://localhost:3105';
const OUT = path.join(os.tmpdir(), 'rb-check');
fs.mkdirSync(OUT, { recursive: true });
const problems = [];
const check = (c, m) => { console.log(`  ${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) problems.push(m); };

const DATA = {
  personal: { full_name: 'Nagesh R', headline: 'Full Stack Developer', email: 'nagesh@example.com', phone: '+91 98765 43210', location: 'Bengaluru, India', linkedin: 'linkedin.com/in/nagesh-sample', github: 'github.com/nagesh-sample', website: '' },
  summary: 'Computer science graduate with hands-on experience building web applications, APIs and data dashboards. Keen on clean code, teamwork and learning fast.',
  experience: [
    { title: 'Software Intern', company: 'Sample Tech Pvt Ltd', location: 'Bengaluru', start: 'Jan 2025', end: 'Jun 2025', current: false, bullets: 'Built REST APIs in Node.js used by two internal tools\nCut report time by 40% by optimising SQL queries\nWrote unit tests and documentation' },
    { title: 'Web Developer (Freelance)', company: 'Self-employed', location: 'Remote', start: 'Jul 2023', end: '', current: true, bullets: 'Delivered 5 responsive websites for local businesses\nManaged requirements and client feedback' },
    { title: 'Teaching Assistant', company: 'Sample Institute', location: 'Bengaluru', start: 'Aug 2022', end: 'May 2023', current: false, bullets: 'Helped 60 students with programming labs\nGraded assignments and ran doubt sessions' }
  ],
  education: [{ degree: 'B.Tech in Computer Science', school: 'Sample Institute of Technology', location: 'Bengaluru', start: '2021', end: '2025', score: 'CGPA 8.4 / 10', details: 'Databases, Algorithms, Web Technologies' }],
  projects: [
    { name: 'Job Tracker', link: 'github.com/nagesh-sample/job-tracker', tech: 'React, Node.js, SQLite', description: 'Web app to track job applications with reminders and charts.' },
    { name: 'Sales Dashboard', link: '', tech: 'Python, SQL, Power BI', description: 'Interactive dashboard that summarises monthly sales by region.' }
  ],
  skills: [{ name: 'Languages', items: 'Python, JavaScript, SQL, Java' }, { name: 'Tools', items: 'React, Node.js, Git, Docker, Figma' }, { name: 'Soft skills', items: 'Communication, Teamwork, Problem Solving' }],
  certifications: [{ name: 'Python for Data Analysis', issuer: 'Sample Academy', year: '2024' }, { name: 'SQL Fundamentals', issuer: 'Sample Academy', year: '2023' }],
  achievements: 'Winner, college hackathon 2024\nTop 5% in national coding contest',
  languages: 'English, Hindi, Kannada',
  target: { jobTitle: 'Junior Software Developer', company: 'Cuatro Tech Solutions', keyQualifications: 'Built and deployed web applications end to end\nStrong SQL and API integration skills\nComfortable working in agile teams' },
  settings: { accent: '#FFAA17', font: 'sans' }
};
const TEMPLATES = ['chronological', 'functional', 'combination', 'mini', 'targeted', 'modern', 'executive', 'fresher', 'creative', 'minimal'];

(async () => {
  let browser;
  for (const channel of ['msedge', 'chrome']) { try { browser = await chromium.launch({ channel, headless: true }); break; } catch (_) { /* next */ } }
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|fonts\.g|cuatro-(logo|icon)/.test(m.text())) errs.push(m.text()); });

  await page.goto(`${BASE}/student-portal/register`, { waitUntil: 'networkidle' });
  const email = `rb.${Date.now()}@gmail.com`;
  await page.evaluate((em) => window.CT.api('POST', '/api/auth/student/register/send-code', { email: em }), email);
  await new Promise((r) => setTimeout(r, 400));
  const logBuf = fs.readFileSync(process.argv[3]); const logTxt = logBuf.includes(0) ? logBuf.toString('utf16le') : logBuf.toString('utf8');
  const otp = [...logTxt.matchAll(new RegExp('To: ' + email.replace(/\./g, '\\.') + '\\r?\\nSubject: (\\d{6})', 'g'))].pop()[1];
  const verifyToken = (await page.evaluate(([em, code]) => window.CT.api('POST', '/api/auth/student/register/verify-code', { email: em, code }), [email, otp])).verifyToken;
  const reg = await page.evaluate(async ([em, verify_token]) => {
    try {
      const r = await window.CT.api('POST', '/api/auth/student/register', { verify_token, full_name: 'Nagesh R', email: em, contact_number: '+91 9876543210', password: 'Student1234', confirm_password: 'Student1234', graduation_year: 2025, degree: 'B.Tech', specialisation: 'Computer Science', college: 'Sample Institute', skills: 'Python, SQL' });
      window.CT.setCsrf(r.csrfToken);
      return 'ok';
    } catch (e) { return e.message; }
  }, [email, verifyToken]);
  check(reg === 'ok', `student registered (${reg})`);

  const ids = [];
  for (const t of TEMPLATES) {
    const id = await page.evaluate(async ({ t, data }) => {
      const c = await window.CT.api('POST', '/api/student/resume-builder/documents', { template: t });
      await window.CT.api('PUT', `/api/student/resume-builder/documents/${c.id}`, { title: `Nagesh - ${t}`, template: t, data });
      return c.id;
    }, { t, data: DATA });
    ids.push(id);
  }
  check(ids.length === 10, 'created one resume per template');

  await page.goto(`${BASE}/student-portal/resume-builder`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.rb-card');
  check((await page.$$('.rb-card')).length === 10, 'gallery shows 10 templates');
  check((await page.$$('.rb-doc')).length === 10, 'list shows 10 saved resumes');
  await page.screenshot({ path: path.join(OUT, 'gallery.png'), fullPage: false });
  await page.evaluate(() => document.querySelector('#gallery').scrollIntoView());
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'gallery2.png') });

  const pdfParse = require('pdf-parse/lib/pdf-parse.js');
  for (let i = 0; i < TEMPLATES.length; i += 1) {
    await page.goto(`${BASE}/student-portal/resume-editor?id=${ids[i]}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#rb-scale .rs');
    await page.waitForTimeout(500);
    await (await page.$('#rb-stage')).screenshot({ path: path.join(OUT, `tpl-${TEMPLATES[i]}.png`) });
    const pages = await page.textContent('#rb-pages');
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(overflowX <= 1, `${TEMPLATES[i]} editor: no horizontal overflow`);
    console.log(`     ${TEMPLATES[i]}: ${pages}`);
    // print to PDF with the same markup the Download button prints
    await page.evaluate(() => {
      const root = document.createElement('div'); root.id = 'rs-print-root';
      root.innerHTML = document.querySelector('#rb-scale').innerHTML; document.body.appendChild(root);
    });
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(() => document.querySelector('#rs-print-root').remove());
    const parsed = await pdfParse(pdf);
    check(/nagesh r/i.test(parsed.text) && /python/i.test(parsed.text), `${TEMPLATES[i]} PDF has selectable text (${parsed.numpages} page${parsed.numpages > 1 ? 's' : ''})`);
    if (i === 0) fs.writeFileSync(path.join(OUT, 'sample.pdf'), pdf);
  }

  // editing flow in the UI
  await page.goto(`${BASE}/student-portal/resume-editor?id=${ids[0]}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#f-personal-full_name');
  await page.fill('#f-personal-full_name', 'Nagesh Ravi');
  await page.waitForTimeout(300);
  check((await page.textContent('#rb-scale .rs-name')).includes('Nagesh Ravi'), 'live preview updates while typing');
  await page.selectOption('#rb-template', 'creative');
  await page.waitForTimeout(300);
  check(await page.$('#rb-scale .rs-creative') !== null, 'template switch re-renders instantly');
  await page.click('#rb-save');
  await page.waitForSelector('.cuatro-toast');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#rb-scale .rs-creative');
  check((await page.textContent('#rb-scale .rs-name')).includes('Nagesh Ravi'), 'edits and template persist after reload');
  await page.click('details[data-sec="experience"] > summary');
  await page.click('[data-op="add"][data-arr="experience"]');
  check((await page.$$('[data-arr="experience"][data-op="del"]')).length === 4, 'can add an experience entry');
  await page.click('#rb-use');
  await page.waitForSelector('.cuatro-toast');
  const cur = await page.evaluate(() => window.CT.api('GET', '/api/student/resume'));
  check(/Nagesh - chronological\.txt$/.test(cur.resume.original_name), `"Use for job matching" set the current resume (${cur.resume.original_name})`);

  // mobile layout
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/student-portal/resume-editor?id=${ids[5]}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.rb-mobile-tabs');
  await page.click('.rb-mobile-tabs button[data-view="preview"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'mobile-preview.png') });
  check((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1, 'mobile preview: no horizontal overflow');
  await page.goto(`${BASE}/student-portal/resume-builder`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.rb-card');
  check((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1, 'mobile gallery: no horizontal overflow');

  check(errs.length === 0, `no console/page errors${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
  await browser.close();
  console.log(problems.length ? `\n${problems.length} problem(s)` : '\nAll resume builder checks passed.');
  console.log('Screens in', OUT);
  process.exit(problems.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
