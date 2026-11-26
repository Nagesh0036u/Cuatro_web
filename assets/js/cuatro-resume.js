/* Student Portal: Resume Builder (template gallery, editor with live preview, print to PDF). */
(function () {
  'use strict';
  const CT = window.CT;
  const e = CT.esc;
  const P = '/student-portal';
  const API = '/api/student/resume-builder';
  const PAGE_H = 1123;
  const PAGE_W = 794;

  const TEMPLATES = [
    { id: 'chronological', name: 'Classic Chronological', type: 'Chronological', accent: '#0A0F1E', desc: 'Work history in reverse order. Best with steady experience and no gaps.' },
    { id: 'functional', name: 'Skills Focus', type: 'Functional', accent: '#E8743B', desc: 'Leads with skills and expertise. Good for career changers and employment gaps.' },
    { id: 'combination', name: 'Skills + Experience', type: 'Combination (Hybrid)', accent: '#E8743B', desc: 'Highlights skills first, then a reverse-chronological work history.' },
    { id: 'mini', name: 'Mini One-Pager', type: 'Mini', accent: '#0A0F1E', desc: 'A condensed version for networking events and quick sharing.' },
    { id: 'targeted', name: 'Targeted Application', type: 'Targeted', accent: '#E8743B', desc: 'Aimed at one job, with key qualifications matched to that role.' },
    { id: 'modern', name: 'Modern Sidebar', type: 'Modern', accent: '#0A0F1E', desc: 'Two-column layout with a coloured sidebar for contact and skills.' },
    { id: 'executive', name: 'Executive Serif', type: 'Formal', accent: '#0A0F1E', font: 'serif', desc: 'Traditional serif design for formal and senior roles.' },
    { id: 'fresher', name: 'Fresher / Student', type: 'Education first', accent: '#E8743B', desc: 'Puts education, projects and skills first. Ideal for graduates.' },
    { id: 'creative', name: 'Creative Bold', type: 'Creative', accent: '#E8743B', desc: 'Bold header and two columns for design, marketing and media roles.' },
    { id: 'minimal', name: 'ATS Minimal', type: 'Plain / ATS-friendly', accent: '#111111', desc: 'Plain single column that applicant tracking systems read easily.' }
  ];
  const tplById = (id) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];

  const SAMPLE = {
    personal: { full_name: 'Aarav Sharma', headline: 'Software Developer', email: 'aarav.sharma@example.com', phone: '+91 98765 43210', location: 'Bengaluru, India', linkedin: 'linkedin.com/in/aarav-sample', github: 'github.com/aarav-sample', website: '' },
    summary: 'Computer Science graduate with hands-on experience building web applications and data tools. Keen on clean code, clear communication and learning quickly.',
    experience: [
      { title: 'Software Intern', company: 'Sample Tech Pvt Ltd', location: 'Bengaluru', start: 'Jan 2025', end: 'Jun 2025', current: false, bullets: 'Built REST APIs in Node.js used by two internal tools\nReduced report generation time by 40% with SQL optimisation\nWrote unit tests and documentation for new features' },
      { title: 'Web Developer (Freelance)', company: 'Self-employed', location: 'Remote', start: 'Jul 2023', end: '', current: true, bullets: 'Designed and delivered 5 responsive websites for local businesses\nManaged requirements, timelines and client feedback' }
    ],
    education: [{ degree: 'B.Tech in Computer Science', school: 'Sample Institute of Technology', location: 'Bengaluru', start: '2021', end: '2025', score: 'CGPA 8.4 / 10', details: 'Relevant coursework: Databases, Algorithms, Web Technologies' }],
    projects: [
      { name: 'Job Tracker App', link: 'github.com/aarav-sample/job-tracker', tech: 'React, Node.js, SQLite', description: 'Web app to track job applications with reminders and status charts.' },
      { name: 'Sales Dashboard', link: '', tech: 'Python, SQL, Power BI', description: 'Interactive dashboard that summarises monthly sales by region.' }
    ],
    skills: [{ name: 'Languages', items: 'Python, JavaScript, SQL' }, { name: 'Tools', items: 'React, Node.js, Git, Docker, Figma' }],
    certifications: [{ name: 'Python for Data Analysis', issuer: 'Sample Academy', year: '2024' }, { name: 'SQL Fundamentals', issuer: 'Sample Academy', year: '2023' }],
    achievements: 'Winner, college hackathon 2024\nTop 5% in national coding contest',
    languages: 'English, Hindi, Kannada',
    target: { jobTitle: 'Junior Software Developer', company: 'Cuatro Tech Solutions', keyQualifications: 'Built and deployed web applications end to end\nStrong SQL and API integration skills\nComfortable working in agile teams' },
    settings: { accent: '#E8743B', font: 'sans' }
  };

  // ------------------------------------------------------------------ colour helpers
  function rgb(hex) { const n = parseInt(String(hex).slice(1), 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; }
  function lum(c) { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
  function cssVars(accent) {
    const c = rgb(/^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#E8743B');
    const dark = `rgb(${Math.round(c.r * 0.55)},${Math.round(c.g * 0.55)},${Math.round(c.b * 0.55)})`;
    const tint = `rgb(${Math.round(c.r + (255 - c.r) * 0.88)},${Math.round(c.g + (255 - c.g) * 0.88)},${Math.round(c.b + (255 - c.b) * 0.88)})`;
    return `--rs-accent:rgb(${c.r},${c.g},${c.b});--rs-accent-dark:${dark};--rs-tint:${tint};--rs-on-accent:${lum(c) > 0.18 ? '#0A0F1E' : '#ffffff'}`;
  }

  // ------------------------------------------------------------------ resume renderer (pure: data in, HTML out)
  const lines = (s) => String(s || '').split('\n').map((x) => x.replace(/^[\s\-*\u2022]+/, '').trim()).filter(Boolean);
  const dateStr = (o) => [o.start, o.current ? 'Present' : o.end].filter(Boolean).join(' &ndash; ');
  const shortUrl = (u) => String(u || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  const contacts = (p) => [p.email, p.phone, p.location, shortUrl(p.linkedin), shortUrl(p.github), shortUrl(p.website)].filter(Boolean);
  const sec = (title, inner, cls) => (inner && inner.trim() ? `<section class="rs-sec ${cls || ''}"><div class="rs-h">${title}</div>${inner}</section>` : '');
  const bullets = (s, max) => { const l = lines(s).slice(0, max || 99); return l.length ? `<ul class="rs-list">${l.map((x) => `<li>${e(x)}</li>`).join('')}</ul>` : ''; };
  const allSkills = (d) => d.skills.flatMap((g) => String(g.items || '').split(',').map((s) => s.trim()).filter(Boolean));

  function blocks(d, o) {
    o = o || {};
    const exp = d.experience.filter((x) => x.title || x.company).slice(0, o.expLimit || 99);
    const expHtml = (noBullets) => exp.map((x) => `<div class="rs-item"><div class="rs-row"><div><span class="rs-role">${e(x.title)}</span>${x.company ? `<span class="rs-org">${x.title ? ' &middot; ' : ''}${e(x.company)}</span>` : ''}${x.location ? `<span class="rs-loc">, ${e(x.location)}</span>` : ''}</div><div class="rs-date">${dateStr(x)}</div></div>${noBullets ? '' : bullets(x.bullets, o.maxBullets)}</div>`).join('');
    const edu = d.education.filter((x) => x.degree || x.school).slice(0, o.eduLimit || 99).map((x) => `<div class="rs-item"><div class="rs-row"><div><span class="rs-role">${e(x.degree)}</span>${x.school ? `<span class="rs-org">${x.degree ? ' &middot; ' : ''}${e(x.school)}</span>` : ''}${x.location ? `<span class="rs-loc">, ${e(x.location)}</span>` : ''}</div><div class="rs-date">${dateStr(x)}</div></div>${x.score ? `<div class="rs-sub">${e(x.score)}</div>` : ''}${x.details ? `<div class="rs-sub">${e(x.details)}</div>` : ''}</div>`).join('');
    const proj = d.projects.filter((x) => x.name).slice(0, o.projLimit || 99).map((x) => `<div class="rs-item"><div class="rs-row"><div><span class="rs-role">${e(x.name)}</span>${x.tech ? `<span class="rs-loc"> &middot; ${e(x.tech)}</span>` : ''}</div>${x.link ? `<div class="rs-date">${e(shortUrl(x.link))}</div>` : ''}</div>${x.description ? `<div class="rs-sub" style="color:inherit">${e(x.description)}</div>` : ''}</div>`).join('');
    const groups = d.skills.filter((g) => g.items);
    const certs = d.certifications.filter((x) => x.name).slice(0, o.certLimit || 99);
    return {
      summary: d.summary ? `<p class="rs-p">${e(o.summaryMax ? d.summary.slice(0, o.summaryMax) : d.summary)}</p>` : '',
      experience: expHtml(false),
      workHistory: expHtml(true),
      education: edu,
      projects: proj,
      skillsInline: groups.map((g) => `<p class="rs-inline">${g.name ? `<b>${e(g.name)}:</b> ` : ''}${e(g.items)}</p>`).join(''),
      skillsBlocks: groups.map((g) => `<div class="rs-skillblock">${g.name ? `<span class="rs-role">${e(g.name)}</span>` : ''}<ul class="rs-list rs-cols2">${g.items.split(',').map((s) => s.trim()).filter(Boolean).map((s) => `<li>${e(s)}</li>`).join('')}</ul></div>`).join(''),
      chips: allSkills(d).length ? `<div class="rs-chips">${allSkills(d).map((s) => `<span class="rs-chip">${e(s)}</span>`).join('')}</div>` : '',
      sideSkills: allSkills(d).length ? `<ul class="rs-list">${allSkills(d).map((s) => `<li>${e(s)}</li>`).join('')}</ul>` : '',
      certs: certs.length ? `<ul class="rs-list">${certs.map((x) => `<li>${e(x.name)}${x.issuer ? `, ${e(x.issuer)}` : ''}${x.year ? ` (${e(x.year)})` : ''}</li>`).join('')}</ul>` : '',
      achievements: bullets(d.achievements),
      languages: d.languages ? `<p class="rs-p">${e(d.languages)}</p>` : ''
    };
  }

  const nameHtml = (d) => (d.personal.full_name ? e(d.personal.full_name) : '<span class="rs-empty">Your Name</span>');
  const contactHtml = (d) => { const c = contacts(d.personal); return c.length ? `<div class="rs-contact">${c.map((x) => `<span>${e(x)}</span>`).join('')}</div>` : ''; };
  const headHtml = (d) => `<div class="rs-name">${nameHtml(d)}</div>${d.personal.headline ? `<div class="rs-headline">${e(d.personal.headline)}</div>` : ''}${contactHtml(d)}`;

  const LAYOUTS = {
    chronological: (d) => { const b = blocks(d); return `<div class="rs-head">${headHtml(d)}</div>${sec('Summary', b.summary)}${sec('Experience', b.experience)}${sec('Education', b.education)}${sec('Projects', b.projects)}${sec('Skills', b.skillsInline)}${sec('Certifications', b.certs)}${sec('Achievements', b.achievements)}${sec('Languages', b.languages)}`; },
    functional: (d) => { const b = blocks(d); return `<div class="rs-head">${headHtml(d)}</div>${sec('Summary', b.summary)}${sec('Skills &amp; Areas of Expertise', b.skillsBlocks)}${sec('Key Achievements', b.achievements)}${sec('Projects', b.projects)}${sec('Work History', b.workHistory)}${sec('Education', b.education)}${sec('Certifications', b.certs)}${sec('Languages', b.languages)}`; },
    combination: (d) => { const b = blocks(d); const c = contacts(d.personal); return `<div class="rs-head"><div><div class="rs-name">${nameHtml(d)}</div>${d.personal.headline ? `<div class="rs-headline">${e(d.personal.headline)}</div>` : ''}</div>${c.length ? `<div class="rs-contact">${c.map((x) => `<span>${e(x)}</span>`).join('')}</div>` : ''}</div><div class="rs-body">${sec('Summary', b.summary)}${sec('Core Skills', b.chips)}${sec('Professional Experience', b.experience)}${sec('Projects', b.projects)}${sec('Education', b.education)}${sec('Certifications', b.certs)}${sec('Achievements', b.achievements)}${sec('Languages', b.languages)}</div>`; },
    mini: (d) => { const b = blocks(d, { expLimit: 2, maxBullets: 2, eduLimit: 1, projLimit: 1, certLimit: 3, summaryMax: 280 }); return `<div class="rs-head">${headHtml(d)}</div>${sec('Profile', b.summary)}${sec('Key Skills', b.skillsInline)}${sec('Experience', b.experience)}${sec('Education', b.education)}${sec('Project', b.projects)}${sec('Certifications', b.certs)}`; },
    targeted: (d) => {
      const b = blocks(d); const t = d.target;
      const bar = t.jobTitle ? `<div class="rs-target">Applying for: ${e(t.jobTitle)}${t.company ? ` at ${e(t.company)}` : ''}</div>` : '';
      const kq = lines(t.keyQualifications);
      const keyq = kq.length ? `<div class="rs-keyq"><span class="rs-role">Why I am a strong fit</span><ul class="rs-list">${kq.map((x) => `<li>${e(x)}</li>`).join('')}</ul></div>` : '';
      return `<div class="rs-head">${headHtml(d)}</div>${bar}${keyq}${sec('Summary', b.summary)}${sec('Relevant Skills', b.chips)}${sec('Experience', b.experience)}${sec('Projects', b.projects)}${sec('Education', b.education)}${sec('Certifications', b.certs)}${sec('Achievements', b.achievements)}${sec('Languages', b.languages)}`;
    },
    modern: (d) => {
      const b = blocks(d); const c = contacts(d.personal);
      return `<aside class="rs-side">${sec('Contact', c.map((x) => `<div class="rs-side-line">${e(x)}</div>`).join(''))}${sec('Skills', b.sideSkills)}${sec('Certifications', b.certs)}${sec('Languages', b.languages)}</aside><div class="rs-main"><div class="rs-name">${nameHtml(d)}</div>${d.personal.headline ? `<div class="rs-headline">${e(d.personal.headline)}</div>` : ''}${sec('Profile', b.summary)}${sec('Experience', b.experience)}${sec('Projects', b.projects)}${sec('Education', b.education)}${sec('Achievements', b.achievements)}</div>`;
    },
    executive: (d) => { const b = blocks(d); return `<div class="rs-head">${headHtml(d)}</div>${sec('Professional Summary', b.summary)}${sec('Professional Experience', b.experience)}${sec('Education', b.education)}${sec('Core Competencies', b.skillsInline)}${sec('Projects', b.projects)}${sec('Certifications', b.certs)}${sec('Honours &amp; Achievements', b.achievements)}${sec('Languages', b.languages)}`; },
    fresher: (d) => { const b = blocks(d); return `<div class="rs-head">${headHtml(d)}</div>${sec('Career Objective', b.summary)}${sec('Education', b.education)}${sec('Projects', b.projects)}${sec('Skills', b.skillsInline)}${sec('Internships &amp; Experience', b.experience)}${sec('Certifications', b.certs)}${sec('Achievements', b.achievements)}${sec('Languages', b.languages)}`; },
    creative: (d) => { const b = blocks(d); return `<div class="rs-head">${headHtml(d)}</div><div class="rs-grid"><div>${sec('About Me', b.summary)}${sec('Experience', b.experience)}${sec('Projects', b.projects)}</div><div>${sec('Skills', b.chips)}${sec('Education', b.education)}${sec('Certifications', b.certs)}${sec('Languages', b.languages)}${sec('Achievements', b.achievements)}</div></div>`; },
    minimal: (d) => { const b = blocks(d); return `<div class="rs-head">${headHtml(d)}</div>${sec('Summary', b.summary)}${sec('Skills', b.chips)}${sec('Experience', b.experience)}${sec('Projects', b.projects)}${sec('Education', b.education)}${sec('Certifications', b.certs)}${sec('Achievements', b.achievements)}${sec('Languages', b.languages)}`; }
  };

  function renderResume(template, d) {
    const font = (d.settings && d.settings.font) || 'sans';
    return `<div class="rs rs-${template} rs-font-${font}" style="${cssVars(d.settings && d.settings.accent)}">${(LAYOUTS[template] || LAYOUTS.chronological)(d)}</div>`;
  }

  // Prints only the resume: a clone is added to <body> and the print stylesheet hides everything else.
  function printResume(template, d, title) {
    const root = document.createElement('div');
    root.id = 'rs-print-root';
    root.innerHTML = renderResume(template, d);
    document.body.appendChild(root);
    const oldTitle = document.title;
    document.title = title || 'Resume';
    const done = () => { root.remove(); document.title = oldTitle; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
  }

  function fitThumbs(root) {
    root.querySelectorAll('.rb-thumb').forEach((box) => {
      const r = box.querySelector('.rs');
      if (r) r.style.transform = `scale(${box.clientWidth / PAGE_W})`;
    });
  }

  // ------------------------------------------------------------------ builder home: my resumes + template gallery
  CT.on('student-resume-builder', () => CT.portalView(async (app) => {
    const draw = async () => {
      const { documents, max } = await CT.api('GET', `${API}/documents`);
      app.innerHTML = `<h2 class="cuatro-app__title">Resume Builder</h2>
        <p class="cuatro-app__lead">Create a professional resume in minutes. Pick a design, fill in your details, edit any time and download it as a PDF.</p>
        <div class="cuatro-box"><div class="cuatro-box__head"><h3>My resumes</h3><span class="cuatro-muted">${documents.length} of ${max}</span></div>
        ${documents.length ? `<div class="rb-doclist">${documents.map((x) => `<div class="rb-doc"><div><div class="rb-doc__name">${e(x.title)}</div><div class="rb-doc__meta">${e(tplById(x.template).name)} &middot; edited ${CT.fmtDate(x.updated_at, true)}</div></div>
          <div class="cuatro-inline"><a class="ostech-btn cuatro-btn-sm" href="${P}/resume-editor?id=${x.id}">Edit</a><button class="ostech-btn ostech-btn--secondary cuatro-btn-sm" data-act="dup" data-id="${x.id}">Duplicate</button><button class="cuatro-btn-link" data-act="del" data-id="${x.id}">Delete</button></div></div>`).join('')}</div>`
          : '<div class="cuatro-empty">You have not created a resume yet. Choose a template below to start.</div>'}</div>
        <div class="cuatro-box"><h3>Choose a template</h3><p class="cuatro-muted">Previews show sample content. Your own details are filled in when you start. You can switch templates later without losing anything.</p>
        <div class="rb-gallery" id="gallery">${TEMPLATES.map((t) => `<div class="rb-card"><div class="rb-thumb">${renderResume(t.id, Object.assign({}, SAMPLE, { settings: { accent: t.accent, font: t.font || 'sans' } }))}</div>
          <div class="rb-card__body"><span class="rb-card__type">${e(t.type)}</span><h4 class="rb-card__name">${e(t.name)}</h4><p class="rb-card__desc">${e(t.desc)}</p><button class="ostech-btn cuatro-btn-sm" data-act="new" data-t="${t.id}">Use this template</button></div></div>`).join('')}</div></div>`;
      fitThumbs(app);
      app.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', async () => {
        const act = b.getAttribute('data-act'); const id = b.getAttribute('data-id');
        try {
          if (act === 'new') {
            const t = tplById(b.getAttribute('data-t'));
            const r = await CT.api('POST', `${API}/documents`, { template: t.id, accent: t.accent, font: t.font || 'sans' });
            location.href = `${P}/resume-editor?id=${r.id}`;
          } else if (act === 'dup') {
            await CT.api('POST', `${API}/documents/${id}/duplicate`, {}); CT.toast('Resume duplicated'); await draw();
          } else if (act === 'del') {
            if (!confirm('Delete this resume permanently?')) return;
            await CT.api('DELETE', `${API}/documents/${id}`); CT.toast('Resume deleted'); await draw();
          }
        } catch (err) { CT.toast(err.message, true); }
      }));
    };
    await draw();
    window.addEventListener('resize', () => fitThumbs(app));
  }));

  // ------------------------------------------------------------------ editor
  const BLANK = {
    experience: () => ({ title: '', company: '', location: '', start: '', end: '', current: false, bullets: '' }),
    education: () => ({ degree: '', school: '', location: '', start: '', end: '', score: '', details: '' }),
    projects: () => ({ name: '', link: '', tech: '', description: '' }),
    skills: () => ({ name: '', items: '' }),
    certifications: () => ({ name: '', issuer: '', year: '' })
  };
  const LIMITS = { experience: 12, education: 8, projects: 8, skills: 8, certifications: 10 };

  const getPath = (o, path) => path.split('.').reduce((a, k) => (a === undefined || a === null ? a : a[k]), o);
  function setPath(o, path, value) {
    const keys = path.split('.'); const last = keys.pop();
    const target = keys.reduce((a, k) => a[k], o);
    target[last] = value;
  }

  function fld(d, path, label, o) {
    o = o || {};
    const v = getPath(d, path); const val = v === undefined || v === null ? '' : v;
    const id = `f-${path.replace(/\./g, '-')}`;
    const input = o.area
      ? `<textarea id="${id}" data-path="${path}" rows="${o.rows || 4}" maxlength="${o.max || 2000}" placeholder="${e(o.ph || '')}">${e(val)}</textarea>`
      : `<input id="${id}" data-path="${path}" type="${o.type || 'text'}" value="${e(val)}" maxlength="${o.max || 200}" placeholder="${e(o.ph || '')}" autocomplete="off">`;
    return `<div class="rb-field"><label for="${id}">${label}</label>${input}${o.help ? `<small>${o.help}</small>` : ''}</div>`;
  }

  function repeater(d, key, title, itemTitle, bodyFn) {
    const list = d[key];
    return `${list.map((it, i) => `<div class="rb-item"><div class="rb-item__head"><span>${e(itemTitle(it, i))}</span><span class="rb-item__tools">
      <button type="button" class="rb-icon" data-op="up" data-arr="${key}" data-i="${i}" aria-label="Move up"${i === 0 ? ' disabled' : ''}>&uarr;</button>
      <button type="button" class="rb-icon" data-op="down" data-arr="${key}" data-i="${i}" aria-label="Move down"${i === list.length - 1 ? ' disabled' : ''}>&darr;</button>
      <button type="button" class="rb-icon" data-op="del" data-arr="${key}" data-i="${i}" aria-label="Remove">&times;</button></span></div>${bodyFn(i)}</div>`).join('')}
      ${list.length < LIMITS[key] ? `<button type="button" class="ostech-btn ostech-btn--secondary cuatro-btn-sm" data-op="add" data-arr="${key}">+ Add ${title}</button>` : ''}`;
  }

  function formHtml(doc, open) {
    const d = doc.data;
    const sec = (id, title, body) => `<details class="rb-sec" data-sec="${id}"${open.has(id) ? ' open' : ''}><summary>${title}</summary><div class="rb-sec__body">${body}</div></details>`;
    return [
      sec('personal', 'Personal details', `<div class="rb-grid2">${fld(d, 'personal.full_name', 'Full name', { max: 100 })}${fld(d, 'personal.headline', 'Professional title', { max: 120, ph: 'e.g. Software Developer' })}
        ${fld(d, 'personal.email', 'Email', { type: 'email', max: 120 })}${fld(d, 'personal.phone', 'Phone', { type: 'tel', max: 40 })}
        ${fld(d, 'personal.location', 'Location', { max: 100 })}${fld(d, 'personal.linkedin', 'LinkedIn', { max: 200, ph: 'linkedin.com/in/yourname' })}
        ${fld(d, 'personal.github', 'GitHub / portfolio', { max: 200 })}${fld(d, 'personal.website', 'Website', { max: 200 })}</div>`),
      sec('summary', 'Summary / objective', fld(d, 'summary', 'Write 2 to 4 lines about you', { area: true, rows: 5, max: 1200, ph: 'Who you are, what you do well and what role you want.' })),
      sec('experience', 'Experience / internships', repeater(d, 'experience', 'experience', (x, i) => x.title || x.company || `Experience ${i + 1}`, (i) => `<div class="rb-grid2">
        ${fld(d, `experience.${i}.title`, 'Job title', { max: 120 })}${fld(d, `experience.${i}.company`, 'Company', { max: 120 })}
        ${fld(d, `experience.${i}.location`, 'Location', { max: 100 })}${fld(d, `experience.${i}.start`, 'Start (e.g. Jan 2024)', { max: 30 })}</div>
        <label class="rb-check"><input type="checkbox" data-path="experience.${i}.current"${d.experience[i].current ? ' checked' : ''}> I currently work here</label>
        ${d.experience[i].current ? '' : fld(d, `experience.${i}.end`, 'End (e.g. Jun 2025)', { max: 30 })}
        ${fld(d, `experience.${i}.bullets`, 'What you did (one achievement per line)', { area: true, rows: 5, max: 2000, help: 'Start with an action word and add numbers where you can.' })}`)),
      sec('education', 'Education', repeater(d, 'education', 'education', (x, i) => x.degree || x.school || `Education ${i + 1}`, (i) => `<div class="rb-grid2">
        ${fld(d, `education.${i}.degree`, 'Degree / course', { max: 150 })}${fld(d, `education.${i}.school`, 'College / school', { max: 150 })}
        ${fld(d, `education.${i}.location`, 'Location', { max: 100 })}${fld(d, `education.${i}.score`, 'Grade / CGPA / %', { max: 40 })}
        ${fld(d, `education.${i}.start`, 'Start year', { max: 30 })}${fld(d, `education.${i}.end`, 'End year', { max: 30 })}</div>
        ${fld(d, `education.${i}.details`, 'Extra details', { area: true, rows: 2, max: 600 })}`)),
      sec('projects', 'Projects', repeater(d, 'projects', 'project', (x, i) => x.name || `Project ${i + 1}`, (i) => `${fld(d, `projects.${i}.name`, 'Project name', { max: 120 })}
        <div class="rb-grid2">${fld(d, `projects.${i}.tech`, 'Technologies used', { max: 200 })}${fld(d, `projects.${i}.link`, 'Link', { max: 200 })}</div>
        ${fld(d, `projects.${i}.description`, 'Description', { area: true, rows: 3, max: 1000 })}`)),
      sec('skills', 'Skills', `<p class="cuatro-muted" style="font-size:13px">Group your skills (for example Languages, Tools). Separate items with commas. These skills also help job matching.</p>${repeater(d, 'skills', 'skill group', (x, i) => x.name || `Skill group ${i + 1}`, (i) => `${fld(d, `skills.${i}.name`, 'Group name', { max: 60, ph: 'e.g. Programming' })}${fld(d, `skills.${i}.items`, 'Skills (comma separated)', { max: 400, ph: 'Python, SQL, React' })}`)}`),
      sec('certifications', 'Certifications', repeater(d, 'certifications', 'certification', (x, i) => x.name || `Certification ${i + 1}`, (i) => `${fld(d, `certifications.${i}.name`, 'Certificate name', { max: 150 })}<div class="rb-grid2">${fld(d, `certifications.${i}.issuer`, 'Issued by', { max: 120 })}${fld(d, `certifications.${i}.year`, 'Year', { max: 20 })}</div>`)),
      sec('more', 'Achievements and languages', `${fld(d, 'achievements', 'Achievements (one per line)', { area: true, rows: 4, max: 1500 })}${fld(d, 'languages', 'Languages', { max: 200, ph: 'English, Hindi' })}`),
      sec('target', 'Target job (Targeted template)', `<p class="cuatro-muted" style="font-size:13px">Used by the <strong>Targeted Application</strong> template to tailor your resume to one role.</p>${fld(d, 'target.jobTitle', 'Job you are applying for', { max: 120 })}${fld(d, 'target.company', 'Company', { max: 120 })}${fld(d, 'target.keyQualifications', 'Why you fit (one point per line)', { area: true, rows: 4, max: 800 })}`)
    ].join('');
  }

  CT.on('student-resume-editor', () => CT.portalView(async (app) => {
    const id = parseInt(CT.qs().get('id'), 10);
    if (!id) { app.innerHTML = `<div class="cuatro-notice cuatro-notice--err">No resume selected. <a href="${P}/resume-builder">Back to Resume Builder</a></div>`; return; }
    const { document: doc } = await CT.api('GET', `${API}/documents/${id}`);
    const open = new Set(['personal', 'summary']);
    let dirty = false; let timer = null; let saving = false; let again = false;

    app.innerHTML = `<div class="rb-top">
        <a class="ostech-btn ostech-btn--secondary cuatro-btn-sm" href="${P}/resume-builder">&larr; All resumes</a>
        <div class="cuatro-form rb-title"><input type="text" id="rb-title" maxlength="100" aria-label="Resume name" value="${e(doc.title)}"></div>
        <select id="rb-template" aria-label="Template">${TEMPLATES.map((t) => `<option value="${t.id}"${t.id === doc.template ? ' selected' : ''}>${e(t.name)}</option>`).join('')}</select>
        <select id="rb-font" aria-label="Font"><option value="sans">Sans-serif</option><option value="serif">Serif</option><option value="rounded">Rounded headings</option></select>
        <input type="color" id="rb-accent" aria-label="Accent colour" title="Accent colour">
        <span class="rb-status" id="rb-status" role="status" aria-live="polite"></span>
        <button class="ostech-btn ostech-btn--secondary cuatro-btn-sm" id="rb-save">Save</button>
        <button class="ostech-btn cuatro-btn-sm" id="rb-pdf">Download PDF</button>
        <button class="ostech-btn ostech-btn--secondary cuatro-btn-sm" id="rb-use" title="Use this resume for job matching and applications">Use for job matching</button></div>
      <div class="rb-mobile-tabs"><button class="ostech-btn cuatro-btn-sm" data-view="edit">Edit</button><button class="ostech-btn ostech-btn--secondary cuatro-btn-sm" data-view="preview">Preview</button></div>
      <div class="rb-layout" id="rb-layout" data-view="edit"><div class="rb-form" id="rb-form"></div>
        <div class="rb-preview"><p class="rb-pages" id="rb-pages"></p><div class="rb-stage" id="rb-stage"><div class="rb-scale" id="rb-scale"></div></div>
        <p class="cuatro-muted" style="font-size:13px;margin-top:10px">To save a PDF, click <strong>Download PDF</strong> and choose <strong>Save as PDF</strong> as the destination. Turn off "Headers and footers" for a clean page.</p></div></div>`;

    const $ = (s) => app.querySelector(s);
    const form = $('#rb-form'); const stage = $('#rb-stage'); const scaleEl = $('#rb-scale'); const status = $('#rb-status');
    $('#rb-font').value = doc.data.settings.font;
    $('#rb-accent').value = doc.data.settings.accent;

    const setStatus = (msg, cls) => { status.textContent = msg; status.className = `rb-status ${cls || ''}`; };

    function preview() {
      scaleEl.innerHTML = renderResume(doc.template, doc.data);
      const w = stage.clientWidth - 36;
      if (w <= 0) return;
      const s = Math.min(1, w / PAGE_W);
      scaleEl.style.transform = `scale(${s})`;
      const el = scaleEl.firstChild;
      el.style.minHeight = '0';
      const natural = el.offsetHeight; // real content height, without the A4 minimum
      el.style.minHeight = '';
      const h = el.offsetHeight;
      scaleEl.style.width = `${PAGE_W}px`;
      stage.style.height = `${Math.ceil(h * s) + 36}px`;
      const pages = natural <= PAGE_H - 33 ? 1 : Math.ceil(natural / (PAGE_H - 33));
      const pe = $('#rb-pages');
      pe.textContent = pages === 1 ? 'Fits on 1 page' : `About ${pages} pages when printed. Shorten some sections for a one-page resume.`;
      pe.className = `rb-pages${pages > 1 ? ' warn' : ''}`;
    }

    function drawForm() {
      form.querySelectorAll('details').forEach((x) => { if (x.open) open.add(x.getAttribute('data-sec')); else open.delete(x.getAttribute('data-sec')); });
      form.innerHTML = formHtml(doc, open);
    }

    async function save(silent) {
      if (saving) { again = true; return; }
      saving = true; setStatus('Saving...');
      try {
        await CT.api('PUT', `${API}/documents/${id}`, { title: doc.title, template: doc.template, data: doc.data });
        dirty = false; setStatus('All changes saved', 'ok');
        if (!silent) CT.toast('Resume saved');
      } catch (err) {
        if (err.status === 401) return CT.toLogin();
        setStatus(err.message, 'err');
      }
      saving = false;
      if (again) { again = false; save(true); }
    }

    function changed() {
      dirty = true; setStatus('Unsaved changes...');
      clearTimeout(timer); timer = setTimeout(() => save(true), 1500);
      preview();
    }

    form.addEventListener('input', (ev) => {
      const t = ev.target; const path = t.getAttribute && t.getAttribute('data-path');
      if (!path) return;
      setPath(doc.data, path, t.type === 'checkbox' ? t.checked : t.value);
      if (t.type === 'checkbox') drawForm();
      changed();
    });
    form.addEventListener('change', (ev) => { if (ev.target.type === 'checkbox') { /* handled by input event */ } });
    form.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-op]'); if (!b) return;
      const key = b.getAttribute('data-arr'); const i = parseInt(b.getAttribute('data-i'), 10); const op = b.getAttribute('data-op');
      const arr = doc.data[key];
      if (op === 'add') arr.push(BLANK[key]());
      else if (op === 'del') arr.splice(i, 1);
      else if (op === 'up' && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
      else if (op === 'down' && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
      drawForm(); changed();
    });
    $('#rb-title').addEventListener('input', (ev) => { doc.title = ev.target.value; changed(); });
    $('#rb-template').addEventListener('change', (ev) => { doc.template = ev.target.value; changed(); });
    $('#rb-font').addEventListener('change', (ev) => { doc.data.settings.font = ev.target.value; changed(); });
    $('#rb-accent').addEventListener('input', (ev) => { doc.data.settings.accent = ev.target.value; changed(); });
    $('#rb-save').addEventListener('click', () => { clearTimeout(timer); save(false); });
    $('#rb-pdf').addEventListener('click', () => printResume(doc.template, doc.data, `${doc.data.personal.full_name || 'Resume'} - Resume`));
    $('#rb-use').addEventListener('click', async () => {
      clearTimeout(timer); await save(true);
      try {
        const r = await CT.api('POST', `${API}/documents/${id}/use-for-matching`, {});
        CT.toast(`Saved as your current resume. ${r.skills_found.length} skills detected.`);
      } catch (err) { CT.toast(err.message, true); }
    });
    app.querySelectorAll('.rb-mobile-tabs button').forEach((b) => b.addEventListener('click', () => {
      $('#rb-layout').setAttribute('data-view', b.getAttribute('data-view'));
      app.querySelectorAll('.rb-mobile-tabs button').forEach((x) => x.classList.toggle('ostech-btn--secondary', x !== b));
      preview();
    }));
    window.addEventListener('resize', preview);
    window.addEventListener('beforeunload', (ev) => { if (dirty) { ev.preventDefault(); ev.returnValue = ''; } });

    drawForm(); preview(); setStatus('All changes saved', 'ok');
  }));
})();
