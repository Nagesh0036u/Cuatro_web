/* Admin Portal: recruitment management (jobs, candidates, applications, messages, audit). */
(function () {
  'use strict';
  const CT = window.CT;
  const e = CT.esc;
  const P = '/admin-portal';

  CT.on('admin-login', () => {
    CT.bindForm(document.getElementById('login-form'),
      (v) => CT.api('POST', '/api/auth/admin/login', { email: v.email, password: v.password }),
      (res) => { CT.setCsrf(res.csrfToken); location.href = CT.safeNext(P + '/dashboard'); });
  });

  const title = (t, lead) => `<h2 class="cuatro-app__title">${t}</h2>${lead ? `<p class="cuatro-app__lead">${lead}</p>` : ''}`;
  const view = (render) => CT.portalView((app, user) => render(app, user));
  const opts = (list, selected, valueKey, labelKey) => list.map((x) => {
    const v = valueKey ? x[valueKey] : x; const l = labelKey ? x[labelKey] : x;
    return `<option value="${e(v)}"${String(v) === String(selected) ? ' selected' : ''}>${e(l)}</option>`;
  }).join('');
  const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  function appTable(rows) {
    if (!rows.length) return '<div class="cuatro-empty">No applications found.</div>';
    return `<div class="cuatro-table-wrap"><table class="cuatro-table"><thead><tr><th>Application</th><th>Candidate</th><th>Job</th><th>Match</th><th>Status</th><th>Applied</th></tr></thead><tbody>
      ${rows.map((a) => `<tr><td><a href="${P}/application?id=${encodeURIComponent(a.application_id)}">${e(a.application_id)}</a></td><td>${e(a.candidate_name)}<br><small class="cuatro-muted">${e(a.candidate_email)}</small></td><td>${e(a.job_title)}<br><small class="cuatro-muted">${e(a.category)}</small></td><td>${a.match_score === null || a.match_score === undefined ? '-' : a.match_score + '%'}</td><td>${CT.badge(a.status)}</td><td>${CT.fmtDate(a.applied_at)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  // ------------------------------------------------------------------ dashboard
  CT.on('admin-dashboard', () => view(async (app) => {
    const { counts: c, recent } = await CT.api('GET', '/api/admin/overview');
    const stat = (n, l, href) => `<a class="cuatro-stat" href="${href || '#'}" style="display:block"><strong>${n}</strong><span>${l}</span></a>`;
    app.innerHTML = `${title('Recruitment Overview', 'A live summary of the Cuatro hiring pipeline.')}
      <div class="cuatro-stats">
        ${stat(c.students, 'Registered students', P + '/candidates')}
        ${stat(c.published_jobs, 'Published jobs', P + '/jobs')}
        ${stat(c.applications, 'Total applications', P + '/applications')}
        ${stat(c.under_review, 'Under review', P + '/applications?status=Under%20Review')}
        ${stat(c.shortlisted, 'Shortlisted', P + '/applications?status=Shortlisted')}
        ${stat(c.interviews, 'Interviews scheduled', P + '/applications?status=Interview%20Scheduled')}
        ${stat(c.selected, 'Selected', P + '/applications?status=Selected')}
        ${stat(c.rejected, 'Rejected', P + '/applications?status=Rejected')}
      </div>
      <div class="cuatro-box"><div class="cuatro-box__head"><h3>Latest applications</h3><a class="cuatro-btn-link" href="${P}/applications">View all</a></div>${appTable(recent)}</div>
      <div class="cuatro-box"><div class="cuatro-box__head"><h3>Quick actions</h3></div><div class="cuatro-inline">
        <a class="ostech-btn cuatro-btn-sm" href="${P}/job-edit">Create a job</a>
        <a class="ostech-btn ostech-btn--secondary cuatro-btn-sm" href="${P}/messages">Contact messages${c.new_messages ? ` (${c.new_messages} new)` : ''}</a></div></div>`;
  }));

  // ------------------------------------------------------------------ applications list
  CT.on('admin-applications', () => view(async (app) => {
    const meta = await CT.api('GET', '/api/meta');
    const jobs = (await CT.api('GET', '/api/admin/jobs')).jobs;
    const q = CT.qs();
    app.innerHTML = `${title('Applications', 'Review and manage candidate applications.')}
      <form class="cuatro-toolbar" id="filters"><input type="search" name="q" placeholder="Search ID, name, email or job" value="${e(q.get('q') || '')}" aria-label="Search">
        <select name="status" aria-label="Status"><option value="">All statuses</option>${opts(meta.applicationStatuses, q.get('status'))}</select>
        <select name="category" aria-label="Category"><option value="">All categories</option>${opts(meta.categories, q.get('category'), 'id', 'name')}</select>
        <select name="job" aria-label="Job"><option value="">All jobs</option>${opts(jobs, q.get('job'), 'id', 'title')}</select></form>
      <div class="cuatro-box" id="list"></div>`;
    const form = document.getElementById('filters');
    const load = async () => {
      const p = new URLSearchParams();
      ['q', 'status', 'category', 'job'].forEach((k) => { if (form[k].value) p.set(k, form[k].value); });
      const { applications } = await CT.api('GET', '/api/admin/applications?' + p.toString());
      document.getElementById('list').innerHTML = appTable(applications);
    };
    form.addEventListener('input', debounce(load)); form.addEventListener('change', load); form.addEventListener('submit', (ev) => { ev.preventDefault(); load(); });
    await load();
  }));

  // ------------------------------------------------------------------ application review
  CT.on('admin-application', () => view(async (app) => {
    const code = CT.qs().get('id');
    if (!code) { app.innerHTML = '<div class="cuatro-notice cuatro-notice--err">No application selected.</div>'; return; }
    const draw = async () => {
      const d = await CT.api('GET', `/api/admin/applications/${encodeURIComponent(code)}`);
      const a = d.application; const c = d.candidate;
      app.innerHTML = `${title(e(a.job_title), `${e(a.application_id)} &middot; ${e(a.category)}`)}
        <div class="row gutter-y-30"><div class="col-xl-7">
          <div class="cuatro-box"><div class="cuatro-box__head"><h3>Candidate</h3>${CT.badge(a.status)}</div><dl class="cuatro-kv">
            <dt>Name</dt><dd><a href="${P}/candidate?id=${a.candidate_id}">${e(a.candidate_name)}</a></dd><dt>Email</dt><dd>${e(a.candidate_email)}</dd><dt>Contact</dt><dd>${e(a.applicant_phone)}</dd>
            <dt>Education</dt><dd>${e([c.degree, c.specialisation, c.college, c.graduation_year].filter(Boolean).join(', ') || 'Not provided')}</dd>
            <dt>Location</dt><dd>${e(c.location || 'Not provided')}</dd><dt>Profile skills</dt><dd>${CT.skillTags((c.skills || '').split(',').map((s) => s.trim()).filter(Boolean))}</dd>
            <dt>Experience</dt><dd>${e(c.experience || 'Not provided')}</dd>
            <dt>Match at submission</dt><dd>${a.match_score === null || a.match_score === undefined ? 'Not calculated' : a.match_score + '%'}</dd>
            <dt>Applied</dt><dd>${CT.fmtDate(a.applied_at, true)}</dd>
            <dt>Cover letter</dt><dd>${a.cover_letter ? e(a.cover_letter).replace(/\n/g, '<br>') : 'None'}</dd>
            <dt>Relevant information</dt><dd>${a.relevant_info ? e(a.relevant_info).replace(/\n/g, '<br>') : 'None'}</dd>
            <dt>Resume</dt><dd>${d.resume ? `${e(d.resume.original_name)} &middot; <a href="/api/admin/applications/${encodeURIComponent(code)}/resume">Download</a><br>${CT.skillTags(d.resume.skills_found, 'cuatro-tag--ok')}` : 'No resume attached'}</dd></dl></div>
          <div class="cuatro-box"><h3>Status history</h3><ul class="cuatro-history">${d.history.slice().reverse().map((h) => `<li><strong>${e(h.new_status)}</strong>${h.previous_status ? ` <span class="cuatro-muted">(from ${e(h.previous_status)})</span>` : ''}<time>${CT.fmtDate(h.changed_at, true)} &middot; ${e(h.admin_name || 'Candidate / system')}</time>${h.candidate_message ? `<p>${e(h.candidate_message)}</p>` : ''}</li>`).join('')}</ul></div>
        </div><div class="col-xl-5">
          <div class="cuatro-box"><h3>Update status</h3>${a.status === 'Withdrawn' ? '<div class="cuatro-notice">The candidate withdrew this application.</div>' : `<form class="cuatro-form" id="status-form" novalidate>
            <div class="cf-group"><label for="f-status">New status</label><select id="f-status" name="status">${opts(d.statuses, a.status)}</select><div class="cf-error" data-error-for="status"></div></div>
            <div class="cf-group" id="iv-fields" hidden><label for="f-interview_at">Interview date and time</label><input id="f-interview_at" name="interview_at" type="datetime-local"><div class="cf-error" data-error-for="interview_at"></div>
              <label for="f-interview_details" style="margin-top:14px">Interview details (venue / link)</label><input id="f-interview_details" name="interview_details" type="text" maxlength="1000"></div>
            <div class="cf-group"><label for="f-message">Message to candidate (visible to them)</label><textarea id="f-message" name="message" maxlength="1000" style="height:110px"></textarea><div class="cf-error" data-error-for="message"></div></div>
            <div class="cf-group"><label for="f-next_step">Next step (visible to them)</label><input id="f-next_step" name="next_step" type="text" maxlength="500"><div class="cf-error" data-error-for="next_step"></div></div>
            <div class="cf-status" role="status"></div><button class="ostech-btn" type="submit">Save and notify candidate</button></form>`}</div>
          <div class="cuatro-box"><h3>Private notes</h3><p class="cuatro-muted"><small>Only visible to administrators. Never shown to candidates.</small></p>
            <form class="cuatro-form" id="note-form" novalidate><div class="cf-group"><textarea name="note" maxlength="2000" aria-label="Internal note" style="height:100px"></textarea><div class="cf-error" data-error-for="note"></div></div><div class="cf-status"></div><button class="ostech-btn cuatro-btn-sm" type="submit">Add note</button></form>
            ${d.notes.map((n) => `<div class="cuatro-notif"><div><p>${e(n.note).replace(/\n/g, '<br>')}</p><time>${e(n.admin_name || 'Admin')} &middot; ${CT.fmtDate(n.created_at, true)}</time></div></div>`).join('')}</div>
          <div class="cuatro-box"><h3>Reapplication</h3><p class="cuatro-muted">${a.reapply_allowed ? 'The candidate is currently allowed to submit a new application for this job.' : 'The candidate cannot apply again for this job unless you allow it.'}</p>
            <button class="ostech-btn ostech-btn--secondary cuatro-btn-sm" id="reapply">${a.reapply_allowed ? 'Revoke reapplication' : 'Allow reapplication'}</button></div>
        </div></div>`;
      const sf = document.getElementById('status-form');
      if (sf) {
        const toggle = () => { document.getElementById('iv-fields').hidden = sf.status.value !== 'Interview Scheduled'; };
        sf.status.addEventListener('change', toggle); toggle();
        CT.bindForm(sf, (v) => CT.api('POST', `/api/admin/applications/${encodeURIComponent(code)}/status`, v), async () => { CT.toast('Status updated and candidate notified'); await draw(); });
      }
      CT.bindForm(document.getElementById('note-form'), (v) => CT.api('POST', `/api/admin/applications/${encodeURIComponent(code)}/notes`, v), async () => { CT.toast('Note added'); await draw(); });
      document.getElementById('reapply').addEventListener('click', async () => {
        try { await CT.api('POST', `/api/admin/applications/${encodeURIComponent(code)}/allow-reapply`, { allow: !a.reapply_allowed }); await draw(); } catch (err) { CT.toast(err.message, true); }
      });
    };
    await draw();
  }));

  // ------------------------------------------------------------------ jobs
  CT.on('admin-jobs', () => view(async (app) => {
    const meta = await CT.api('GET', '/api/meta');
    app.innerHTML = `${title('Job Management', 'Create, publish and close vacancies.')}
      <div class="cuatro-inline" style="margin-bottom:20px"><a class="ostech-btn" href="${P}/job-edit">Create new job</a></div>
      <form class="cuatro-toolbar" id="filters"><input type="search" name="q" placeholder="Search title or location" aria-label="Search">
        <select name="status" aria-label="Status"><option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="closed">Closed</option></select>
        <select name="category" aria-label="Category"><option value="">All categories</option>${opts(meta.categories, '', 'id', 'name')}</select></form>
      <div class="cuatro-box" id="list"></div>`;
    const form = document.getElementById('filters');
    const act = async (id, action) => {
      try { await CT.api('POST', `/api/admin/jobs/${id}/status`, { action }); CT.toast('Job updated'); await load(); } catch (err) { CT.toast(err.message, true); }
    };
    const load = async () => {
      const p = new URLSearchParams(); ['q', 'status', 'category'].forEach((k) => { if (form[k].value) p.set(k, form[k].value); });
      const { jobs } = await CT.api('GET', '/api/admin/jobs?' + p.toString());
      const list = document.getElementById('list');
      list.innerHTML = jobs.length ? `<div class="cuatro-table-wrap"><table class="cuatro-table"><thead><tr><th>Job</th><th>Category</th><th>Location</th><th>Status</th><th>Deadline</th><th>Applicants</th><th>Actions</th></tr></thead><tbody>
        ${jobs.map((j) => `<tr><td><a href="${P}/job-edit?id=${j.id}">${e(j.title)}</a>${j.is_demo ? ' <span class="cuatro-badge cuatro-badge--demo">Demo</span>' : ''}</td><td>${e(j.category)}</td><td>${e(j.location)}</td><td>${CT.badge(j.status)}</td><td>${j.deadline ? CT.fmtDate(j.deadline) : '-'}</td>
          <td><a href="${P}/applications?job=${j.id}">${j.applicant_count}</a></td><td><div class="cuatro-inline">
          <a class="cuatro-btn-link" href="${P}/job-edit?id=${j.id}">Edit</a>
          ${j.status !== 'published' ? `<button class="cuatro-btn-link" data-a="publish" data-id="${j.id}">Publish</button>` : `<button class="cuatro-btn-link" data-a="unpublish" data-id="${j.id}">Unpublish</button>`}
          ${j.status !== 'closed' ? `<button class="cuatro-btn-link" data-a="close" data-id="${j.id}">Close</button>` : `<button class="cuatro-btn-link" data-a="reopen" data-id="${j.id}">Reopen</button>`}
          <button class="cuatro-btn-link" data-a="delete" data-id="${j.id}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>` : '<div class="cuatro-empty">No jobs found.</div>';
      list.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', async () => {
        const id = b.getAttribute('data-id'); const a = b.getAttribute('data-a');
        if (a === 'delete') {
          if (!confirm('Delete this job permanently? Jobs with applications cannot be deleted.')) return;
          try { await CT.api('DELETE', `/api/admin/jobs/${id}`); CT.toast('Job deleted'); await load(); } catch (err) { CT.toast(err.message, true); }
        } else act(id, a);
      }));
    };
    form.addEventListener('input', debounce(load)); form.addEventListener('change', load); form.addEventListener('submit', (ev) => { ev.preventDefault(); load(); });
    await load();
  }));

  CT.on('admin-job-edit', () => view(async (app) => {
    const meta = await CT.api('GET', '/api/meta');
    const id = parseInt(CT.qs().get('id'), 10);
    const j = id ? (await CT.api('GET', `/api/admin/jobs/${id}`)).job : { status: 'draft' };
    const v = (k) => e(j[k] === null || j[k] === undefined ? '' : j[k]);
    const input = (k, label, type = 'text', col = 'cf-col-6', extra = '') => `<div class="cf-group ${col}"><label for="f-${k}">${label}</label><input id="f-${k}" name="${k}" type="${type}" value="${v(k)}" ${extra}><div class="cf-error" data-error-for="${k}"></div></div>`;
    const area = (k, label, val, h = 120) => `<div class="cf-group cf-col-12"><label for="f-${k}">${label}</label><textarea id="f-${k}" name="${k}" style="height:${h}px">${e(val || '')}</textarea><div class="cf-error" data-error-for="${k}"></div></div>`;
    app.innerHTML = `${title(id ? 'Edit Job' : 'Create Job', id ? `${e(j.title)} ${CT.badge(j.status)} ${j.is_demo ? '<span class="cuatro-badge cuatro-badge--demo">Demonstration record</span>' : ''}` : 'New vacancies start as drafts until published.')}
      <div class="cuatro-box"><form class="cuatro-form" id="job-form" novalidate><div class="cf-row">
        ${input('title', 'Job title', 'text', 'cf-col-12', 'required maxlength="150"')}
        <div class="cf-group cf-col-6"><label for="f-category_id">Category</label><select id="f-category_id" name="category_id" required><option value="">Select a category</option>${opts(meta.categories, j.category_id, 'id', 'name')}</select><div class="cf-error" data-error-for="category_id"></div></div>
        ${input('company_name', 'Company name', 'text', 'cf-col-6', 'placeholder="Cuatro Tech Solutions"')}
        ${input('location', 'Location', 'text', 'cf-col-4', 'required')}
        <div class="cf-group cf-col-4"><label for="f-employment_type">Employment type</label><select id="f-employment_type" name="employment_type">${opts(meta.employmentTypes, j.employment_type)}</select><div class="cf-error" data-error-for="employment_type"></div></div>
        <div class="cf-group cf-col-4"><label for="f-work_mode">Work mode</label><select id="f-work_mode" name="work_mode">${opts(meta.workModes, j.work_mode)}</select><div class="cf-error" data-error-for="work_mode"></div></div>
        <div class="cf-group cf-col-6"><label for="f-experience_level">Experience level</label><select id="f-experience_level" name="experience_level"><option value="">Not specified</option>${opts(meta.experienceLevels, j.experience_level)}</select></div>
        ${input('experience_years_min', 'Minimum years of experience (used for matching)', 'number', 'cf-col-6', 'min="0" max="50" step="0.5"')}
        ${input('salary_min', 'Minimum salary (INR per year)', 'number', 'cf-col-4', 'min="0"')}
        ${input('salary_max', 'Maximum salary (INR per year)', 'number', 'cf-col-4', 'min="0"')}
        ${input('deadline', 'Application deadline', 'date', 'cf-col-4')}
        <div class="cf-group cf-col-12"><label for="f-salary_text">Salary text (optional, overrides range)</label><input id="f-salary_text" name="salary_text" type="text" value="${e(j.salary_text || '')}" maxlength="120"><div class="cf-error" data-error-for="salary_text"></div></div>
        ${area('short_description', 'Short description (shown on job cards)', j.short_description, 80)}
        ${area('description', 'Job description', j.description, 160)}
        ${area('responsibilities', 'Responsibilities (one per line)', j.responsibilities_text)}
        ${area('skills', 'Required skills (comma separated, used for matching)', j.skills_text, 80)}
        ${area('qualifications', 'Qualifications (one per line)', j.qualifications_text)}
      </div><div class="cf-status" role="status"></div>
      <div class="cuatro-inline"><button class="ostech-btn" type="submit" data-mode="save">${id ? 'Save changes' : 'Save as draft'}</button>
      ${id ? '' : '<button class="ostech-btn ostech-btn--secondary" type="submit" data-mode="publish">Save and publish</button>'}
      <a class="cuatro-btn-link" href="${P}/jobs">Cancel</a>${id ? ` <a class="cuatro-btn-link" href="${P}/applications?job=${id}">View applicants (${j.applicant_count || 0})</a>` : ''}</div></form></div>`;
    const form = document.getElementById('job-form');
    let mode = 'save';
    form.querySelectorAll('button[type=submit]').forEach((b) => b.addEventListener('click', () => { mode = b.getAttribute('data-mode'); }));
    CT.bindForm(form, (vals) => {
      const body = Object.assign({}, vals, { publish: mode === 'publish' });
      return id ? CT.api('PUT', `/api/admin/jobs/${id}`, body) : CT.api('POST', '/api/admin/jobs', body);
    }, (res) => { CT.toast('Job saved'); if (!id) location.href = `${P}/job-edit?id=${res.id}`; });
  }));

  // ------------------------------------------------------------------ candidates
  CT.on('admin-candidates', () => view(async (app) => {
    const meta = await CT.api('GET', '/api/meta');
    const jobs = (await CT.api('GET', '/api/admin/jobs')).jobs;
    app.innerHTML = `${title('Candidates', 'Registered students and their applications.')}
      <form class="cuatro-toolbar" id="filters"><input type="search" name="q" placeholder="Search name, email, skill or college" aria-label="Search">
        <select name="category" aria-label="Category"><option value="">Any applied category</option>${opts(meta.categories, '', 'id', 'name')}</select>
        <select name="job" aria-label="Job"><option value="">Any job</option>${opts(jobs, '', 'id', 'title')}</select>
        <select name="status" aria-label="Status"><option value="">Any application status</option>${opts(meta.applicationStatuses, '')}</select></form>
      <div class="cuatro-box" id="list"></div>`;
    const form = document.getElementById('filters');
    const load = async () => {
      const p = new URLSearchParams(); ['q', 'category', 'job', 'status'].forEach((k) => { if (form[k].value) p.set(k, form[k].value); });
      const { candidates } = await CT.api('GET', '/api/admin/candidates?' + p.toString());
      document.getElementById('list').innerHTML = candidates.length ? `<div class="cuatro-table-wrap"><table class="cuatro-table"><thead><tr><th>Name</th><th>Education</th><th>Skills</th><th>Resume</th><th>Applications</th><th>Registered</th></tr></thead><tbody>
        ${candidates.map((c) => `<tr><td><a href="${P}/candidate?id=${c.id}">${e(c.full_name)}</a><br><small class="cuatro-muted">${e(c.email)}</small></td><td>${e([c.degree, c.college].filter(Boolean).join(', ') || '-')}</td><td>${e((c.skills || '-').slice(0, 80))}</td><td>${c.resume_name ? 'Yes' : 'No'}</td><td>${c.applications}</td><td>${CT.fmtDate(c.registered_at)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="cuatro-empty">No candidates found.</div>';
    };
    form.addEventListener('input', debounce(load)); form.addEventListener('change', load); form.addEventListener('submit', (ev) => { ev.preventDefault(); load(); });
    await load();
  }));

  CT.on('admin-candidate', () => view(async (app) => {
    const id = parseInt(CT.qs().get('id'), 10);
    if (!id) { app.innerHTML = '<div class="cuatro-notice cuatro-notice--err">No candidate selected.</div>'; return; }
    const d = await CT.api('GET', `/api/admin/candidates/${id}`);
    const c = d.candidate;
    app.innerHTML = `${title(e(c.full_name), e(c.email))}
      <div class="cuatro-box"><h3>Profile</h3><dl class="cuatro-kv"><dt>Contact</dt><dd>${e(c.contact_number || '-')}</dd><dt>Location</dt><dd>${e(c.location || '-')}</dd>
        <dt>Education</dt><dd>${e([c.degree, c.specialisation, c.college, c.graduation_year].filter(Boolean).join(', ') || '-')}</dd>
        <dt>Skills</dt><dd>${CT.skillTags((c.skills || '').split(',').map((s) => s.trim()).filter(Boolean))}</dd><dt>Experience</dt><dd>${e(c.experience || '-')}</dd><dt>Registered</dt><dd>${CT.fmtDate(c.registered_at, true)}</dd></dl></div>
      <div class="cuatro-box"><h3>Resume</h3>${d.resume ? `<dl class="cuatro-kv"><dt>File</dt><dd>${e(d.resume.original_name)} (${e(d.resume.file_type.toUpperCase())})</dd><dt>Uploaded</dt><dd>${CT.fmtDate(d.resume.uploaded_at, true)}</dd><dt>Skills detected</dt><dd>${CT.skillTags(d.resume.skills_found, 'cuatro-tag--ok')}</dd></dl><a class="ostech-btn cuatro-btn-sm cuatro-mt" href="/api/admin/candidates/${id}/resume">Download resume</a>` : '<p class="cuatro-muted">No resume uploaded.</p>'}</div>
      <div class="cuatro-box"><h3>Applications</h3>${appTable(d.applications)}</div>`;
  }));

  // ------------------------------------------------------------------ messages
  CT.on('admin-messages', () => view(async (app) => {
    const draw = async () => {
      const { messages } = await CT.api('GET', '/api/admin/messages');
      app.innerHTML = `${title('Contact Messages', 'Enquiries sent through the website contact form.')}<div class="cuatro-box">${messages.length ? messages.map((m) => `<div class="cuatro-notif"><div style="flex:1"><h4>${e(m.subject)} ${CT.badge(m.status)}</h4><p>${e(m.message).replace(/\n/g, '<br>')}</p>
        <time>${e(m.name)} &middot; <a href="mailto:${e(m.email)}">${e(m.email)}</a> &middot; ${e(m.contact_number || '')} &middot; ${CT.fmtDate(m.created_at, true)}</time>
        <div class="cuatro-inline" style="margin-top:8px"><button class="cuatro-btn-link" data-id="${m.id}" data-s="Read">Mark read</button><button class="cuatro-btn-link" data-id="${m.id}" data-s="Replied">Mark replied</button></div></div></div>`).join('') : '<div class="cuatro-empty">No messages yet.</div>'}</div>`;
      app.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', async () => { await CT.api('POST', `/api/admin/messages/${b.getAttribute('data-id')}/status`, { status: b.getAttribute('data-s') }); await draw(); }));
    };
    await draw();
  }));

  // ------------------------------------------------------------------ audit
  CT.on('admin-audit', () => view(async (app) => {
    const { logs } = await CT.api('GET', '/api/admin/audit');
    app.innerHTML = `${title('Audit Log', 'Recent administrative operations.')}<div class="cuatro-box">${logs.length ? `<div class="cuatro-table-wrap"><table class="cuatro-table"><thead><tr><th>When</th><th>Administrator</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>
      ${logs.map((l) => `<tr><td>${CT.fmtDate(l.created_at, true)}</td><td>${e(l.admin_name || '-')}</td><td>${e(l.action)}</td><td>${e([l.entity_type, l.entity_id].filter(Boolean).join(' '))}</td><td><small>${e(l.details || '')}</small></td></tr>`).join('')}</tbody></table></div>` : '<div class="cuatro-empty">No entries.</div>'}</div>`;
  }));

  // ------------------------------------------------------------------ settings
  CT.on('admin-settings', () => view(async (app, user) => {
    app.innerHTML = `${title('Account Settings')}<div class="cuatro-box"><h3>Account</h3><dl class="cuatro-kv"><dt>Name</dt><dd>${e(user.name)}</dd><dt>Email</dt><dd>${e(user.email)}</dd></dl></div>
      <div class="cuatro-box"><h3>Change password</h3><form class="cuatro-form" id="pw-form" novalidate><div class="cf-row">
        <div class="cf-group cf-col-12"><label for="f-current_password">Current password</label><input id="f-current_password" name="current_password" type="password" autocomplete="current-password"><div class="cf-error" data-error-for="current_password"></div></div>
        <div class="cf-group cf-col-6"><label for="f-new_password">New password (min 10 characters)</label><input id="f-new_password" name="new_password" type="password" autocomplete="new-password"><div class="cf-error" data-error-for="new_password"></div></div>
        <div class="cf-group cf-col-6"><label for="f-confirm_password">Confirm new password</label><input id="f-confirm_password" name="confirm_password" type="password" autocomplete="new-password"><div class="cf-error" data-error-for="confirm_password"></div></div></div>
        <div class="cf-status" role="status"></div><button class="ostech-btn" type="submit">Update password</button></form></div>`;
    CT.bindForm(document.getElementById('pw-form'), (v) => CT.api('POST', '/api/admin/change-password', v), (res, f) => { f.reset(); const st = f.querySelector('.cf-status'); st.textContent = res.message; st.className = 'cf-status ok'; });
  }));
})();
