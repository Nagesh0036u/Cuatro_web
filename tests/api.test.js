'use strict';

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { startServer, Client, makeDocx } = require('./helpers');

let ctx; let admin; let alice; let bob; let jobId; let closedJobId;
const ADMIN = { email: 'admin@test.local', password: 'AdminPass123!' };

async function newClient() { const c = new Client(ctx.base); await c.init(); return c; }

async function registerStudent(name, email) {
  const c = await newClient();
  const r = await c.post('/api/auth/student/register', {
    full_name: name, email, contact_number: '+91 9876543210', password: 'Student123', confirm_password: 'Student123',
    college: 'Test University', degree: "Bachelor's degree", specialisation: 'Computer Science', graduation_year: 2025,
    skills: 'Python, SQL', location: 'Bengaluru'
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  c.csrf = r.json.csrfToken;
  return c;
}

before(async () => {
  ctx = await startServer();
  const { createAdmin } = require('../server/bootstrap');
  await createAdmin({ ...ADMIN, name: 'Test Admin' });
  admin = await newClient();
  const r = await admin.post('/api/auth/admin/login', ADMIN);
  assert.equal(r.status, 200);
  admin.csrf = r.json.csrfToken;
  alice = await registerStudent('Alice Rao', 'alice@test.local');
  bob = await registerStudent('Bob Nair', 'bob@test.local');
});

after(async () => { await ctx.close(); });

const jobPayload = (over = {}) => ({
  title: 'Python Data Engineer', category_id: 1, description: 'Build data pipelines using Python and SQL for analytics.',
  responsibilities: 'Build pipelines\nWrite SQL', skills: 'Python, SQL, Machine Learning, Data Analysis',
  qualifications: "Bachelor's degree in Computer Science", experience_level: '1-3 years', experience_years_min: 0,
  location: 'Bengaluru', employment_type: 'Full-time', work_mode: 'Hybrid', salary_min: 500000, salary_max: 900000,
  deadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), ...over
});

describe('public website API', () => {
  test('all 19 job categories are available in the exact order', async () => {
    const c = await newClient();
    const r = await c.get('/api/meta');
    assert.equal(r.json.categories.length, 19);
    const { CATEGORIES } = require('../server/categories');
    assert.deepEqual(r.json.categories.map((x) => x.name), CATEGORIES);
    assert.equal(r.json.categories[0].name, 'Information Technology (IT) & Software');
    assert.equal(r.json.categories[18].name, 'Sports & Fitness');
  });

  test('contact form validates and stores a message', async () => {
    const c = await newClient();
    const bad = await c.post('/api/contact', { name: 'A' });
    assert.equal(bad.status, 422);
    assert.ok(bad.json.fields.email);
    const noConsent = await c.post('/api/contact', { name: 'Test User', email: 'u@example.com', contact_number: '9876543210', subject: 'Hello', message: 'Need some information please.' });
    assert.equal(noConsent.status, 422);
    assert.ok(noConsent.json.fields.consent);
    const ok = await c.post('/api/contact', { name: 'Test User', email: 'u@example.com', contact_number: '9876543210', subject: 'Hello', message: 'Need some information please.', consent: true });
    assert.equal(ok.status, 201);
    const list = await admin.get('/api/admin/messages');
    assert.equal(list.json.messages.length, 1);
  });

  test('state-changing API calls without a CSRF token are rejected', async () => {
    const r = await fetch(`${ctx.base}/api/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(r.status, 403);
  });
});

describe('admin job management', () => {
  test('student cannot create jobs, admin can', async () => {
    const denied = await alice.post('/api/admin/jobs', jobPayload());
    assert.equal(denied.status, 403);
    const anon = await newClient();
    assert.equal((await anon.post('/api/admin/jobs', jobPayload())).status, 401);

    const bad = await admin.post('/api/admin/jobs', jobPayload({ category_id: 99, title: 'x' }));
    assert.equal(bad.status, 422);

    const created = await admin.post('/api/admin/jobs', jobPayload({ publish: true }));
    assert.equal(created.status, 201);
    jobId = created.json.id;
    const closed = await admin.post('/api/admin/jobs', jobPayload({ title: 'Closed Role', publish: true }));
    closedJobId = closed.json.id;
    assert.equal((await admin.post(`/api/admin/jobs/${closedJobId}/status`, { action: 'close' })).status, 200);
    const draft = await admin.post('/api/admin/jobs', jobPayload({ title: 'Draft Role' }));
    assert.equal(draft.status, 201);
    const sales = await admin.post('/api/admin/jobs', jobPayload({ title: 'Sales Lead', category_id: 4, skills: 'Sales, CRM', salary_min: 900000, salary_max: 1500000, location: 'Mumbai', employment_type: 'Contract', work_mode: 'Remote', experience_level: '3-5 years', publish: true }));
    assert.equal(sales.status, 201);
  });

  test('public listing shows only published jobs and filters work', async () => {
    const c = await newClient();
    const all = await c.get('/api/jobs');
    assert.deepEqual(all.json.jobs.map((j) => j.title).sort(), ['Python Data Engineer', 'Sales Lead']);
    assert.equal((await c.get('/api/jobs?category=4')).json.total, 1);
    assert.equal((await c.get('/api/jobs?category=1')).json.total, 1);
    assert.equal((await c.get('/api/jobs?title=python')).json.total, 1);
    assert.equal((await c.get('/api/jobs?keyword=CRM')).json.total, 1);
    assert.equal((await c.get('/api/jobs?location=mumbai')).json.total, 1);
    assert.equal((await c.get('/api/jobs?type=Contract')).json.jobs[0].title, 'Sales Lead');
    assert.equal((await c.get('/api/jobs?mode=Remote')).json.total, 1);
    assert.equal((await c.get('/api/jobs?experience=3-5%20years')).json.total, 1);
    assert.equal((await c.get('/api/jobs?salaryMin=1000000')).json.total, 1);
    assert.equal((await c.get('/api/jobs?title=%25')).json.total, 0); // wildcard characters are escaped
    assert.equal((await c.get(`/api/jobs/${jobId}`)).json.job.skills.length, 4);
  });

  test('draft jobs are not publicly visible', async () => {
    const c = await newClient();
    const list = await admin.get('/api/admin/jobs?status=draft');
    const id = list.json.jobs[0].id;
    assert.equal((await c.get(`/api/jobs/${id}`)).status, 404);
  });

  test('editing, unpublishing and deleting rules', async () => {
    const list = await admin.get('/api/admin/jobs?status=draft');
    const id = list.json.jobs[0].id;
    const upd = await admin.put(`/api/admin/jobs/${id}`, jobPayload({ title: 'Draft Role Edited' }));
    assert.equal(upd.status, 200);
    assert.equal((await admin.post(`/api/admin/jobs/${id}/status`, { action: 'publish' })).status, 200);
    assert.equal((await admin.post(`/api/admin/jobs/${id}/status`, { action: 'unpublish' })).status, 200);
    assert.equal((await admin.del(`/api/admin/jobs/${id}`)).status, 200);
  });
});

describe('student accounts', () => {
  test('duplicate registration is prevented (case-insensitive)', async () => {
    const c = await newClient();
    const r = await c.post('/api/auth/student/register', {
      full_name: 'Alice Again', email: 'ALICE@test.local', contact_number: '9876543210', password: 'Student123', confirm_password: 'Student123', graduation_year: 2025
    });
    assert.equal(r.status, 409);
  });

  test('registration validates input', async () => {
    const c = await newClient();
    const r = await c.post('/api/auth/student/register', { full_name: 'X', email: 'nope', contact_number: '1', password: 'short', confirm_password: 'different' });
    assert.equal(r.status, 422);
    assert.ok(r.json.fields.email && r.json.fields.password && r.json.fields.confirm_password && r.json.fields.full_name);
  });

  test('login, logout and protected routes', async () => {
    const c = await newClient();
    assert.equal((await c.get('/api/student/dashboard')).status, 401);
    const bad = await c.post('/api/auth/student/login', { email: 'alice@test.local', password: 'wrong-pass1' });
    assert.equal(bad.status, 401);
    const ok = await c.post('/api/auth/student/login', { email: 'alice@test.local', password: 'Student123' });
    assert.equal(ok.status, 200);
    c.csrf = ok.json.csrfToken;
    assert.equal((await c.get('/api/student/dashboard')).status, 200);
    await c.post('/api/auth/logout', {});
    assert.equal((await c.get('/api/student/dashboard')).status, 401);
  });

  test('passwords are stored hashed and never returned', async () => {
    const row = ctx.db.get("SELECT password_hash FROM users WHERE email = 'alice@test.local'");
    assert.match(row.password_hash, /^\$2[aby]\$/);
    const dash = await alice.get('/api/student/dashboard');
    assert.ok(!JSON.stringify(dash.json).includes('password'));
  });

  test('profile can be updated', async () => {
    const r = await alice.put('/api/student/profile', {
      full_name: 'Alice Rao', contact_number: '+91 9876543210', college: 'Test University', degree: "Bachelor's degree",
      specialisation: 'Computer Science', graduation_year: 2025, skills: 'Python, SQL, Machine Learning', experience: '1 year experience building data pipelines', experience_years: 1, location: 'Bengaluru'
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.profile.skills, 'Python, SQL, Machine Learning');
  });

  test('student routes reject admin-only login and vice versa', async () => {
    const c = await newClient();
    assert.equal((await c.post('/api/auth/admin/login', { email: 'alice@test.local', password: 'Student123' })).status, 401);
    assert.equal((await c.post('/api/auth/student/login', { email: ADMIN.email, password: ADMIN.password })).status, 401);
  });

  test('login rate limiting per account', async () => {
    const c = await newClient();
    let last;
    for (let i = 0; i < 7; i += 1) last = await c.post('/api/auth/student/login', { email: 'bob@test.local', password: 'wrongpass1' });
    assert.equal(last.status, 429);
    // correct password is also blocked while locked out
    const blocked = await c.post('/api/auth/student/login', { email: 'bob@test.local', password: 'Student123' });
    assert.equal(blocked.status, 429);
    ctx.db.run("DELETE FROM rate_limits WHERE bucket LIKE 'loginfail:%'");
  });

  test('password reset flow is single-use', async () => {
    const c = await newClient();
    const r = await c.post('/api/auth/student/forgot-password', { email: 'bob@test.local' });
    assert.equal(r.status, 200);
    const unknown = await c.post('/api/auth/student/forgot-password', { email: 'ghost@test.local' });
    assert.equal(unknown.json.message, r.json.message); // no account enumeration
    // We cannot read the e-mailed token, so create one the way the route does.
    const sec = require('../server/security');
    const token = sec.randomToken(32);
    const bobRow = ctx.db.get("SELECT id FROM users WHERE email = 'bob@test.local'");
    ctx.db.run('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?,?,?)', bobRow.id, sec.sha256(token), sec.sqlDate(new Date(Date.now() + 600000)));
    const done = await c.post('/api/auth/student/reset-password', { token, password: 'NewStudent456', confirm_password: 'NewStudent456' });
    assert.equal(done.status, 200);
    assert.equal((await c.post('/api/auth/student/reset-password', { token, password: 'Another789a', confirm_password: 'Another789a' })).status, 400);
    assert.equal((await c.post('/api/auth/student/reset-password', { token: 'bogus', password: 'Another789a', confirm_password: 'Another789a' })).status, 400);
    const login = await c.post('/api/auth/student/login', { email: 'bob@test.local', password: 'NewStudent456' });
    assert.equal(login.status, 200);
    bob.csrf = login.json.csrfToken;
    bob.cookie = c.cookie;
  });
});

describe('resume upload', () => {
  test('rejects invalid files', async () => {
    assert.equal((await alice.upload('/api/student/resume', 'cv.exe', Buffer.from('MZ....'))).status, 422);
    assert.equal((await alice.upload('/api/student/resume', 'fake.pdf', Buffer.from('this is not a pdf'))).status, 422);
    assert.equal((await alice.upload('/api/student/resume', 'fake.docx', Buffer.from('not a zip'))).status, 422);
    assert.equal((await alice.upload('/api/student/resume', 'bin.txt', Buffer.from([0, 1, 2, 3, 0, 0]))).status, 422);
    assert.equal((await alice.upload('/api/student/resume', 'empty.txt', Buffer.alloc(0))).status, 422);
    const big = Buffer.alloc(6 * 1024 * 1024, 'a');
    assert.equal((await alice.upload('/api/student/resume', 'big.txt', big)).status, 413);
  });

  test('accepts TXT, replaces with PDF and DOCX, extracts skills', async () => {
    const txt = await alice.upload('/api/student/resume', 'resume.txt', Buffer.from(
      'Alice Rao\nBachelor of Technology in Computer Science\n2 years of experience\nSkills: Python, SQL, Machine Learning, Data Analysis, Git, Docker\nBuilt REST APIs with Flask.'));
    assert.equal(txt.status, 201);
    assert.ok(txt.json.resume.skills_found.includes('Python'));
    assert.ok(txt.json.resume.skills_found.includes('Docker'));
    assert.equal(txt.json.resume.original_name, 'resume.txt');

    const pdf = await alice.upload('/api/student/resume', 'resume.pdf', fs.readFileSync(path.join(__dirname, 'fixtures', 'resume-sample.pdf')));
    assert.equal(pdf.status, 201, JSON.stringify(pdf.json));
    assert.ok(pdf.json.resume.skills_found.includes('Python'));

    const docx = await alice.upload('/api/student/resume', 'resume.docx', makeDocx(['Alice Rao', 'Skills: Python, SQL, Machine Learning, Data Analysis, Git, Docker', '2 years of experience', 'Bachelor of Technology in Computer Science']));
    assert.equal(docx.status, 201, JSON.stringify(docx.json));
    assert.equal(docx.json.resume.original_name, 'resume.docx');
    const current = await alice.get('/api/student/resume');
    assert.equal(current.json.resume.original_name, 'resume.docx');
    assert.equal(ctx.db.get('SELECT COUNT(*) AS n FROM resumes WHERE is_current = 1').n, 1);
  });

  test('resumes are not reachable through public URLs and stored outside web root', async () => {
    const stored = ctx.db.get('SELECT stored_name FROM resumes WHERE is_current = 1').stored_name;
    const c = await newClient();
    for (const p of [`/storage/resumes/${stored}`, `/resumes/${stored}`, `/assets/${stored}`, `/${stored}`, '/data/test.sqlite', '/server/config.js', '/.env', '/package.json']) {
      const r = await c.get(p);
      assert.equal(r.status, 404, `${p} must not be served`);
    }
    assert.equal((await c.get('/api/student/resume/download')).status, 401);
    const ok = await alice.request('GET', '/api/student/resume/download', { raw: true });
    assert.equal(ok.status, 200);
    assert.match(ok.headers.get('content-disposition'), /attachment/);
  });
});

describe('job matching', () => {
  test('match percentages are computed from real data', async () => {
    const m = await alice.get(`/api/student/jobs/${jobId}/match`);
    assert.equal(m.status, 200);
    const match = m.json.match;
    // Job skills: Python, SQL, Machine Learning, Data Analysis. The resume contains all four.
    assert.deepEqual(match.matching_skills.sort(), ['Data Analysis', 'Machine Learning', 'Python', 'SQL']);
    assert.deepEqual(match.missing_skills, []);
    assert.ok(match.score >= 85 && match.score <= 100, `score was ${match.score}`);
    assert.ok(match.additional_skills.includes('Docker'));
    assert.ok(match.reasons.length > 0);
    assert.equal(match.breakdown.skills.score, 100);
  });

  test('different candidates get different, deterministic scores', async () => {
    await bob.put('/api/student/profile', {
      full_name: 'Bob Nair', contact_number: '+91 9876543210', college: 'X', degree: 'Diploma', specialisation: 'Commerce', graduation_year: 2025,
      skills: 'Python, Excel', experience: '', location: 'Pune'
    });
    const a = (await alice.get(`/api/student/jobs/${jobId}/match`)).json.match;
    const b1 = (await bob.get(`/api/student/jobs/${jobId}/match`)).json.match;
    const b2 = (await bob.get(`/api/student/jobs/${jobId}/match`)).json.match;
    assert.ok(b1.score < a.score);
    assert.equal(b1.score, b2.score);
    assert.deepEqual(b1.matching_skills, ['Python']);
    assert.deepEqual(b1.missing_skills.sort(), ['Data Analysis', 'Machine Learning', 'SQL']);
  });

  test('recommendations are ranked and insufficient data is explained', async () => {
    const rec = await alice.get('/api/student/recommendations');
    assert.equal(rec.json.sufficient, true);
    assert.equal(rec.json.results[0].job.title, 'Python Data Engineer');
    for (let i = 1; i < rec.json.results.length; i += 1) assert.ok(rec.json.results[i - 1].match.score >= rec.json.results[i].match.score);

    const empty = await registerStudent('Empty Profile', 'empty@test.local');
    await empty.put('/api/student/profile', { full_name: 'Empty Profile', contact_number: '9876543210', graduation_year: 2025, skills: '' });
    const r = await empty.get('/api/student/recommendations');
    assert.equal(r.json.sufficient, false);
    assert.match(r.json.message, /more information/i);
  });

  test('matching engine unit behaviour', () => {
    const m = require('../server/matching');
    const cand = m.buildCandidate({ skills: 'Python, SQL', degree: "Bachelor's", experience_years: 2 }, { extracted_text: 'Experienced with Python and SQL and Django.' });
    const job = { title: 'Python Developer', skills: 'Python, SQL, Django, Docker', qualifications: "Bachelor's degree", experience_years_min: 2, category_name: 'Information Technology (IT) & Software', description: 'Build python services.' };
    const r = m.scoreJob(cand, job);
    assert.deepEqual(r.matchingSkills.sort(), ['Django', 'Python', 'SQL']);
    assert.deepEqual(r.missingSkills, ['Docker']);
    assert.equal(r.breakdown.skills.score, 75);
    assert.equal(r.breakdown.experience.score, 100);
    assert.equal(m.scoreJob(cand, { ...job, skills: 'Welding' }).breakdown.skills.score, 0);
  });
});

describe('applications and tracking', () => {
  let code;

  test('application requires confirmation, resume and an open job', async () => {
    const base = { job_id: jobId, applicant_name: 'Alice Rao', applicant_email: 'alice@test.local', applicant_phone: '+91 9876543210', cover_letter: 'Hello' };
    assert.equal((await alice.post('/api/student/applications', base)).status, 422); // not confirmed
    assert.equal((await alice.post('/api/student/applications', { ...base, job_id: closedJobId, confirmed: true })).status, 409);
    const noResume = await registerStudent('No Resume', 'noresume@test.local');
    assert.equal((await noResume.post('/api/student/applications', { ...base, confirmed: true })).status, 422);
    assert.equal((await alice.post('/api/student/applications', { ...base, job_id: 99999, confirmed: true })).status, 404);
  });

  test('past-deadline jobs cannot receive applications', async () => {
    const r = await admin.post('/api/admin/jobs', jobPayload({ title: 'Expiring Role', publish: true }));
    ctx.db.run("UPDATE jobs SET deadline = '2000-01-01' WHERE id = ?", r.json.id);
    const res = await alice.post('/api/student/applications', {
      job_id: r.json.id, applicant_name: 'Alice Rao', applicant_email: 'alice@test.local', applicant_phone: '+91 9876543210', confirmed: true
    });
    assert.equal(res.status, 409);
    const pub = await newClient();
    assert.ok(!(await pub.get('/api/jobs')).json.jobs.some((j) => j.id === r.json.id));
  });

  test('submits an application, generates an ID, blocks duplicates', async () => {
    const body = { job_id: jobId, applicant_name: 'Alice Rao', applicant_email: 'alice@test.local', applicant_phone: '+91 9876543210', cover_letter: 'I am keen.', relevant_info: 'Built ETL pipelines', confirmed: true };
    const r = await alice.post('/api/student/applications', body);
    assert.equal(r.status, 201, JSON.stringify(r.json));
    code = r.json.application_id;
    assert.match(code, /^CTS-\d{4}-[A-Z0-9]{6}$/);
    const dup = await alice.post('/api/student/applications', body);
    assert.equal(dup.status, 409);
    const list = await alice.get('/api/student/applications');
    assert.equal(list.json.applications.length, 1);
    assert.equal(list.json.applications[0].status, 'Application Submitted');
    assert.ok(list.json.applications[0].match_score >= 85);
    const detail = await alice.get(`/api/student/applications/${code}`);
    assert.equal(detail.json.history.length, 1);
    const notes = await alice.get('/api/student/notifications');
    assert.ok(notes.json.notifications.some((n) => n.title === 'Application submitted'));
    assert.ok(notes.json.notifications.some((n) => n.title === 'Resume uploaded'));
    assert.ok(notes.json.notifications.some((n) => n.title === 'Registration completed'));
  });

  test("Student B cannot see Student A's application, resume or notifications", async () => {
    assert.equal((await bob.get(`/api/student/applications/${code}`)).status, 404);
    assert.equal((await bob.post(`/api/student/applications/${code}/withdraw`, {})).status, 404);
    assert.equal((await bob.get('/api/student/applications')).json.applications.length, 0);
    const aliceResumeId = ctx.db.get('SELECT id FROM resumes WHERE is_current = 1').id;
    assert.equal((await bob.get(`/api/student/resumes/${aliceResumeId}/download`)).status, 404);
    const bobNotes = (await bob.get('/api/student/notifications')).json.notifications;
    assert.ok(!bobNotes.some((n) => /Application submitted/.test(n.title)));
  });

  test('students cannot change status or reach admin endpoints', async () => {
    assert.equal((await alice.post(`/api/admin/applications/${code}/status`, { status: 'Selected' })).status, 403);
    assert.equal((await alice.get('/api/admin/overview')).status, 403);
    assert.equal((await alice.get('/api/admin/candidates')).status, 403);
    assert.equal((await alice.get(`/api/admin/applications/${code}/resume`)).status, 403);
    assert.equal((await alice.get('/api/admin/audit')).status, 403);
    const anon = await newClient();
    assert.equal((await anon.get('/api/admin/overview')).status, 401);
  });

  test('admin status changes appear in the student timeline with notifications', async () => {
    const overview = await admin.get('/api/admin/overview');
    assert.equal(overview.json.counts.students, 4);
    assert.equal(overview.json.counts.applications, 1);

    assert.equal((await admin.post(`/api/admin/applications/${code}/status`, { status: 'Not A Status' })).status, 422);
    const review = await admin.post(`/api/admin/applications/${code}/status`, { status: 'Under Review', message: 'We are reviewing your profile.' });
    assert.equal(review.status, 200);
    assert.equal((await admin.post(`/api/admin/applications/${code}/status`, { status: 'Under Review' })).status, 422);
    assert.equal((await admin.post(`/api/admin/applications/${code}/status`, { status: 'Shortlisted' })).status, 200);
    const noDate = await admin.post(`/api/admin/applications/${code}/status`, { status: 'Interview Scheduled' });
    assert.equal(noDate.status, 422);
    const iv = await admin.post(`/api/admin/applications/${code}/status`, { status: 'Interview Scheduled', interview_at: '2030-05-01T10:30', interview_details: 'Video call link will be emailed.' });
    assert.equal(iv.status, 200);

    const note = await admin.post(`/api/admin/applications/${code}/notes`, { note: 'CONFIDENTIAL recruiter note: strong candidate' });
    assert.equal(note.status, 201);

    const detail = await alice.get(`/api/student/applications/${code}`);
    assert.equal(detail.json.application.status, 'Interview Scheduled');
    assert.deepEqual(detail.json.history.map((h) => h.new_status), ['Application Submitted', 'Under Review', 'Shortlisted', 'Interview Scheduled']);
    assert.equal(detail.json.history[1].previous_status, 'Application Submitted');
    assert.equal(detail.json.history[1].message, 'We are reviewing your profile.');
    assert.ok(detail.json.application.interview_details.includes('Video call'));

    const raw = JSON.stringify(detail.json);
    assert.ok(!raw.includes('CONFIDENTIAL'), 'internal notes must never reach students');
    assert.ok(!/changed_by|admin_id|admin_name/.test(raw), 'admin identity must never reach students');

    const notes = (await alice.get('/api/student/notifications')).json;
    for (const t of ['Application under review', 'You have been shortlisted', 'Interview scheduled']) {
      assert.ok(notes.notifications.some((n) => n.title === t), `missing notification: ${t}`);
    }
    assert.ok(notes.unread >= 3);
    await alice.post('/api/student/notifications/read', {});
    assert.equal((await alice.get('/api/student/notifications')).json.unread, 0);

    const adminDetail = await admin.get(`/api/admin/applications/${code}`);
    assert.equal(adminDetail.json.notes.length, 1);
    assert.equal(adminDetail.json.history[1].admin_name, 'Test Admin');

    const dash = (await alice.get('/api/student/dashboard')).json;
    assert.equal(dash.counts.total, 1);
    assert.equal(dash.counts.interviews, 1);
  });

  test('interview update, selection, and withdrawal rules', async () => {
    const upd = await admin.post(`/api/admin/applications/${code}/status`, { status: 'Interview Scheduled', interview_at: '2030-05-02T11:00' });
    assert.equal(upd.status, 200);
    assert.ok((await alice.get('/api/student/notifications')).json.notifications.some((n) => n.title === 'Interview updated'));
    assert.equal((await admin.post(`/api/admin/applications/${code}/status`, { status: 'Selected' })).status, 200);
    assert.equal((await alice.post(`/api/student/applications/${code}/withdraw`, {})).status, 409);
  });

  test('withdrawal and admin-approved reapplication', async () => {
    const body = { job_id: jobId, applicant_name: 'Bob Nair', applicant_email: 'bob@test.local', applicant_phone: '+91 9876543210', confirmed: true };
    await bob.upload('/api/student/resume', 'bob.txt', Buffer.from('Bob Nair. Skills: Python, Excel. Diploma in Commerce.'));
    const first = await bob.post('/api/student/applications', body);
    assert.equal(first.status, 201);
    const w = await bob.post(`/api/student/applications/${first.json.application_id}/withdraw`, {});
    assert.equal(w.status, 200);
    assert.equal((await bob.get(`/api/student/applications/${first.json.application_id}`)).json.application.status, 'Withdrawn');
    assert.equal((await bob.post('/api/student/applications', body)).status, 409);
    assert.equal((await admin.post(`/api/admin/applications/${first.json.application_id}/allow-reapply`, { allow: true })).status, 200);
    const second = await bob.post('/api/student/applications', body);
    assert.equal(second.status, 201);
    assert.notEqual(second.json.application_id, first.json.application_id);
    assert.equal((await bob.get('/api/student/applications')).json.applications.length, 1);
  });
});

describe('admin candidate and application management', () => {
  test('candidates can be searched and filtered', async () => {
    const all = await admin.get('/api/admin/candidates');
    assert.equal(all.json.candidates.length, 4);
    assert.equal((await admin.get('/api/admin/candidates?q=alice')).json.candidates.length, 1);
    assert.equal((await admin.get('/api/admin/candidates?status=Selected')).json.candidates.length, 1);
    assert.equal((await admin.get(`/api/admin/candidates?job=${jobId}`)).json.candidates.length, 2);
    assert.equal((await admin.get('/api/admin/candidates?category=1')).json.candidates.length, 2);
    assert.equal((await admin.get('/api/admin/candidates?category=2')).json.candidates.length, 0);
    const id = all.json.candidates.find((c) => c.email === 'alice@test.local').id;
    const detail = await admin.get(`/api/admin/candidates/${id}`);
    assert.equal(detail.json.resume.original_name, 'resume.docx');
    assert.equal(detail.json.applications.length, 1);
    assert.ok(!JSON.stringify(detail.json).includes('password'));
    const dl = await admin.request('GET', `/api/admin/candidates/${id}/resume`, { raw: true });
    assert.equal(dl.status, 200);
  });

  test('applications can be filtered and resume downloaded by admin', async () => {
    assert.equal((await admin.get('/api/admin/applications?status=Selected')).json.applications.length, 1);
    assert.equal((await admin.get('/api/admin/applications?q=Python')).json.applications.length, 2);
    const code = (await admin.get('/api/admin/applications?status=Selected')).json.applications[0].application_id;
    const dl = await admin.request('GET', `/api/admin/applications/${code}/resume`, { raw: true });
    assert.equal(dl.status, 200);
  });

  test('audit log records administrative operations', async () => {
    const logs = (await admin.get('/api/admin/audit')).json.logs.map((l) => l.action);
    for (const a of ['admin.login', 'job.create', 'job.close', 'job.update', 'application.status', 'application.note', 'resume.download']) {
      assert.ok(logs.includes(a), `audit log missing ${a}`);
    }
  });

  test('jobs with applications cannot be deleted', async () => {
    assert.equal((await admin.del(`/api/admin/jobs/${jobId}`)).status, 409);
  });
});

describe('page protection', () => {
  test('portal pages redirect unauthenticated visitors; public pages are served', async () => {
    const c = await newClient();
    for (const p of ['/student-portal/dashboard', '/student-portal/profile', '/student-portal/resume', '/admin-portal/dashboard', '/admin-portal/jobs']) {
      const r = await c.get(p);
      assert.equal(r.status, 302, p);
      assert.match(r.headers.get('location'), /\/(student|admin)-portal\/login/);
    }
    assert.equal((await alice.get('/admin-portal/dashboard')).status, 302);
    assert.equal((await admin.get('/student-portal/dashboard')).status, 302);
    assert.equal((await alice.get('/student-portal/dashboard')).status, 200);
    assert.equal((await admin.get('/admin-portal/dashboard')).status, 200);
    assert.equal((await c.get('/student-portal/login')).status, 200);
    assert.equal((await c.get('/admin-portal/login')).status, 200);
    assert.equal((await c.get('/careers.html')).status, 200);
    assert.equal((await c.get('/does-not-exist.html')).status, 404);
  });
});

describe('resume builder', () => {
  let docId;
  const BASE = '/api/student/resume-builder';

  test('requires a student session', async () => {
    const anon = await newClient();
    assert.equal((await anon.get(`${BASE}/documents`)).status, 401);
    assert.equal((await admin.get(`${BASE}/documents`)).status, 403);
  });

  test('creates a document pre-filled from the profile, rejects unknown templates', async () => {
    assert.equal((await alice.post(`${BASE}/documents`, { template: 'nope' })).status, 422);
    const r = await alice.post(`${BASE}/documents`, { template: 'modern', accent: '#336699', font: 'serif' });
    assert.equal(r.status, 201);
    docId = r.json.id;
    const doc = (await alice.get(`${BASE}/documents/${docId}`)).json.document;
    assert.equal(doc.template, 'modern');
    assert.equal(doc.data.personal.full_name, 'Alice Rao');
    assert.equal(doc.data.personal.email, 'alice@test.local');
    assert.equal(doc.data.settings.accent, '#336699');
    assert.equal(doc.data.settings.font, 'serif');
    assert.ok(doc.data.skills[0].items.includes('Python'));
  });

  test('all 10 templates are accepted', async () => {
    const { TEMPLATES } = require('../server/resumeBuilder');
    assert.equal(TEMPLATES.length, 10);
    for (const t of TEMPLATES) {
      const r = await alice.put(`${BASE}/documents/${docId}`, { template: t, data: (await alice.get(`${BASE}/documents/${docId}`)).json.document.data });
      assert.equal(r.status, 200, t);
    }
  });

  test('saves edits and sanitises input', async () => {
    const cur = (await alice.get(`${BASE}/documents/${docId}`)).json.document;
    const data = cur.data;
    data.summary = 'Data engineer. '.repeat(200);
    data.settings = { accent: 'javascript:alert(1)', font: 'comic' };
    data.experience = [{ title: 'Data Engineer', company: 'Acme', location: '', start: 'Jan 2024', end: '', current: true, bullets: '- Built pipelines\n* Wrote SQL' }];
    data.skills = [{ name: 'Core', items: 'Python, SQL, Docker' }];
    data.bogus = 'x';
    const r = await alice.put(`${BASE}/documents/${docId}`, { title: 'Alice Data Resume', template: 'minimal', data });
    assert.equal(r.status, 200);
    const saved = (await alice.get(`${BASE}/documents/${docId}`)).json.document;
    assert.equal(saved.title, 'Alice Data Resume');
    assert.equal(saved.template, 'minimal');
    assert.ok(saved.data.summary.length <= 1200);
    assert.equal(saved.data.settings.accent, '#E8743B');
    assert.equal(saved.data.settings.font, 'sans');
    assert.equal(saved.data.bogus, undefined);
    assert.equal(saved.data.experience[0].current, true);
    assert.equal((await alice.put(`${BASE}/documents/${docId}`, { template: 'bad', data })).status, 422);
  });

  test("Student B cannot read, change, copy or delete Student A's resume", async () => {
    assert.equal((await bob.get(`${BASE}/documents/${docId}`)).status, 404);
    assert.equal((await bob.put(`${BASE}/documents/${docId}`, { data: {} })).status, 404);
    assert.equal((await bob.post(`${BASE}/documents/${docId}/duplicate`, {})).status, 404);
    assert.equal((await bob.post(`${BASE}/documents/${docId}/use-for-matching`, {})).status, 404);
    assert.equal((await bob.del(`${BASE}/documents/${docId}`)).status, 404);
    assert.equal((await bob.get(`${BASE}/documents`)).json.documents.length, 0);
  });

  test('duplicate, list and delete', async () => {
    const dup = await alice.post(`${BASE}/documents/${docId}/duplicate`, {});
    assert.equal(dup.status, 201);
    assert.equal((await alice.get(`${BASE}/documents`)).json.documents.length, 2);
    assert.equal((await alice.del(`${BASE}/documents/${dup.json.id}`)).status, 200);
    assert.equal((await alice.get(`${BASE}/documents`)).json.documents.length, 1);
  });

  test('a student can keep at most 10 resumes', async () => {
    for (let i = 0; i < 12; i += 1) {
      const r = await bob.post(`${BASE}/documents`, { template: 'chronological' });
      if (i < 10) assert.equal(r.status, 201); else assert.equal(r.status, 409);
    }
  });

  test('"use for job matching" makes the built resume the current resume and detects skills', async () => {
    const r = await alice.post(`${BASE}/documents/${docId}/use-for-matching`, {});
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.ok(r.json.skills_found.includes('Python') && r.json.skills_found.includes('Docker'));
    const cur = (await alice.get('/api/student/resume')).json.resume;
    assert.equal(cur.original_name, 'Alice Data Resume.txt');
    assert.equal(ctx.db.get('SELECT COUNT(*) AS n FROM resumes WHERE student_id = (SELECT id FROM student_profiles WHERE user_id = (SELECT id FROM users WHERE email = ?)) AND is_current = 1', 'alice@test.local').n, 1);
    const rec = (await alice.get('/api/student/recommendations')).json;
    assert.equal(rec.sufficient, true);
  });

  test('an almost empty resume cannot be used for matching', async () => {
    const c = await registerStudent('Blank Person', 'blank@test.local');
    const d = (await c.post(`${BASE}/documents`, { template: 'mini' })).json.id;
    const doc = (await c.get(`${BASE}/documents/${d}`)).json.document;
    doc.data.personal = { full_name: '' }; doc.data.skills = []; doc.data.education = []; doc.data.experience = [];
    await c.put(`${BASE}/documents/${d}`, { data: doc.data });
    assert.equal((await c.post(`${BASE}/documents/${d}/use-for-matching`, {})).status, 422);
  });

  test('builder pages are protected', async () => {
    const anon = await newClient();
    assert.equal((await anon.get('/student-portal/resume-builder')).status, 302);
    assert.equal((await anon.get('/student-portal/resume-editor?id=1')).status, 302);
    assert.equal((await alice.get('/student-portal/resume-builder')).status, 200);
    assert.equal((await alice.get('/student-portal/resume-editor?id=1')).status, 200);
  });
});
