/* Public website pages: contact form and FAQ search. */
(function () {
  'use strict';
  var CT = window.CT;

  CT.on('contact', function () {
    var form = document.getElementById('contact-form');
    var service = CT.qs().get('service');
    if (service && form.elements.subject) form.elements.subject.value = 'Enquiry about ' + service;
    CT.bindForm(form, function (v) {
      if (!v.consent) { var e = new Error('Please correct the highlighted fields.'); e.fields = { consent: 'Consent to data processing is required.' }; throw e; }
      return CT.api('POST', '/api/contact', v);
    }, function (res, f) {
      f.reset();
      var st = f.querySelector('.cf-status');
      st.textContent = res.message;
      st.className = 'cf-status ok';
    });
  });

  CT.on('faq', function () {
    var form = document.getElementById('faq-search');
    var input = form.querySelector('input');
    var items = document.querySelectorAll('.faq-page__accordion .accrodion');
    function run() {
      var q = input.value.trim().toLowerCase();
      Array.prototype.forEach.call(items, function (el) {
        el.style.display = !q || el.textContent.toLowerCase().indexOf(q) !== -1 ? '' : 'none';
      });
    }
    input.addEventListener('input', run);
    form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
  });
})();
