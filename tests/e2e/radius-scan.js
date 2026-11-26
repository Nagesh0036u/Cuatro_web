'use strict';
/**
 * Lists visible boxes (backgrounds, borders, shadows, images) that still have square corners.
 * Usage: node tests/e2e/radius-scan.js [baseUrl]   (server running with demo data and the QA admin)
 */
const { chromium } = require('playwright-core');
const BASE = process.argv[2] || 'http://localhost:3106';

const PUBLIC = ['index', 'about', 'services', 'service-hr-services', 'careers', 'job-details?id=1', 'contact', 'faq', '404'];
const STUDENT = ['dashboard', 'profile', 'resume', 'find-jobs', 'applications', 'notifications', 'settings', 'resume-builder'];
const ADMIN = ['dashboard', 'applications', 'jobs', 'job-edit', 'candidates', 'messages', 'audit', 'settings'];

const scan = () => {
  const out = [];
  const vw = window.innerWidth;
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 18) continue;
    if (r.width >= vw - 4) continue; // full-width bands are handled separately
    const hasBg = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || (cs.backgroundImage !== 'none' && !cs.backgroundImage.startsWith('linear-gradient(rgba(0, 0, 0, 0)'));
    const hasBorder = ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none');
    const isImg = el.tagName === 'IMG';
    const hasShadow = cs.boxShadow !== 'none';
    if (!(hasBg || hasBorder || hasShadow || isImg)) continue;
    const radii = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map((v) => parseFloat(v) || 0);
    if (radii.every((v) => v >= 6)) continue;
    if (cs.clipPath !== 'none') continue;
    const cls = (typeof el.className === 'string' ? el.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 1).join('.');
    out.push(`${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}|${isImg ? 'img' : hasBg ? 'bg' : hasBorder ? 'border' : 'shadow'}|${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  return out;
};

(async () => {
  let browser;
  for (const channel of ['msedge', 'chrome']) { try { browser = await chromium.launch({ channel, headless: true }); break; } catch (_) { /* next */ } }
  const tally = new Map();
  const add = (page, list) => list.forEach((s) => { const k = s.split('|').slice(0, 2).join('|'); if (!tally.has(k)) tally.set(k, { n: 0, pages: new Set(), size: s.split('|')[2] }); const t = tally.get(k); t.n += 1; t.pages.add(page); });

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  for (const n of PUBLIC) {
    await p.goto(`${BASE}/${n.includes('?') ? n.replace('?', '.html?') : n + '.html'}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
    await p.waitForTimeout(600);
    add(n, await p.evaluate(scan));
  }
  // student session
  await p.goto(`${BASE}/student-portal/register`, { waitUntil: 'networkidle' });
  await p.evaluate(async () => {
    const r = await window.CT.api('POST', '/api/auth/student/register', { full_name: 'Scan Student', email: `scan${Date.now()}@example.com`, contact_number: '+91 9876543210', password: 'Student1234', confirm_password: 'Student1234', graduation_year: 2025, degree: 'B.Tech', specialisation: 'Computer Science', college: 'Test', skills: 'Python, SQL, Docker' });
    window.CT.setCsrf(r.csrfToken);
    await window.CT.api('POST', '/api/student/resume-builder/documents', { template: 'modern' });
  });
  for (const n of ['login', 'register']) { /* auth pages are scanned from a signed-out context below */ }
  for (const n of STUDENT) {
    await p.goto(`${BASE}/student-portal/${n}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1300);
    add(`s-${n}`, await p.evaluate(scan));
  }
  const anon = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  for (const n of ['student-portal/login', 'student-portal/register', 'admin-portal/login']) {
    await anon.goto(`${BASE}/${n}`, { waitUntil: 'networkidle' });
    await anon.waitForTimeout(900);
    add(n, await anon.evaluate(scan));
  }
  const actx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ap = await actx.newPage();
  await ap.goto(`${BASE}/admin-portal/login`, { waitUntil: 'networkidle' });
  await ap.fill('#f-email', 'qa-admin@example.com');
  await ap.fill('#f-password', 'QaAdminPass2026');
  await ap.click('#login-form button[type=submit]');
  await ap.waitForURL(/admin-portal\/dashboard/);
  for (const n of ADMIN) {
    await ap.goto(`${BASE}/admin-portal/${n}`, { waitUntil: 'networkidle' });
    await ap.waitForTimeout(1200);
    add(`a-${n}`, await ap.evaluate(scan));
  }
  await browser.close();
  [...tally.entries()].sort((a, b) => b[1].n - a[1].n).forEach(([k, v]) => console.log(`${String(v.n).padStart(4)}  ${k}  e.g. ${v.size}  pages:${v.pages.size}`));
})().catch((e) => { console.error(e); process.exit(1); });
