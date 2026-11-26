/* Student Portal: authentication, dashboard, profile, resume, job matching, applications, notifications. */
(function () {
  'use strict';
  const CT = window.CT;
  const e = CT.esc;
  const P = '/student-portal';

  // ------------------------------------------------------------------ authentication pages
  function initLogin() {
    // "Forgot password?" e-mails the reset link to the address already typed in the login form.
    const forgot = document.getElementById('forgot-link');
    const loginForm = document.getElementById('login-form');
    if (forgot && loginForm) {
      forgot.addEventListener('click', (ev) => {
        ev.preventDefault();
        const emailInput = loginForm.elements.email;
        const st = loginForm.querySelector('.cf-status');
        const holder = loginForm.querySelector('[data-error-for="email"]');
        CT.clearErrors(loginForm);
        const addr = emailInput.value.trim();
        if (!addr || !emailInput.checkValidity()) {
          if (holder) holder.textContent = 'Type your account email here, then click "Forgot password?" again.';
          emailInput.classList.add('is-invalid'); emailInput.focus();
          return;
        }
        if (forgot.dataset.busy) return;
        forgot.dataset.busy = '1'; forgot.textContent = 'Sending reset link...';
        CT.api('POST', '/api/auth/student/forgot-password', { email: addr })
          .then((res) => { st.textContent = res.message; st.className = 'cf-status ok'; })
          .catch((err) => CT.showErrors(loginForm, err))
          .then(() => { delete forgot.dataset.busy; forgot.textContent = 'Forgot password?'; });
      });
    }
    CT.bindForm(document.getElementById('login-form'),
      (v) => CT.api('POST', '/api/auth/student/login', { email: v.email, password: v.password }),
      (res) => { CT.setCsrf(res.csrfToken); location.href = CT.safeNext(P + '/dashboard'); });
  }

  function initRegister() {
    const form = document.getElementById('register-form');
    const email = document.getElementById('f-email');
    const codeRow = document.getElementById('code-row');
    const code = document.getElementById('f-code');
    const tokenInput = document.getElementById('f-verify-token');
    const msg = document.getElementById('verify-msg');
    const sendBtn = document.getElementById('send-code');
    const verifyBtn = document.getElementById('verify-code');
    let verifiedEmail = '';
    let cooldown = null;
    const say = (text, ok) => { msg.textContent = text; msg.className = 'cx-verify__msg ' + (ok ? 'ok' : 'err'); };
    const fieldErr = (name, text) => { const h = form.querySelector('[data-error-for="' + name + '"]'); if (h) h.textContent = text || ''; };
    const startCooldown = () => {
      let s = 60; sendBtn.disabled = true;
      clearInterval(cooldown);
      cooldown = setInterval(() => {
        s -= 1; sendBtn.querySelector('span').textContent = s > 0 ? 'Resend in ' + s + 's' : 'Resend Code';
        if (s <= 0) { clearInterval(cooldown); sendBtn.disabled = false; }
      }, 1000);
    };
    // changing the address after verification cancels it
    email.addEventListener('input', () => {
      if (verifiedEmail && email.value.trim().toLowerCase() !== verifiedEmail) {
        verifiedEmail = ''; tokenInput.value = ''; email.readOnly = false;
        form.classList.remove('cx-verified'); say('Email changed. Please verify the new address.', false);
      }
    });
    sendBtn.addEventListener('click', () => {
      fieldErr('email'); fieldErr('code');
      const addr = email.value.trim();
      if (!email.checkValidity() || !addr) { fieldErr('email', 'Enter a valid email address.'); email.focus(); return; }
      sendBtn.disabled = true; say('Sending code...', true);
      CT.api('POST', '/api/auth/student/register/send-code', { email: addr }).then((res) => {
        say(res.message, true); codeRow.hidden = false; code.value = ''; code.focus(); startCooldown();
      }).catch((err) => {
        sendBtn.disabled = false; say(err.message, false);
        if (err.fields && err.fields.email) fieldErr('email', err.fields.email);
      });
    });
    const doVerify = () => {
      fieldErr('code');
      const c = code.value.replace(/\s+/g, '');
      if (!/^\d{6}$/.test(c)) { fieldErr('code', 'Enter the 6-digit code from the email.'); code.focus(); return; }
      verifyBtn.disabled = true;
      CT.api('POST', '/api/auth/student/register/verify-code', { email: email.value.trim(), code: c }).then((res) => {
        tokenInput.value = res.verifyToken; verifiedEmail = email.value.trim().toLowerCase();
        email.readOnly = true; codeRow.hidden = true; clearInterval(cooldown);
        sendBtn.disabled = true; sendBtn.querySelector('span').textContent = 'Verified';
        form.classList.add('cx-verified'); fieldErr('email'); const st = form.querySelector('.cf-status'); if (st) { st.textContent = ''; st.className = 'cf-status'; } say('Email verified. Complete the form below to create your account.', true);
      }).catch((err) => { say(err.message, false); if (err.fields && err.fields.code) fieldErr('code', err.fields.code); })
        .then(() => { verifyBtn.disabled = false; });
    };
    verifyBtn.addEventListener('click', doVerify);
    code.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); doVerify(); } });

    CT.bindForm(form, (v) => {
      delete v.code;
      if (!v.verify_token) { const err = new Error('Please verify your email address first.'); err.fields = { email: 'Click "Send Code" and enter the code from your email.' }; throw err; }
      if (!v.terms) { const err = new Error('Please correct the highlighted fields.'); err.fields = { terms: 'Please accept to continue.' }; throw err; }
      delete v.terms;
      return CT.api('POST', '/api/auth/student/register', v);
    }, (res) => { CT.setCsrf(res.csrfToken); location.href = P + '/profile?welcome=1'; });
  }

  // Job Seeker page: Login / Sign Up tabs on one card
  function initJobSeeker(defaultTab) {
    const card = document.querySelector('.cx-auth__card');
    if (!card) return;
    const texts = {
      login: ['Welcome Back', 'Sign in to your Job Seeker account', 'Job Seeker Login'],
      signup: ['Create Your Account', 'Verify your email, then set your password', 'Job Seeker Sign Up']
    };
    const show = (tab, focus) => {
      card.setAttribute('data-tab', tab);
      card.querySelectorAll('.cx-tabs__btn').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
      document.getElementById('panel-login').hidden = tab !== 'login';
      document.getElementById('panel-signup').hidden = tab !== 'signup';
      document.getElementById('auth-title').textContent = texts[tab][0];
      document.getElementById('auth-sub').textContent = texts[tab][1];
      document.title = texts[tab][2] + ' || Cuatro Tech Solutions';
      const path = tab === 'login' ? P + '/login' : P + '/register';
      if (location.pathname.replace(/\.html$/, '') !== path) history.replaceState(null, '', path + location.search);
      if (focus) { const first = document.querySelector('#panel-' + tab + ' input:not([type=hidden])'); if (first) first.focus(); }
    };
    card.querySelectorAll('.cx-tabs__btn').forEach((b) => b.addEventListener('click', () => show(b.dataset.tab, true)));
    card.querySelectorAll('[data-switch]').forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); show(a.dataset.switch, true); }));
    // arrow keys move between tabs
    card.querySelector('.cx-tabs').addEventListener('keydown', (ev) => {
      if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
      const next = card.getAttribute('data-tab') === 'login' ? 'signup' : 'login';
      show(next, false); document.getElementById('tab-' + next).focus();
    });
    // show / hide password
    card.querySelectorAll('.cx-eye').forEach((btn) => btn.addEventListener('click', () => {
      const inp = btn.parentElement.querySelector('input');
      const on = inp.type === 'password';
      inp.type = on ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? 'Hide password' : 'Show password');
      btn.classList.toggle('is-on', on);
    }));
    show(defaultTab, false);
    initLogin();
    initRegister();
  }
  CT.on('student-login', () => initJobSeeker('login'));
  CT.on('student-register', () => initJobSeeker('signup'));

  CT.on('student-forgot', () => {
    CT.bindForm(document.getElementById('forgot-form'), (v) => CT.api('POST', '/api/auth/student/forgot-password', v),
      (res, f) => { const st = f.querySelector('.cf-status'); st.textContent = res.message; st.className = 'cf-status ok'; f.reset(); });
  });

  CT.on('student-reset', () => {
    const token = CT.qs().get('token') || '';
    CT.bindForm(document.getElementById('reset-form'), (v) => CT.api('POST', '/api/auth/student/reset-password', { token, password: v.password, confirm_password: v.confirm_password }),
      (res, f) => {
        const st = f.querySelector('.cf-status'); st.textContent = res.message + ' Redirecting to login...'; st.className = 'cf-status ok';
        setTimeout(() => { location.href = P + '/login'; }, 1800);
      });
  });

  // ------------------------------------------------------------------ helpers
  const title = (t, lead) => `<h2 class="cuatro-app__title">${t}</h2>${lead ? `<p class="cuatro-app__lead">${lead}</p>` : ''}`;
  const meter = (n) => `<div class="cuatro-meter" role="progressbar" aria-valuenow="${n}" aria-valuemin="0" aria-valuemax="100"><span data-w="${n}"></span></div>`;
  const animateMeters = (root) => requestAnimationFrame(() => root.querySelectorAll('.cuatro-meter > span').forEach((s) => { s.style.width = s.getAttribute('data-w') + '%'; }));

  function view(render) {
    return CT.portalView(async (app, user) => {
      await render(app, user);
      animateMeters(app);
      CT.api('GET', '/api/student/notifications').then((n) => {
        const b = document.getElementById('nav-unread');
        if (b && n.unread) { b.hidden = false; b.textContent = n.unread; }
      }).catch(() => {});
    });
  }

  function recoItem(r, withApply = true) {
    const m = r.match; const j = r.job;
    const why = (m.reasons || []).slice(0, 2).map((x) => `<li>${e(x)}</li>`).join('');
    return `<article class="cuatro-reco__item">
      <p class="cuatro-job__cat">${e(j.category)}</p>
      <h4><a href="${P}/job-match?id=${j.id}">${e(j.title)}</a></h4>
      <div class="cuatro-score"><span class="cuatro-score__num">${m.score}%</span><div class="cuatro-score__body">${meter(m.score)}<small class="cuatro-muted">Match score</small></div></div>
      <p class="cuatro-muted" style="margin:8px 0 0"><strong>Matching skills</strong></p>${CT.skillTags(m.matching_skills, 'cuatro-tag--ok')}
      ${m.missing_skills.length ? `<p class="cuatro-muted" style="margin:0"><strong>Skills to improve</strong></p>${CT.skillTags(m.missing_skills, 'cuatro-tag--miss')}` : ''}
      ${why ? `<p class="cuatro-muted" style="margin:0"><strong>Why recommended</strong></p><ul class="cuatro-muted" style="margin:4px 0 12px 18px">${why}</ul>` : ''}
      <div class="cuatro-inline">
        <a class="ostech-btn ostech-btn--secondary cuatro-btn-sm" href="${P}/job-match?id=${j.id}">Inspect match</a>
        ${r.applied ? '<span class="cuatro-badge cuatro-badge--selected">Applied</span>' : (withApply ? `<a class="ostech-btn cuatro-btn-sm" href="${P}/apply?job=${j.id}">Apply Now</a>` : '')}
      </div></article>`;
  }

  const insufficient = (msg) => `<div class="cuatro-notice">${e(msg || 'We need more information to recommend jobs.')}
      <div class="cuatro-mt"><a class="ostech-btn cuatro-btn-sm" href="${P}/profile">Complete profile</a> <a class="ostech-btn ostech-btn--secondary cuatro-btn-sm" href="${P}/resume">Upload resume</a></div></div>`;

  // ------------------------------------------------------------------ dashboard
  CT.on('student-dashboard', () => view(async (app, user) => {
    const d = await CT.api('GET', '/api/student/dashboard');
    const c = d.counts;
    const rec = d.recommended;
    app.innerHTML = `${title(`Welcome, ${e(user.name.split(' ')[0])}`, 'Here is a summary of your profile, resume and applications.')}
      <div class="cuatro-stats">
        <div class="cuatro-stat"><strong>${c.total}</strong><span>Total applications</span></div>
        <div class="cuatro-stat"><strong>${c.under_review}</strong><span>Under review</span></div>
        <div class="cuatro-stat"><strong>${c.shortlisted}</strong><span>Shortlisted</span></div>
        <div class="cuatro-stat"><strong>${c.interviews}</strong><span>Interview invitations</span></div>
      </div>
      <div class="row gutter-y-30">
        <div class="col-xl-6"><div class="cuatro-box" style="height:100%"><h3>My profile</h3>
          <p class="cuatro-muted">Profile completeness: <strong>${d.completeness}%</strong></p>${meter(d.completeness)}
          <dl class="cuatro-kv cuatro-mt"><dt>Name</dt><dd>${e(d.profile.full_name)}</dd><dt>Email</dt><dd>${e(d.profile.email)}</dd>
          <dt>College</dt><dd>${e(d.profile.college || 'Not added')}</dd><dt>Degree</dt><dd>${e([d.profile.degree, d.profile.specialisation].filter(Boolean).join(', ') || 'Not added')}</dd></dl>
          <a class="ostech-btn ostech-btn--secondary cuatro-btn-sm cuatro-mt" href="${P}/profile">Update profile</a></div></div>
        <div class="col-xl-6"><div class="cuatro-box" style="height:100%"><h3>Resume status</h3>
          ${d.resume ? `<p><strong>${e(d.resume.original_name)}</strong><br><span class="cuatro-muted">Uploaded ${CT.fmtDate(d.resume.uploaded_at, true)} &middot; ${e(d.resume.status)}</span></p>${CT.skillTags(d.resume.skills_found.slice(0, 10), 'cuatro-tag--ok')}`
            : '<div class="cuatro-notice">No resume uploaded yet. Upload one to receive job recommendations.</div>'}
          <a class="ostech-btn cuatro-btn-sm cuatro-mt" href="${P}/resume">${d.resume ? 'Replace resume' : 'Upload resume'}</a></div></div>
      </div>
      <div class="cuatro-box"><div class="cuatro-box__head"><h3>Recommended jobs</h3><a class="cuatro-btn-link" href="${P}/find-jobs?tab=recommended">View all</a></div>
        ${rec.sufficient ? (rec.results.length ? `<div class="cuatro-reco">${rec.results.map((r) => recoItem(r)).join('')}</div>` : '<p class="cuatro-muted">No open jobs to match right now. Check back soon.</p>') : insufficient(rec.message)}</div>
      <div class="row gutter-y-30"><div class="col-xl-6"><div class="cuatro-box" style="height:100%"><h3>Application outcomes</h3>
        <dl class="cuatro-kv"><dt>Selected</dt><dd>${c.selected}</dd><dt>Not selected</dt><dd>${c.rejected}</dd></dl>
        <a class="cuatro-btn-link" href="${P}/applications">View my applications</a></div></div>
      <div class="col-xl-6"><div class="cuatro-box" style="height:100%"><div class="cuatro-box__head"><h3>Recent notifications</h3><a class="cuatro-btn-link" href="${P}/notifications">View all</a></div>
        ${d.notifications.length ? d.notifications.map((n) => `<div class="cuatro-notif cuatro-notif--${n.is_read ? 'read' : 'unread'}"><span class="cuatro-notif__dot"></span><div><h4>${e(n.title)}</h4><p>${e(n.message)}</p><time>${CT.fmtDate(n.created_at, true)}</time></div></div>`).join('') : '<p class="cuatro-muted">No notifications yet.</p>'}</div></div></div>`;
  }));

  // ------------------------------------------------------------------ profile
  CT.on('student-profile', () => view(async (app) => {
    const { profile: p, completeness } = await CT.api('GET', '/api/student/profile');
    const welcome = CT.qs().get('welcome');
    const f = (name, label, type = 'text', col = 'cf-col-6', extra = '') => `<div class="cf-group ${col}"><label for="f-${name}">${label}</label><input id="f-${name}" name="${name}" type="${type}" value="${e(p[name] === null || p[name] === undefined ? '' : p[name])}" ${extra}><div class="cf-error" data-error-for="${name}"></div></div>`;
    app.innerHTML = `${title('My Profile', 'Keep your details up to date. Your skills and education are used to calculate job matches.')}
      ${welcome ? '<div class="cuatro-notice cuatro-notice--ok">Your account has been created. Complete your profile, then upload your resume to get job recommendations.</div>' : ''}
      <div class="cuatro-box"><p class="cuatro-muted">Profile completeness: <strong id="pc">${completeness}%</strong></p>${meter(completeness)}</div>
      <div class="cuatro-box"><form class="cuatro-form" id="profile-form" novalidate><div class="cf-row">
        ${f('full_name', 'Full name', 'text', 'cf-col-6', 'required')}
        <div class="cf-group cf-col-6"><label for="f-email">Email address</label><input id="f-email" type="email" value="${e(p.email)}" disabled><small class="cf-help">Your email is your login and cannot be changed here.</small></div>
        ${f('contact_number', 'Contact number', 'tel', 'cf-col-6', 'required')}
        ${f('location', 'Location')}
        ${f('college', 'College / University')}
        ${f('degree', 'Degree')}
        ${f('specialisation', 'Course / Specialisation')}
        ${f('graduation_year', 'Graduation year', 'number', 'cf-col-6', 'min="1970" max="2100" required')}
        <div class="cf-group cf-col-12"><label for="f-skills">Skills</label><input id="f-skills" name="skills" type="text" value="${e(p.skills || '')}" placeholder="Comma separated, e.g. Python, SQL, Figma"><div class="cf-error" data-error-for="skills"></div></div>
        ${f('experience_years', 'Years of experience', 'number', 'cf-col-6', 'min="0" max="50" step="0.5"')}
        <div class="cf-group cf-col-12"><label for="f-experience">Experience</label><textarea id="f-experience" name="experience" rows="4" maxlength="2000">${e(p.experience || '')}</textarea><div class="cf-error" data-error-for="experience"></div></div>
      </div><div class="cf-status" role="status" aria-live="polite"></div>
      <button type="submit" class="ostech-btn">Save profile</button></form></div>`;
    CT.bindForm(document.getElementById('profile-form'), (v) => CT.api('PUT', '/api/student/profile', v), (res, form) => {
      const st = form.querySelector('.cf-status'); st.textContent = 'Profile saved.'; st.className = 'cf-status ok';
      document.getElementById('pc').textContent = res.completeness + '%';
      CT.toast('Profile saved');
    });
  }));

  // ------------------------------------------------------------------ resume
  CT.on('student-resume', () => view(async (app) => {
    const render = async () => {
      const { resume, max_mb: maxMb } = await CT.api('GET', '/api/student/resume');
      app.innerHTML = `${title('My Resume', 'Upload your resume so we can extract your skills and recommend suitable jobs. Do not have one yet? <a href="/student-portal/resume-builder"><strong>Create it with Resume Builder</strong></a>.')}
        <div class="cuatro-box"><h3>Current resume</h3>
          ${resume ? `<dl class="cuatro-kv"><dt>File name</dt><dd>${e(resume.original_name)}</dd><dt>Uploaded</dt><dd>${CT.fmtDate(resume.uploaded_at, true)}</dd><dt>Size</dt><dd>${CT.fmtSize(resume.file_size)}</dd><dt>Status</dt><dd>${e(resume.status)}</dd>
            <dt>Skills detected</dt><dd>${CT.skillTags(resume.skills_found, 'cuatro-tag--ok')}</dd></dl>
            <a class="ostech-btn ostech-btn--secondary cuatro-btn-sm cuatro-mt" href="/api/student/resume/download">Download</a>`
            : '<div class="cuatro-notice">You have not uploaded a resume yet.</div>'}</div>
        <div class="cuatro-box"><h3>${resume ? 'Replace resume' : 'Upload resume'}</h3>
          <form class="cuatro-form" id="resume-form" novalidate><div class="cuatro-dropzone"><div class="cf-group" style="margin:0"><label for="f-resume">Choose a PDF, DOCX or TXT file (max ${maxMb} MB)</label>
          <input id="f-resume" name="resume" type="file" accept=".pdf,.docx,.txt"><div class="cf-error" data-error-for="resume"></div></div></div>
          <div class="cf-status" role="status" aria-live="polite"></div><button type="submit" class="ostech-btn cuatro-mt">Upload</button></form></div>
        <p class="cuatro-muted">Your resume is stored privately. Only you and authorised Cuatro recruiters can open it.</p>`;
      const form = document.getElementById('resume-form');
      CT.bindForm(form, async () => {
        const file = form.elements.resume.files[0];
        const fail = (m) => { const err = new Error(m); err.fields = { resume: m }; throw err; };
        if (!file) fail('Please choose a file to upload.');
        if (!/\.(pdf|docx|txt)$/i.test(file.name)) fail('Only PDF, DOCX and TXT files are supported.');
        if (file.size > maxMb * 1048576) fail(`The file is larger than ${maxMb} MB.`);
        const fd = new FormData(); fd.append('resume', file);
        return CT.api('POST', '/api/student/resume', undefined, { formData: fd });
      }, async (res) => { CT.toast(res.warning || 'Resume uploaded. Your recommendations have been updated.', !!res.warning); await render(); animateMeters(app); });
    };
    await render();
  }));

  // ------------------------------------------------------------------ find jobs
  CT.on('student-find-jobs', () => view(async (app) => {
    const meta = await CT.api('GET', '/api/meta');
    let tab = CT.qs().get('tab') === 'all' ? 'all' : 'recommended';
    const draw = async () => {
      let body = '';
      if (tab === 'recommended') {
        const rec = await CT.api('GET', '/api/student/recommendations');
        body = rec.sufficient
          ? (rec.results.length ? `<p class="cuatro-muted">Ranked by match percentage, calculated from your profile and resume.</p><div class="cuatro-reco">${rec.results.map((r) => recoItem(r)).join('')}</div>` : '<div class="cuatro-box cuatro-empty">No open jobs are available to match right now.</div>')
          : insufficient(rec.message);
      } else {
        body = `<form class="cuatro-toolbar" id="all-filter"><input type="search" name="keyword" placeholder="Search title or keyword" aria-label="Keyword"><select name="category" aria-label="Category"><option value="">All categories</option>${meta.categories.map((c) => `<option value="${c.id}">${e(c.name)}</option>`).join('')}</select><button class="ostech-btn cuatro-btn-sm" type="submit">Search</button></form><div id="all-list"></div>`;
      }
      app.innerHTML = `${title('Find Jobs')}<div class="cuatro-tabs" role="tablist"><button type="button" data-tab="recommended" class="${tab === 'recommended' ? 'active' : ''}" role="tab">Recommended for me</button><button type="button" data-tab="all" class="${tab === 'all' ? 'active' : ''}" role="tab">All open jobs</button></div>${body}`;
      app.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.getAttribute('data-tab'); history.replaceState(null, '', `${P}/find-jobs?tab=${tab}`); draw(); }));
      if (tab === 'all') {
        const form = document.getElementById('all-filter');
        const load = async () => {
          const q = new URLSearchParams({ pageSize: 50 });
          if (form.keyword.value.trim()) q.set('keyword', form.keyword.value.trim());
          if (form.category.value) q.set('category', form.category.value);
          const res = await CT.api('GET', '/api/jobs?' + q.toString());
          document.getElementById('all-list').innerHTML = res.jobs.length ? `<div class="cuatro-box"><div class="cuatro-table-wrap"><table class="cuatro-table"><thead><tr><th>Job</th><th>Category</th><th>Location</th><th>Type</th><th></th></tr></thead><tbody>${res.jobs.map((j) => `<tr><td><a href="${P}/job-match?id=${j.id}">${e(j.title)}</a>${j.is_demo ? ' <span class="cuatro-badge cuatro-badge--demo">Demo</span>' : ''}</td><td>${e(j.category)}</td><td>${e(j.location)}</td><td>${e(j.employment_type)}</td><td><a class="ostech-btn cuatro-btn-sm" href="${P}/apply?job=${j.id}">Apply</a></td></tr>`).join('')}</tbody></table></div></div>` : '<div class="cuatro-box cuatro-empty">No jobs found.</div>';
        };
        form.addEventListener('submit', (ev) => { ev.preventDefault(); load(); });
        await load();
      }
      animateMeters(app);
    };
    await draw();
  }));

  // ------------------------------------------------------------------ job match details
  CT.on('student-job-match', () => view(async (app) => {
    const id = parseInt(CT.qs().get('id'), 10);
    if (!id) { app.innerHTML = '<div class="cuatro-notice cuatro-notice--err">No job selected.</div>'; return; }
    const res = await CT.api('GET', `/api/student/jobs/${id}/match`);
    const j = res.job; const m = res.match;
    const applyBtn = res.applied ? `<a class="ostech-btn ostech-btn--secondary" href="${P}/application-details?id=${encodeURIComponent(res.applied)}">Already applied (${e(res.applied)})</a>`
      : (j.accepting ? `<a class="ostech-btn" href="${P}/apply?job=${j.id}">Apply Now</a>` : '<span class="cuatro-badge cuatro-badge--closed">Applications closed</span>');
    const labels = { skills: 'Skills', keywords: 'Keywords', qualification: 'Qualification', experience: 'Experience', category: 'Category fit' };
    app.innerHTML = `${title(e(j.title), `${e(j.category)} &middot; ${e(j.location)} &middot; ${e(j.employment_type)}`)}
      ${j.is_demo ? '<div class="cuatro-notice">Demonstration listing. This record is not a live vacancy.</div>' : ''}
      <div class="cuatro-box"><h3>Your match</h3>
        ${res.sufficient ? `<div class="cuatro-score"><span class="cuatro-score__num">${m.score}%</span><div class="cuatro-score__body">${meter(m.score)}</div></div>
          <div class="cuatro-breakdown">${Object.keys(m.breakdown).map((k) => `<div class="cuatro-breakdown__row"><span>${labels[k] || k}</span>${meter(m.breakdown[k].score)}<span>${m.breakdown[k].score}%</span></div>`).join('')}</div>
          <p class="cuatro-muted" style="margin-top:12px"><small>Weights are re-balanced across the criteria that apply to this job.</small></p>
          <h4 class="cuatro-subhead">Matching skills</h4>${CT.skillTags(m.matching_skills, 'cuatro-tag--ok')}
          <h4 class="cuatro-subhead">Skills to improve</h4>${CT.skillTags(m.missing_skills, 'cuatro-tag--miss')}
          <h4 class="cuatro-subhead">Additional skills you have</h4>${CT.skillTags(m.additional_skills, 'cuatro-tag--extra')}
          <h4 class="cuatro-subhead">Why this score</h4><ul class="cuatro-muted" style="margin-left:18px">${m.reasons.map((r) => `<li>${e(r)}</li>`).join('')}</ul>`
          : insufficient(res.message)}
        <div class="cuatro-mt">${applyBtn}</div></div>
      <div class="cuatro-box"><h3>Job requirements</h3><dl class="cuatro-kv">
        <dt>Description</dt><dd>${e(j.description)}</dd>
        <dt>Required skills</dt><dd>${CT.skillTags(j.skills)}</dd>
        <dt>Qualifications</dt><dd>${j.qualifications.length ? j.qualifications.map(e).join('<br>') : 'Not specified'}</dd>
        <dt>Responsibilities</dt><dd>${j.responsibilities.length ? j.responsibilities.map(e).join('<br>') : 'Not specified'}</dd>
        <dt>Experience</dt><dd>${e(j.experience_level || 'Not specified')}</dd>
        <dt>Deadline</dt><dd>${j.deadline ? CT.fmtDate(j.deadline) : 'Open until filled'}</dd></dl></div>`;
  }));

  // ------------------------------------------------------------------ apply
  CT.on('student-apply', () => view(async (app, user) => {
    const id = parseInt(CT.qs().get('job'), 10);
    if (!id) { app.innerHTML = '<div class="cuatro-notice cuatro-notice--err">No job selected. <a href="/careers.html">Browse jobs</a></div>'; return; }
    const [res, prof, rs] = await Promise.all([CT.api('GET', `/api/student/jobs/${id}/match`), CT.api('GET', '/api/student/profile'), CT.api('GET', '/api/student/resume')]);
    const j = res.job; const p = prof.profile; const resume = rs.resume;
    if (res.applied) { app.innerHTML = `${title('Apply for ' + e(j.title))}<div class="cuatro-notice">You have already applied for this job. <a href="${P}/application-details?id=${encodeURIComponent(res.applied)}">View application ${e(res.applied)}</a></div>`; return; }
    if (!j.accepting) { app.innerHTML = `${title('Apply for ' + e(j.title))}<div class="cuatro-notice cuatro-notice--err">This job is closed or past its application deadline and cannot receive new applications.</div>`; return; }
    if (!resume) { app.innerHTML = `${title('Apply for ' + e(j.title))}<div class="cuatro-notice">Please upload your resume before applying.<div class="cuatro-mt"><a class="ostech-btn cuatro-btn-sm" href="${P}/resume">Upload resume</a></div></div>`; return; }

    const val = (n) => e(p[n] || '');
    app.innerHTML = `${title('Apply for ' + e(j.title), `${e(j.category)} &middot; ${e(j.location)}`)}
      ${j.is_demo ? '<div class="cuatro-notice">This is a demonstration listing, not a live vacancy. Applications are saved for testing.</div>' : ''}
      ${res.sufficient ? `<div class="cuatro-box"><div class="cuatro-score"><span class="cuatro-score__num">${res.match.score}%</span><div class="cuatro-score__body">${meter(res.match.score)}<small class="cuatro-muted">Your match for this role</small></div></div></div>` : ''}
      <div id="apply-step"></div>`;
    const step = document.getElementById('apply-step');

    const drawForm = (data) => {
      step.innerHTML = `<div class="cuatro-box"><h3>Your application</h3><form class="cuatro-form" id="apply-form" novalidate><div class="cf-row">
        <div class="cf-group cf-col-6"><label for="f-applicant_name">Candidate name</label><input id="f-applicant_name" name="applicant_name" type="text" value="${e(data.applicant_name)}" required><div class="cf-error" data-error-for="applicant_name"></div></div>
        <div class="cf-group cf-col-6"><label for="f-applicant_email">Email</label><input id="f-applicant_email" name="applicant_email" type="email" value="${e(data.applicant_email)}" required><div class="cf-error" data-error-for="applicant_email"></div></div>
        <div class="cf-group cf-col-6"><label for="f-applicant_phone">Contact number</label><input id="f-applicant_phone" name="applicant_phone" type="tel" value="${e(data.applicant_phone)}" required><div class="cf-error" data-error-for="applicant_phone"></div></div>
        <div class="cf-group cf-col-6"><label>Selected job</label><input type="text" value="${e(j.title)}" disabled></div>
        <div class="cf-group cf-col-12"><label>Resume</label><input type="text" value="${e(resume.original_name)} (uploaded ${CT.fmtDate(resume.uploaded_at)})" disabled><small class="cf-help">Your current resume will be attached. <a href="${P}/resume">Replace resume</a></small></div>
        <div class="cf-group cf-col-12"><label for="f-cover_letter">Cover letter (optional)</label><textarea id="f-cover_letter" name="cover_letter" maxlength="4000">${e(data.cover_letter)}</textarea><div class="cf-error" data-error-for="cover_letter"></div></div>
        <div class="cf-group cf-col-12"><label for="f-relevant_info">Relevant information</label><textarea id="f-relevant_info" name="relevant_info" maxlength="2000" style="height:110px">${e(data.relevant_info)}</textarea><div class="cf-error" data-error-for="relevant_info"></div></div>
      </div><div class="cf-status" role="status"></div><button class="ostech-btn" type="submit">Review application</button></form></div>`;
      CT.bindForm(document.getElementById('apply-form'), async (v) => {
        const errs = {};
        if (v.applicant_name.trim().length < 2) errs.applicant_name = 'Enter your full name.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.applicant_email)) errs.applicant_email = 'Enter a valid email address.';
        if (!/^\+?[0-9][0-9\s\-()]{6,18}[0-9]$/.test(v.applicant_phone)) errs.applicant_phone = 'Enter a valid contact number.';
        if (Object.keys(errs).length) { const err = new Error('Please correct the highlighted fields.'); err.fields = errs; throw err; }
        return v;
      }, (v) => drawSummary(v));
    };

    const drawSummary = (v) => {
      step.innerHTML = `<div class="cuatro-box"><h3>Review your application</h3><div class="cuatro-summary"><dl class="cuatro-kv">
        <dt>Job</dt><dd>${e(j.title)} (${e(j.category)})</dd><dt>Name</dt><dd>${e(v.applicant_name)}</dd><dt>Email</dt><dd>${e(v.applicant_email)}</dd><dt>Contact number</dt><dd>${e(v.applicant_phone)}</dd>
        <dt>Resume</dt><dd>${e(resume.original_name)}</dd><dt>Cover letter</dt><dd>${v.cover_letter ? e(v.cover_letter).replace(/\n/g, '<br>') : 'None'}</dd><dt>Relevant information</dt><dd>${v.relevant_info ? e(v.relevant_info).replace(/\n/g, '<br>') : 'None'}</dd></dl></div>
        <form id="confirm-form" class="cuatro-form"><label class="cf-check"><input type="checkbox" name="confirmed"> <span>I confirm that the information above is correct and I want to submit this application.</span></label>
        <div class="cf-error" data-error-for="confirmed"></div><div class="cf-status" role="status"></div>
        <div class="cuatro-inline cuatro-mt"><button type="button" class="ostech-btn ostech-btn--secondary" id="edit-app">Edit</button><button type="submit" class="ostech-btn">Submit application</button></div></form></div>`;
      document.getElementById('edit-app').addEventListener('click', () => drawForm(v));
      CT.bindForm(document.getElementById('confirm-form'), (c) => {
        if (!c.confirmed) { const err = new Error('Please confirm before submitting.'); err.fields = { confirmed: 'Please tick the confirmation box.' }; throw err; }
        return CT.api('POST', '/api/student/applications', Object.assign({}, v, { job_id: j.id, confirmed: true }));
      }, (r) => {
        step.innerHTML = `<div class="cuatro-box cuatro-success-screen"><h3>Application submitted</h3><p class="cuatro-muted">Thank you. Your application for <strong>${e(r.job_title)}</strong> has been received.</p>
          <div class="code">${e(r.application_id)}</div><p class="cuatro-muted">Keep this application ID for your records.</p>
          <a class="ostech-btn" href="${P}/application-details?id=${encodeURIComponent(r.application_id)}">Track application</a>
          <a class="ostech-btn ostech-btn--secondary cuatro-ml" href="${P}/find-jobs">Find more jobs</a></div>`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    };

    drawForm({ applicant_name: user.name, applicant_email: p.email, applicant_phone: p.contact_number || '', cover_letter: '', relevant_info: '' });
    void val;
  }));

  // ------------------------------------------------------------------ applications
  CT.on('student-applications', () => view(async (app) => {
    const { applications } = await CT.api('GET', '/api/student/applications');
    app.innerHTML = `${title('My Applications', 'Track every application you have submitted.')}
      <div class="cuatro-box">${applications.length ? `<div class="cuatro-table-wrap"><table class="cuatro-table"><thead><tr><th>Application ID</th><th>Job</th><th>Category</th><th>Applied</th><th>Status</th><th>Last updated</th></tr></thead><tbody>
        ${applications.map((a) => `<tr><td><a href="${P}/application-details?id=${encodeURIComponent(a.application_id)}">${e(a.application_id)}</a></td><td>${e(a.job_title)}</td><td>${e(a.category)}</td><td>${CT.fmtDate(a.applied_at)}</td><td>${CT.badge(a.status)}</td><td>${CT.fmtDate(a.updated_at, true)}</td></tr>`).join('')}</tbody></table></div>`
        : `<div class="cuatro-empty"><p>You have not applied for any jobs yet.</p><a class="ostech-btn" href="${P}/find-jobs">Find jobs</a></div>`}</div>`;
  }));

  function timeline(status, history) {
    const reached = {}; history.forEach((h) => { reached[h.new_status] = true; });
    const stages = [{ k: 'Application Submitted' }, { k: 'Under Review' }, { k: 'Shortlisted' }];
    if (reached['Assessment Pending']) stages.push({ k: 'Assessment Pending' });
    stages.push({ k: 'Interview Scheduled' }, { k: 'Interview Completed' }, { k: 'Final Decision', final: true });
    const idx = (s) => {
      if (s === 'Selected' || s === 'Rejected') return stages.length - 1;
      return stages.findIndex((x) => x.k === s);
    };
    let cur = idx(status);
    if (status === 'Withdrawn') {
      const last = history.filter((h) => h.new_status !== 'Withdrawn').map((h) => idx(h.new_status)).filter((i) => i >= 0);
      cur = last.length ? Math.max.apply(null, last) : 0;
    }
    const outcome = status === 'Selected' ? 'good' : status === 'Rejected' ? 'bad' : '';
    return `<ol class="cuatro-timeline" aria-label="Application progress">${stages.map((s, i) => {
      let cls = i < cur ? 'done' : (i === cur ? 'current' : '');
      let label = s.k;
      if (s.final && outcome) { cls = outcome; label = status; }
      if (status === 'Withdrawn' && i === cur) cls = 'done';
      return `<li class="${cls}"${i === cur ? ' aria-current="step"' : ''}>${e(label)}</li>`;
    }).join('')}</ol>`;
  }

  CT.on('student-application-details', () => view(async (app) => {
    const code = CT.qs().get('id');
    if (!code) { app.innerHTML = '<div class="cuatro-notice cuatro-notice--err">No application selected.</div>'; return; }
    const draw = async () => {
      const { application: a, history } = await CT.api('GET', `/api/student/applications/${encodeURIComponent(code)}`);
      app.innerHTML = `${title(e(a.job_title), `Application ID <strong>${e(a.application_id)}</strong>`)}
        <div class="cuatro-box"><div class="cuatro-box__head"><h3>Status</h3>${CT.badge(a.status)}</div>${timeline(a.status, history)}
          ${a.status === 'Withdrawn' ? '<p class="cuatro-muted cuatro-mt">You withdrew this application.</p>' : ''}
          ${a.candidate_message ? `<div class="cuatro-notice cuatro-mt"><strong>Message from Cuatro:</strong> ${e(a.candidate_message)}</div>` : ''}
          ${a.next_step ? `<p class="cuatro-muted"><strong>Next step:</strong> ${e(a.next_step)}</p>` : ''}
          ${a.interview_at ? `<p class="cuatro-muted"><strong>Interview:</strong> ${CT.fmtDate(a.interview_at.length === 16 ? a.interview_at : a.interview_at, true)}${a.interview_details ? ' &middot; ' + e(a.interview_details) : ''}</p>` : ''}</div>
        <div class="row gutter-y-30"><div class="col-xl-6"><div class="cuatro-box" style="height:100%"><h3>Application details</h3><dl class="cuatro-kv">
          <dt>Category</dt><dd>${e(a.category)}</dd><dt>Applied on</dt><dd>${CT.fmtDate(a.applied_at, true)}</dd><dt>Last updated</dt><dd>${CT.fmtDate(a.updated_at, true)}</dd>
          <dt>Name</dt><dd>${e(a.applicant_name)}</dd><dt>Email</dt><dd>${e(a.applicant_email)}</dd><dt>Contact</dt><dd>${e(a.applicant_phone)}</dd>
          ${a.match_score !== null && a.match_score !== undefined ? `<dt>Match at submission</dt><dd>${a.match_score}%</dd>` : ''}
          <dt>Cover letter</dt><dd>${a.cover_letter ? e(a.cover_letter).replace(/\n/g, '<br>') : 'None'}</dd></dl>
          ${a.can_withdraw ? '<button class="ostech-btn ostech-btn--secondary cuatro-btn-sm cuatro-mt" id="withdraw">Withdraw application</button>' : ''}</div></div>
        <div class="col-xl-6"><div class="cuatro-box" style="height:100%"><h3>Status history</h3><ul class="cuatro-history">
          ${history.slice().reverse().map((h) => `<li><strong>${e(h.new_status)}</strong>${h.previous_status ? ` <span class="cuatro-muted">(from ${e(h.previous_status)})</span>` : ''}<time>${CT.fmtDate(h.changed_at, true)}</time>${h.message ? `<p>${e(h.message)}</p>` : ''}</li>`).join('')}</ul></div></div></div>`;
      const w = document.getElementById('withdraw');
      if (w) w.addEventListener('click', async () => {
        if (!confirm('Withdraw this application? This cannot be undone.')) return;
        try { await CT.api('POST', `/api/student/applications/${encodeURIComponent(code)}/withdraw`, {}); CT.toast('Application withdrawn'); await draw(); } catch (err) { CT.toast(err.message, true); }
      });
    };
    await draw();
  }));

  // ------------------------------------------------------------------ notifications
  CT.on('student-notifications', () => view(async (app) => {
    const draw = async () => {
      const { notifications, unread } = await CT.api('GET', '/api/student/notifications');
      app.innerHTML = `${title('Notifications', 'Your full notification history.')}<div class="cuatro-box"><div class="cuatro-box__head"><h3>${unread} unread</h3>${unread ? '<button class="cuatro-btn-link" id="mark-all">Mark all as read</button>' : ''}</div>
        ${notifications.length ? notifications.map((n) => `<div class="cuatro-notif cuatro-notif--${n.is_read ? 'read' : 'unread'}"><span class="cuatro-notif__dot"></span><div><h4>${n.link ? `<a href="${e(n.link)}" data-nid="${n.id}">${e(n.title)}</a>` : e(n.title)}</h4><p>${e(n.message)}</p><time>${CT.fmtDate(n.created_at, true)}</time></div></div>`).join('') : '<p class="cuatro-empty">No notifications yet.</p>'}</div>`;
      const all = document.getElementById('mark-all');
      if (all) all.addEventListener('click', async () => { await CT.api('POST', '/api/student/notifications/read', {}); await draw(); const b = document.getElementById('nav-unread'); if (b) b.hidden = true; });
      app.querySelectorAll('[data-nid]').forEach((a) => a.addEventListener('click', () => { CT.api('POST', '/api/student/notifications/read', { id: a.getAttribute('data-nid') }); }));
    };
    await draw();
  }));

  // ------------------------------------------------------------------ settings
  CT.on('student-settings', () => view(async (app, user) => {
    app.innerHTML = `${title('Account Settings')}
      <div class="cuatro-box"><h3>Account</h3><dl class="cuatro-kv"><dt>Name</dt><dd>${e(user.name)}</dd><dt>Email</dt><dd>${e(user.email)}</dd></dl>
        <a class="ostech-btn ostech-btn--secondary cuatro-btn-sm cuatro-mt" href="${P}/profile">Edit profile</a></div>
      <div class="cuatro-box"><h3>Change password</h3><form class="cuatro-form" id="pw-form" novalidate><div class="cf-row">
        <div class="cf-group cf-col-12"><label for="f-current_password">Current password</label><input id="f-current_password" name="current_password" type="password" autocomplete="current-password" required><div class="cf-error" data-error-for="current_password"></div></div>
        <div class="cf-group cf-col-6"><label for="f-new_password">New password</label><input id="f-new_password" name="new_password" type="password" autocomplete="new-password" required><div class="cf-error" data-error-for="new_password"></div></div>
        <div class="cf-group cf-col-6"><label for="f-confirm_password">Confirm new password</label><input id="f-confirm_password" name="confirm_password" type="password" autocomplete="new-password" required><div class="cf-error" data-error-for="confirm_password"></div></div>
      </div><div class="cf-status" role="status"></div><button class="ostech-btn" type="submit">Update password</button></form></div>`;
    CT.bindForm(document.getElementById('pw-form'), (v) => CT.api('POST', '/api/student/change-password', v), (res, f) => {
      f.reset(); const st = f.querySelector('.cf-status'); st.textContent = res.message; st.className = 'cf-status ok';
    });
  }));
})();
