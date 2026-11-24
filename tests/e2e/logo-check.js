'use strict';
// Captures header, auth, footer and mobile-menu screenshots to check logo placement.
const path = require('path');
const os = require('os');
const { chromium } = require('playwright-core');
const B = process.argv[2] || 'http://localhost:3101';
const out = (n) => path.join(os.tmpdir(), n);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(`${B}/index.html`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: out('s-home.png'), clip: { x: 0, y: 0, width: 1440, height: 130 } });
  await p.goto(`${B}/student-portal/login`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out('s-login.png') });
  await p.goto(`${B}/contact.html`, { waitUntil: 'networkidle' });
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out('s-footer.png') });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto(`${B}/index.html`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  await p.click('.main-header__right .mobile-nav__toggler');
  await p.waitForTimeout(1200);
  await p.screenshot({ path: out('s-mobile.png') });
  await b.close();
  console.log('done', os.tmpdir());
})().catch((e) => { console.error(e); process.exit(1); });
