'use strict';

const path = require('path');

const ALLOWED = { '.pdf': 'pdf', '.docx': 'docx', '.txt': 'txt' };

/** Validates the real file content (not just the extension / client mime type). */
function detectType(originalName, buffer) {
  const ext = path.extname(originalName || '').toLowerCase();
  const type = ALLOWED[ext];
  if (!type) return { error: 'Unsupported file type. Please upload a PDF, DOCX or TXT file.' };
  if (!buffer || buffer.length === 0) return { error: 'The uploaded file is empty.' };

  if (type === 'pdf') {
    if (buffer.slice(0, 5).toString('latin1') !== '%PDF-') return { error: 'This file is not a valid PDF document.' };
  } else if (type === 'docx') {
    // DOCX is a ZIP container: PK\x03\x04 and must contain word/ entries
    if (!(buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04)) {
      return { error: 'This file is not a valid DOCX document.' };
    }
    if (!buffer.includes(Buffer.from('word/'))) return { error: 'This file is not a valid DOCX document.' };
  } else if (type === 'txt') {
    const sample = buffer.slice(0, 4096);
    if (sample.includes(0)) return { error: 'This file does not look like a plain-text document.' };
  }
  return { type };
}

async function extractText(type, buffer) {
  let text = '';
  if (type === 'txt') {
    text = buffer.toString('utf8');
  } else if (type === 'pdf') {
    const pdfParse = require('pdf-parse/lib/pdf-parse.js'); // avoids the package's debug entry point
    const data = await pdfParse(buffer);
    text = data.text || '';
  } else if (type === 'docx') {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    text = result.value || '';
  }
  return text.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 60000);
}

module.exports = { detectType, extractText, ALLOWED };
