'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/** Boots the real app on an ephemeral port with an isolated temp database / resume folder. */
async function startServer() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cuatro-test-'));
  process.env.DATABASE_PATH = path.join(tmp, 'test.sqlite');
  process.env.RESUME_DIR = path.join(tmp, 'resumes');
  process.env.DISABLE_IP_RATE_LIMIT = 'true';
  process.env.BCRYPT_ROUNDS = '4';
  process.env.NODE_ENV = 'test';
  process.env.MAIL_TRANSPORT = 'log'; // never send real e-mail from tests
  process.env.ADMIN_EMAIL = '';
  process.env.ADMIN_PASSWORD = '';
  const config = require('../server/config');
  if (config.dbPath !== process.env.DATABASE_PATH) throw new Error('Refusing to run tests: server config was loaded before the test database was set (' + config.dbPath + ')');
  const { createApp } = require('../server/app');
  const db = require('../server/db');
  const app = createApp();
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base, tmp, db,
    async close() { await new Promise((r) => server.close(r)); db.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
  };
}

/** Minimal HTTP client with a cookie jar and automatic CSRF header. */
class Client {
  constructor(base) { this.base = base; this.cookie = ''; this.csrf = ''; }

  async init() { const r = await this.get('/api/session'); this.csrf = r.json.csrfToken; return r; }

  async request(method, url, { json, form, headers = {}, raw } = {}) {
    const h = { ...headers };
    if (this.cookie) h.cookie = this.cookie;
    if (this.csrf) h['x-csrf-token'] = this.csrf;
    let body;
    if (json !== undefined) { h['content-type'] = 'application/json'; body = JSON.stringify(json); }
    if (form) body = form;
    const res = await fetch(this.base + url, { method, headers: h, body, redirect: 'manual' });
    const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    setCookie.forEach((c) => {
      const [pair] = c.split(';');
      const [name, value] = pair.split('=');
      if (/Max-Age=0/i.test(c) || value === '') this.cookie = this.cookie.split('; ').filter((x) => !x.startsWith(`${name}=`)).join('; ');
      else this.cookie = this.cookie.split('; ').filter((x) => x && !x.startsWith(`${name}=`)).concat(pair).join('; ');
    });
    if (raw) return { status: res.status, headers: res.headers, buffer: Buffer.from(await res.arrayBuffer()) };
    const text = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch (_) { /* not json */ }
    return { status: res.status, headers: res.headers, json: parsed, text };
  }

  get(url, opts) { return this.request('GET', url, opts); }
  post(url, json, opts) { return this.request('POST', url, { json, ...opts }); }
  put(url, json) { return this.request('PUT', url, { json }); }
  del(url) { return this.request('DELETE', url); }

  async upload(url, filename, content, type = 'application/octet-stream') {
    const form = new FormData();
    form.append('resume', new Blob([content], { type }), filename);
    return this.request('POST', url, { form });
  }
}

function crc32(buf) { return zlib.crc32 ? zlib.crc32(buf) : 0; }

/** Builds a tiny but valid .docx (ZIP with stored entries) containing the given paragraphs. */
function makeDocx(paragraphs) {
  const files = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/document.xml': `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`
  };
  const locals = []; const centrals = []; let offset = 0;
  Object.entries(files).forEach(([name, text]) => {
    const nameBuf = Buffer.from(name); const data = Buffer.from(text); const crc = crc32(data);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nameBuf.length, 26);
    locals.push(lh, nameBuf, data);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nameBuf.length, 28); ch.writeUInt32LE(offset, 42);
    centrals.push(ch, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  });
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(3, 8); end.writeUInt16LE(3, 10);
  end.writeUInt32LE(centralBuf.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

/** Minimal single-page PDF with one line of text. */
function makePdf(text) {
  const stream = `BT /F1 12 Tf 50 700 Td (${text.replace(/[()\\]/g, '')}) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>'
  ];
  let out = '%PDF-1.4\n'; const offsets = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}

module.exports = { startServer, Client, makeDocx, makePdf };
