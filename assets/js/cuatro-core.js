/*
 * Cuatro Tech Solutions: shared front-end helpers (API client with CSRF, forms, formatting, page registry).
 * Loaded after the template's ostech.js so the original animations and behaviours are untouched.
 */
(function () {
  'use strict';

  var CT = (window.CT = window.CT || {});
  var csrf = null;
  var sessionPromise = null;
  var pages = {};

  CT.esc = function (value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  CT.fmtDate = function (iso, withTime) {
    if (!iso) return '';
    var d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
    if (isNaN(d.getTime())) return CT.esc(iso);
    var opts = withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' };
    return d.toLocaleString('en-IN', opts);
  };

  CT.slug = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
  CT.badge = function (status) { return '<span class="cuatro-badge cuatro-badge--' + CT.slug(status) + '">' + CT.esc(status) + '</span>'; };
  CT.qs = function () { return new URLSearchParams(window.location.search); };

  CT.session = function (force) {
    if (!sessionPromise || force) {
      sessionPromise = fetch('/api/session', { credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (d) { csrf = d.csrfToken; return d; });
    }
    return sessionPromise;
  };
  CT.setCsrf = function (token) { if (token) csrf = token; };

  CT.api = function (method, url, body, options) {
    options = options || {};
    return CT.session().then(function () {
      var opts = { method: method, credentials: 'same-origin', headers: { 'X-CSRF-Token': csrf } };
      if (options.formData) opts.body = options.formData;
      else if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
      return fetch(url, opts);
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok) {
          var err = new Error((data && data.error) || 'Something went wrong. Please try again.');
          err.status = res.status;
          err.fields = data && data.fields;
          throw err;
        }
        return data;
      });
    });
  };

  CT.toast = function (message, isError) {
    var el = document.createElement('div');
    el.className = 'cuatro-toast' + (isError ? ' cuatro-toast--err' : '');
    el.setAttribute('role', 'status');
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 4500);
  };

  /* ---------- forms ---------- */
  CT.formValues = function (form) {
    var out = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.disabled || el.type === 'file' || el.type === 'submit' || el.type === 'button') return;
      if (el.type === 'checkbox') out[el.name] = el.checked;
      else out[el.name] = el.value;
    });
    return out;
  };

  CT.clearErrors = function (form) {
    Array.prototype.forEach.call(form.querySelectorAll('[data-error-for]'), function (e) { e.textContent = ''; });
    Array.prototype.forEach.call(form.querySelectorAll('.is-invalid'), function (e) { e.classList.remove('is-invalid'); });
    var st = form.querySelector('.cf-status');
    if (st) { st.textContent = ''; st.className = 'cf-status'; }
  };

  CT.showErrors = function (form, err) {
    var st = form.querySelector('.cf-status');
    if (st) { st.textContent = err.message; st.className = 'cf-status err'; }
    if (err.fields) {
      var first = null;
      Object.keys(err.fields).forEach(function (name) {
        var holder = form.querySelector('[data-error-for="' + name + '"]');
        if (holder) holder.textContent = err.fields[name];
        var input = form.elements[name];
        if (input && input.classList) { input.classList.add('is-invalid'); first = first || input; }
      });
      if (first && first.focus) first.focus();
    }
  };

  /** handler(values, form) must return a promise. Resolves value is passed to onDone. */
  CT.bindForm = function (form, handler, onDone) {
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      CT.clearErrors(form);
      var btn = form.querySelector('button[type=submit]');
      if (btn) btn.disabled = true;
      Promise.resolve().then(function () { return handler(CT.formValues(form), form); })
        .then(function (res) { if (onDone) onDone(res, form); })
        .catch(function (err) { if (err && err.status === 401 && /portal/.test(location.pathname) && !/login/.test(location.pathname)) return CT.toLogin(); CT.showErrors(form, err); })
        .then(function () { if (btn) btn.disabled = false; });
    });
  };

  CT.area = function () { return location.pathname.indexOf('/admin-portal') === 0 ? 'admin' : 'student'; };
  CT.loginUrl = function () { return '/' + CT.area() + '-portal/login'; };
  CT.toLogin = function () { location.href = CT.loginUrl() + '?next=' + encodeURIComponent(location.pathname + location.search); };

  CT.safeNext = function (fallback) {
    var next = CT.qs().get('next');
    var area = '/' + CT.area() + '-portal/';
    if (next && next.indexOf(area) === 0 && next.indexOf('//') === -1) return next;
    return fallback;
  };

  CT.on = function (name, fn) { pages[name] = fn; };

  /** Wraps a portal view: loads the session, sets sidebar details, handles 401 and errors. */
  CT.portalView = function (render) {
    var app = document.getElementById('app');
    return CT.session().then(function (s) {
      if (!s.user || s.user.role !== CT.area()) return CT.toLogin();
      var nm = document.getElementById('side-name');
      if (nm) nm.textContent = s.user.name;
      return Promise.resolve(render(app, s.user));
    }).catch(function (err) {
      if (err && err.status === 401) return CT.toLogin();
      if (app) app.innerHTML = '<div class="cuatro-notice cuatro-notice--err">' + CT.esc(err && err.message ? err.message : 'Something went wrong.') + '</div>';
    });
  };

  CT.skillTags = function (list, cls) {
    if (!list || !list.length) return '<span class="cuatro-muted">None</span>';
    return '<div class="cuatro-tags">' + list.map(function (s) { return '<span class="cuatro-tag ' + (cls || '') + '">' + CT.esc(s) + '</span>'; }).join('') + '</div>';
  };

  CT.fillSelect = function (select, values, placeholder) {
    if (!select) return;
    var first = select.options.length ? select.options[0].outerHTML : '<option value="">' + (placeholder || 'Any') + '</option>';
    select.innerHTML = first + values.map(function (v) {
      var val = typeof v === 'object' ? v.id : v; var label = typeof v === 'object' ? v.name : v;
      return '<option value="' + CT.esc(val) + '">' + CT.esc(label) + '</option>';
    }).join('');
  };

  CT.fmtSize = function (n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; };

  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('[data-action="logout"]') : null;
    if (!link) return;
    e.preventDefault();
    var area = CT.area();
    CT.api('POST', '/api/auth/logout', {}).then(function (r) { CT.setCsrf(r.csrfToken); })
      .catch(function () { /* ignore */ })
      .then(function () { location.href = '/' + area + '-portal/login'; });
  });

  /* Floating WhatsApp button: rise above the footer bar so it never covers the social icons. */
  function liftWhatsapp() {
    var wa = document.querySelector('.cx-wa');
    var bar = document.querySelector('.main-footer__bottom');
    if (!wa || !bar) return;
    var update = function () {
      var r = bar.getBoundingClientRect();
      var overlap = window.innerHeight - r.top; // how much of the footer bar is on screen
      wa.style.transform = overlap > 0 ? 'translateY(' + (-Math.min(overlap, r.height) - 4) + 'px)' : '';
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  document.addEventListener('DOMContentLoaded', function () {
    liftWhatsapp();
    var name = document.body.getAttribute('data-page');
    if (name && pages[name]) pages[name]();
  });
})();
