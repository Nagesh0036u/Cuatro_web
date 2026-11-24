'use strict';
// Captures the top of several pages (and home slide 3) into the temp folder to check banners.
const path = require('path');
const os = require('os');
const { chromium } = require('playwright-core');
const B = process.argv[2] || 'http://localhost:3101';
const pages = ['about', 'services', 'service-hr-services', 'service-database-management', 'service-digital-marketing', 'service-ui-ux-design', 'service-product-development', 'careers', 'contact', 'faq'];
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await b.newPage({ viewport: { width: 1440, height: 800 } });
  const sheet = [];
  for (const n of pages) {
    await p.goto(`${B}/${n}.html`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1200);
    const f = path.join(os.tmpdir(), `b-${n}.png`);
    await p.screenshot({ path: f, clip: { x: 0, y: 0, width: 1440, height: 520 } });
    sheet.push(f);
  }
  await p.goto(`${B}/index.html`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(16500);
  await p.screenshot({ path: path.join(os.tmpdir(), 'b-home3.png') });
  await b.close();
  console.log('ok');
})().catch((e) => { console.error(e); process.exit(1); });
