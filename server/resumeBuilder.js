'use strict';

/**
 * Resume Builder: template list, input sanitising and plain-text export.
 * The designs themselves are rendered in the browser (assets/js/cuatro-resume.js); the server only stores
 * validated data, so a student can never store markup or oversized content.
 */

const TEMPLATES = [
  'chronological', 'functional', 'combination', 'mini', 'targeted',
  'modern', 'executive', 'fresher', 'creative', 'minimal'
];
const FONTS = ['sans', 'serif', 'rounded'];
const MAX_DOCS_PER_STUDENT = 10;

const clean = (v) => String(v === null || v === undefined ? '' : v).replace(/\u0000/g, '').replace(/\r/g, '');
const line = (v, max) => clean(v).replace(/\n+/g, ' ').trim().slice(0, max);
const text = (v, max) => clean(v).trim().slice(0, max);
const list = (v, n) => (Array.isArray(v) ? v.slice(0, n) : []);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const color = (v, fallback) => (/^#[0-9a-fA-F]{6}$/.test(String(v || '')) ? String(v) : fallback);

function sanitize(input) {
  const d = obj(input);
  const p = obj(d.personal);
  const t = obj(d.target);
  const s = obj(d.settings);
  const out = {
    personal: {
      full_name: line(p.full_name, 100), headline: line(p.headline, 120), email: line(p.email, 120), phone: line(p.phone, 40),
      location: line(p.location, 100), linkedin: line(p.linkedin, 200), github: line(p.github, 200), website: line(p.website, 200)
    },
    summary: text(d.summary, 1200),
    experience: list(d.experience, 12).map((x) => {
      const o = obj(x);
      return { title: line(o.title, 120), company: line(o.company, 120), location: line(o.location, 100), start: line(o.start, 30), end: line(o.end, 30), current: o.current === true, bullets: text(o.bullets, 2000) };
    }),
    education: list(d.education, 8).map((x) => {
      const o = obj(x);
      return { degree: line(o.degree, 150), school: line(o.school, 150), location: line(o.location, 100), start: line(o.start, 30), end: line(o.end, 30), score: line(o.score, 40), details: text(o.details, 600) };
    }),
    projects: list(d.projects, 8).map((x) => {
      const o = obj(x);
      return { name: line(o.name, 120), link: line(o.link, 200), tech: line(o.tech, 200), description: text(o.description, 1000) };
    }),
    skills: list(d.skills, 8).map((x) => {
      const o = obj(x);
      return { name: line(o.name, 60), items: line(o.items, 400) };
    }),
    certifications: list(d.certifications, 10).map((x) => {
      const o = obj(x);
      return { name: line(o.name, 150), issuer: line(o.issuer, 120), year: line(o.year, 20) };
    }),
    achievements: text(d.achievements, 1500),
    languages: line(d.languages, 200),
    target: { jobTitle: line(t.jobTitle, 120), company: line(t.company, 120), keyQualifications: text(t.keyQualifications, 800) },
    settings: { accent: color(s.accent, '#E8743B'), font: FONTS.includes(s.font) ? s.font : 'sans' }
  };
  if (JSON.stringify(out).length > 60000) return null;
  return out;
}

function defaultData(profile) {
  const edu = [];
  if (profile.degree || profile.college) {
    edu.push({
      degree: [profile.degree, profile.specialisation].filter(Boolean).join(' in '), school: profile.college || '', location: '',
      start: '', end: profile.graduation_year ? String(profile.graduation_year) : '', score: '', details: ''
    });
  }
  if (!edu.length) edu.push({ degree: '', school: '', location: '', start: '', end: '', score: '', details: '' });
  return sanitize({
    personal: { full_name: profile.full_name, headline: '', email: profile.email, phone: profile.contact_number, location: profile.location },
    summary: '',
    experience: [{ title: '', company: '', location: '', start: '', end: '', current: false, bullets: '' }],
    education: edu,
    projects: [{ name: '', link: '', tech: '', description: '' }],
    skills: [{ name: 'Skills', items: profile.skills || '' }],
    certifications: [], achievements: '', languages: '',
    target: { jobTitle: '', company: '', keyQualifications: '' },
    settings: { accent: '#E8743B', font: 'sans' }
  });
}

const dates = (o) => [o.start, o.current ? 'Present' : o.end].filter(Boolean).join(' - ');
const bulletLines = (s) => String(s || '').split('\n').map((x) => x.replace(/^[\s\-*\u2022]+/, '').trim()).filter(Boolean);

/** Plain text version used for resume-based job matching and recruiter download. */
function toText(d) {
  const L = [];
  const p = d.personal;
  if (p.full_name) L.push(p.full_name);
  if (p.headline) L.push(p.headline);
  L.push([p.email, p.phone, p.location, p.linkedin, p.github, p.website].filter(Boolean).join(' | '));
  const section = (title, rows) => { if (rows.length) { L.push('', title.toUpperCase(), ...rows); } };
  section('Summary', d.summary ? [d.summary] : []);
  if (d.target.jobTitle) section('Target role', [`${d.target.jobTitle}${d.target.company ? ' at ' + d.target.company : ''}`, ...bulletLines(d.target.keyQualifications).map((x) => `- ${x}`)]);
  section('Skills', d.skills.filter((g) => g.items).map((g) => `${g.name ? g.name + ': ' : ''}${g.items}`));
  section('Experience', d.experience.filter((x) => x.title || x.company).flatMap((x) => [
    `${x.title}${x.company ? ', ' + x.company : ''}${x.location ? ', ' + x.location : ''} (${dates(x)})`, ...bulletLines(x.bullets).map((b) => `- ${b}`)]));
  section('Education', d.education.filter((x) => x.degree || x.school).flatMap((x) => [
    `${x.degree}${x.school ? ', ' + x.school : ''}${x.location ? ', ' + x.location : ''} (${dates(x)})${x.score ? ' - ' + x.score : ''}`, ...(x.details ? [x.details] : [])]));
  section('Projects', d.projects.filter((x) => x.name).flatMap((x) => [
    `${x.name}${x.tech ? ' (' + x.tech + ')' : ''}${x.link ? ' - ' + x.link : ''}`, ...(x.description ? [x.description] : [])]));
  section('Certifications', d.certifications.filter((x) => x.name).map((x) => `${x.name}${x.issuer ? ', ' + x.issuer : ''}${x.year ? ' (' + x.year + ')' : ''}`));
  section('Achievements', bulletLines(d.achievements).map((x) => `- ${x}`));
  section('Languages', d.languages ? [d.languages] : []);
  return L.join('\n').trim();
}

module.exports = { TEMPLATES, FONTS, MAX_DOCS_PER_STUDENT, sanitize, defaultData, toText };
