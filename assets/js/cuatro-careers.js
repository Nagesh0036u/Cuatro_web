/* Careers at Cuatro: public job listing, filters and job details. */
(function () {
  'use strict';
  var CT = window.CT;
  var PAGE_SIZE = 9;

  function jobCard(j) {
    var applyHref = '/student-portal/apply?job=' + j.id;
    return '<div class="col-md-6 col-xl-4"><article class="cuatro-job">' +
      '<p class="cuatro-job__cat">' + CT.esc(j.category) + '</p>' +
      (j.is_demo ? '<span class="cuatro-badge cuatro-badge--demo">Demonstration listing</span>' : '') +
      '<h3 class="cuatro-job__title"><a href="job-details.html?id=' + j.id + '">' + CT.esc(j.title) + '</a></h3>' +
      '<ul class="cuatro-job__meta">' +
      '<li><i class="fas fa-map-marker-alt" aria-hidden="true"></i> ' + CT.esc(j.location) + '</li>' +
      '<li><i class="fas fa-briefcase" aria-hidden="true"></i> ' + CT.esc(j.employment_type) + ' &middot; ' + CT.esc(j.work_mode) + '</li>' +
      '<li><i class="fas fa-layer-group" aria-hidden="true"></i> ' + CT.esc(j.experience_level || 'Not specified') + '</li>' +
      (j.salary ? '<li><i class="fas fa-rupee-sign" aria-hidden="true"></i> ' + CT.esc(j.salary) + '</li>' : '') +
      '<li><i class="far fa-calendar-alt" aria-hidden="true"></i> Posted ' + CT.fmtDate(j.posted_at) + (j.deadline ? ' &middot; Apply by ' + CT.fmtDate(j.deadline) : '') + '</li>' +
      '</ul>' +
      '<p class="cuatro-job__text">' + CT.esc(j.short_description) + '</p>' +
      '<div class="cuatro-job__actions">' +
      '<a class="ostech-btn ostech-btn--secondary" href="job-details.html?id=' + j.id + '">View Details</a>' +
      (j.accepting ? '<a class="ostech-btn" href="' + applyHref + '">Apply Now</a>' : '<span class="cuatro-badge cuatro-badge--closed">Applications closed</span>') +
      '</div></article></div>';
  }

  CT.on('careers', function () {
    var form = document.getElementById('job-filter');
    var list = document.getElementById('job-list');
    var count = document.getElementById('job-count');
    var pager = document.getElementById('job-pagination');
    var chips = document.getElementById('category-chips');
    var fields = ['title', 'keyword', 'category', 'location', 'type', 'experience', 'mode', 'salaryMin'];
    var state = { page: 1 };

    function readUrl() {
      var q = CT.qs();
      fields.forEach(function (f) { if (q.get(f) && form.elements[f]) form.elements[f].value = q.get(f); });
      state.page = parseInt(q.get('page'), 10) || 1;
    }

    function params() {
      var p = new URLSearchParams();
      fields.forEach(function (f) { var v = form.elements[f].value.trim(); if (v) p.set(f, v); });
      return p;
    }

    function syncChips() {
      var active = form.elements.category.value;
      Array.prototype.forEach.call(chips.querySelectorAll('.cuatro-chip'), function (c) {
        c.classList.toggle('active', (c.getAttribute('data-id') || '') === active);
      });
    }

    function load() {
      var p = params();
      var shown = p.toString();
      history.replaceState(null, '', location.pathname + (shown || state.page > 1 ? '?' + shown + (state.page > 1 ? (shown ? '&' : '') + 'page=' + state.page : '') : ''));
      p.set('page', state.page); p.set('pageSize', PAGE_SIZE);
      count.textContent = 'Loading jobs...';
      return CT.api('GET', '/api/jobs?' + p.toString()).then(function (res) {
        count.textContent = res.total === 0 ? 'No jobs match your search.' : res.total + (res.total === 1 ? ' job found' : ' jobs found');
        list.innerHTML = res.jobs.length ? res.jobs.map(jobCard).join('') :
          '<div class="col-12"><div class="cuatro-box cuatro-empty"><h3>No matching jobs right now</h3><p>Try removing some filters or choose a different category. New positions are published by the Cuatro recruitment team.</p></div></div>';
        renderPager(res);
        syncChips();
      }).catch(function (e) { count.textContent = e.message; });
    }

    function renderPager(res) {
      var pages = Math.ceil(res.total / res.pageSize);
      if (pages <= 1) { pager.innerHTML = ''; return; }
      var html = '<button type="button" data-p="' + (res.page - 1) + '"' + (res.page === 1 ? ' disabled' : '') + ' aria-label="Previous page">&laquo;</button>';
      for (var i = 1; i <= pages; i++) html += '<button type="button" data-p="' + i + '" class="' + (i === res.page ? 'active' : '') + '"' + (i === res.page ? ' aria-current="page"' : '') + '>' + i + '</button>';
      html += '<button type="button" data-p="' + (res.page + 1) + '"' + (res.page === pages ? ' disabled' : '') + ' aria-label="Next page">&raquo;</button>';
      pager.innerHTML = html;
    }

    pager.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-p]');
      if (!b || b.disabled) return;
      state.page = parseInt(b.getAttribute('data-p'), 10);
      load().then(function () { list.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); state.page = 1; load(); });
    form.addEventListener('reset', function () { setTimeout(function () { state.page = 1; load(); }, 0); });
    ['category', 'type', 'experience', 'mode', 'salaryMin'].forEach(function (f) {
      form.elements[f].addEventListener('change', function () { state.page = 1; load(); });
    });
    chips.addEventListener('click', function (e) {
      var c = e.target.closest('.cuatro-chip');
      if (!c) return;
      form.elements.category.value = c.getAttribute('data-id') || '';
      state.page = 1; load();
    });

    Promise.all([CT.api('GET', '/api/meta'), CT.api('GET', '/api/categories/counts')]).then(function (r) {
      var meta = r[0]; var counts = r[1].categories;
      CT.fillSelect(form.elements.category, meta.categories);
      CT.fillSelect(form.elements.type, meta.employmentTypes);
      CT.fillSelect(form.elements.experience, meta.experienceLevels);
      CT.fillSelect(form.elements.mode, meta.workModes);
      chips.innerHTML = '<button type="button" class="cuatro-chip active" data-id="">All categories</button>' + counts.map(function (c) {
        return '<button type="button" class="cuatro-chip" data-id="' + c.id + '">' + CT.esc(c.name) + ' <small>(' + c.jobs + ')</small></button>';
      }).join('');
      readUrl();
      return load();
    }).catch(function (e) { count.textContent = e.message; });
  });

  function list(items) { return '<ul class="cuatro-bullets list-unstyled">' + items.map(function (i) { return '<li>' + CT.esc(i) + '</li>'; }).join('') + '</ul>'; }

  CT.on('job-details', function () {
    var box = document.getElementById('job-detail');
    var id = parseInt(CT.qs().get('id'), 10);
    if (!id) { box.innerHTML = '<div class="cuatro-notice cuatro-notice--err">No job was selected. <a href="careers.html">Back to Careers at Cuatro</a></div>'; return; }
    CT.api('GET', '/api/jobs/' + id).then(function (res) {
      var j = res.job;
      document.title = j.title + ' || Cuatro Tech Solutions';
      var apply = j.accepting
        ? '<a class="ostech-btn" href="/student-portal/apply?job=' + j.id + '">Apply Now</a>'
        : '<p><span class="cuatro-badge cuatro-badge--closed">Applications closed</span></p><p class="cuatro-muted">This job is closed or past its application deadline.</p>';
      box.innerHTML =
        '<div class="cuatro-jobdetail"><div class="cuatro-jobdetail__head">' +
        '<span class="cuatro-badge">' + CT.esc(j.category) + '</span>' + (j.is_demo ? '<span class="cuatro-badge cuatro-badge--demo">Demonstration listing</span>' : '') +
        '<h2>' + CT.esc(j.title) + '</h2>' +
        '<ul class="cuatro-jobdetail__facts">' +
        '<li><i class="fas fa-building"></i>' + CT.esc(j.company) + '</li>' +
        '<li><i class="fas fa-map-marker-alt"></i>' + CT.esc(j.location) + '</li>' +
        '<li><i class="fas fa-briefcase"></i>' + CT.esc(j.employment_type) + ' &middot; ' + CT.esc(j.work_mode) + '</li>' +
        (j.deadline ? '<li><i class="far fa-calendar-alt"></i>Apply by ' + CT.fmtDate(j.deadline) + '</li>' : '') +
        '</ul></div>' +
        (j.is_demo ? '<div class="cuatro-notice">This is a demonstration record used to preview the Careers system. It is not a live vacancy.</div>' : '') +
        '<div class="row gutter-y-30"><div class="col-lg-8">' +
        '<h3>Job description</h3><p class="cuatro-muted">' + CT.esc(j.description).replace(/\n/g, '<br>') + '</p>' +
        (j.responsibilities.length ? '<h3>Responsibilities</h3>' + list(j.responsibilities) : '') +
        (j.skills.length ? '<h3>Required skills</h3>' + CT.skillTags(j.skills) : '') +
        (j.qualifications.length ? '<h3>Qualifications</h3>' + list(j.qualifications) : '') +
        '<h3>Experience</h3><p class="cuatro-muted">' + CT.esc(j.experience_level || 'Not specified') + (j.experience_years_min ? ' (minimum ' + CT.esc(j.experience_years_min) + ' years)' : '') + '</p>' +
        '</div><div class="col-lg-4"><div class="cuatro-box"><h3>Job summary</h3><dl class="cuatro-kv">' +
        '<dt>Category</dt><dd>' + CT.esc(j.category) + '</dd>' +
        '<dt>Company</dt><dd>' + CT.esc(j.company) + '</dd>' +
        '<dt>Location</dt><dd>' + CT.esc(j.location) + '</dd>' +
        '<dt>Job type</dt><dd>' + CT.esc(j.employment_type) + '</dd>' +
        '<dt>Work mode</dt><dd>' + CT.esc(j.work_mode) + '</dd>' +
        '<dt>Salary</dt><dd>' + CT.esc(j.salary || 'Not disclosed') + '</dd>' +
        '<dt>Posted</dt><dd>' + CT.fmtDate(j.posted_at) + '</dd>' +
        '<dt>Deadline</dt><dd>' + (j.deadline ? CT.fmtDate(j.deadline) : 'Open until filled') + '</dd>' +
        '</dl><div class="cuatro-mt">' + apply + '</div>' +
        '<p class="cuatro-muted cuatro-mt"><a href="careers.html">&larr; Back to all jobs</a></p></div></div></div></div>';
    }).catch(function (e) {
      box.innerHTML = '<div class="cuatro-notice cuatro-notice--err">' + CT.esc(e.message) + ' <a href="careers.html">Back to Careers at Cuatro</a></div>';
    });
  });
})();
