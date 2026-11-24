# Cuatro Tech Solutions: Website, Careers, Student Portal and Admin Portal

The Ostech HTML template (design, colours, fonts, images, animations, layouts) adapted to Cuatro Tech Solutions, with a
Node.js backend and SQLite database for recruitment.

## Before you start: add the official logo files

The two supplied logo files must be copied into `assets/images/brand/` using these exact names:

| File | Used for |
| --- | --- |
| `cuatro-logo.png` | Header, footer, mobile menu, login pages |
| `cuatro-icon.png` | Favicon, apple-touch icon, preloader |

Until they are added, the pages show the alt text "Cuatro Tech Solutions" where the logo belongs.

## Prerequisites

* Node.js **22.13 or newer** (uses the built-in `node:sqlite`, so no native database driver is needed). Tested on Node 24.
* npm.

## Installation

```bash
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

Edit `.env`: at minimum set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` (10+ characters, letters and numbers).

```bash
npm run setup               # creates the database, the first admin, and DEMONSTRATION jobs
npm start                   # http://localhost:3000
```

Set `SEED_DEMO_JOBS=false` in `.env` before `npm run setup` if you do not want demonstration jobs.
Demonstration jobs are labelled "Demonstration listing" on the public site; delete them in the Admin Portal when real vacancies are added.

## Where things are

| Area | URL |
| --- | --- |
| Public site | `/` (`index.html`, `about.html`, `services.html`, five service pages, `contact.html`, `faq.html`) |
| Careers at Cuatro | `/careers.html` (listing, filters), `/job-details.html?id=` |
| Student Portal | `/student-portal/register`, `/login`, `/dashboard`, `/profile`, `/resume`, `/find-jobs`, `/applications`, `/application-details?id=`, `/notifications`, `/settings` |
| Admin Portal | `/admin-portal/login` (not linked from the public site), then `/dashboard`, `/applications`, `/jobs`, `/candidates`, `/messages`, `/audit` |

## Creating the initial admin account

Either set `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` (created on first start), or run:

```bash
npm run create-admin -- you@example.com "AStrongPassw0rd" "Your Name"
```

Running it again for an existing admin resets that admin's password. Public users cannot create admin accounts.

## Student journey

1. Visitor opens **Careers at Cuatro**, filters by any of the 19 categories, opens a job and selects **Apply Now**.
2. Unauthenticated visitors are sent to student login/registration and returned to the job afterwards.
3. After registration the student completes the profile and uploads a resume (PDF, DOCX or TXT, max 5 MB).
4. **Find Jobs > Recommended for me** ranks open jobs by match percentage. **Inspect match** shows the breakdown.
5. **Apply**: review the summary, confirm, receive an application ID like `CTS-2026-8F3K2Q`.
6. **My Applications** shows the timeline, status history, messages and next steps. Notifications appear in the portal.

## How resume matching works

`server/matching.js` is a transparent keyword and skills matcher (no external AI service is used or claimed).

1. Text is extracted from the resume (`pdf-parse`, `mammoth`, plain text).
2. Skills are detected against the editable dictionary in `server/skills.js` and merged with the skills typed in the profile.
3. Each job is scored on five criteria: skills (55), keywords (15), qualification (10), experience (10), category fit (10).
   Weights are re-normalised across the criteria that apply to the job. Every percentage is computed from real data.
4. The portal shows matching skills, skills to improve, additional skills and the reasons for the score.
5. If the profile and resume hold too little information, the student is told to add more instead of seeing a score.

`scoreJob(candidate, job)` is a pure function, so an NLP or embedding matcher can replace it later without changing routes or pages.

## How administrators manage applications

* **Jobs**: create, edit, publish, unpublish, close, reopen and delete (jobs with applications cannot be deleted, close them instead).
  Each job uses one of the 19 fixed categories and has an optional deadline. Closed or expired jobs reject new applications.
* **Applications**: open an application, download the resume, change the status (9 statuses), write a candidate-visible message,
  schedule an interview and add private notes. Every change is stored in the status history and the student is notified.
  Private notes and admin identities are never returned by student endpoints.
* **Candidates**: search and filter by category, job and status.
* **Reapplication**: duplicates are blocked unless an admin allows reapplication on that application.
* **Audit log**: logins, job changes, status changes, notes and resume downloads are recorded.

## Security summary

* Passwords hashed with bcrypt. Login rate limiting (per IP and per account), generic login errors.
* Server-side sessions (random token, hashed in the database, HttpOnly + SameSite=Lax cookie, `Secure` in production).
* CSRF token required for every state-changing API call.
* Role-based access in the API for every `/api/student/*` and `/api/admin/*` route. Student queries are scoped by the signed-in student.
  Portal HTML pages also redirect when the visitor is not signed in.
* Resumes: type checked by content (not just extension), size limited, saved under a random name in `storage/resumes`
  (outside the web root), served only by authorised routes.
* Helmet security headers and a strict Content-Security-Policy. All input validated server-side. Parameterised SQL everywhere.
* Password reset: single-use token, 30-minute expiry, hashed at rest, no account enumeration. Admin passwords are reset with `npm run create-admin`.

## E-mail

Contact form messages are always saved and visible in **Admin Portal > Contact Messages**. If you configure SMTP
(`SMTP_*` in `.env`) they are also e-mailed to `CONTACT_INBOX`, and password-reset e-mails are sent to students.
Without SMTP, reset links are printed in the server console (development only), so configure SMTP before going live.

## Development

```bash
npm run dev            # restarts on change
npm run build:site     # regenerates the HTML pages from tools/build-site.js and tools/site-content.js
npm test               # API/integration tests (isolated temp database)
npm run test:e2e       # browser test (needs Edge or Chrome and a running server: see tests/e2e/smoke.js)
```

Page copy lives in `tools/site-content.js`. The original template pages are kept untouched in `_template_reference/`.
Generated pages are the files you deploy; edit the generator and re-run `npm run build:site` for site-wide changes.

## Production deployment

1. Install Node 22.13+ on the server. Copy the project (without `node_modules`, `data`, `storage`).
2. `npm ci --omit=dev`, create `.env` with `NODE_ENV=production`, `SITE_URL=https://cuatrotechsolutions.com`,
   `COOKIE_SECURE=true`, `TRUST_PROXY=true` (behind nginx / a load balancer), SMTP settings and a strong admin password.
3. `npm run setup` (with `SEED_DEMO_JOBS=false`), then run `node server/index.js` under a process manager (pm2, systemd).
4. Terminate HTTPS at a reverse proxy and forward to the Node port.
5. Back up `data/` (SQLite file) and `storage/resumes/` regularly. Keep both outside any public folder.

## Notes

* The Google Fonts stylesheet used by the original template is still loaded from Google. Self-host Barlow if you need offline use.
* The original template's shop, blog, gallery, team, project, packages and alternate home pages were not carried over because they
  contained sample content unrelated to Cuatro. They remain in `_template_reference/`; all images stay in `assets/images`.
* Stock imagery from the template is reused as the supplied reference design. No clients, awards, testimonials or statistics were invented.

## Image credits

The page banners in `assets/images/backgrounds/banners/` are free-to-use photos from Pexels (https://www.pexels.com/license/), converted to greyscale and darkened to match the template. Pexels IDs: 3153198, 3183150, 3182812, 325229, 267350, 196644, 577585, 1595385, 3861958, 1181244, 3184292, 1181263, 270408. Replace any of them by overwriting the file with a 1920x600 image of the same name.


## Resume Builder (Student Portal)

Students open **Student Portal > Resume Builder** (`/student-portal/resume-builder`).

* **10 templates:** Classic Chronological, Skills Focus (Functional), Skills + Experience (Combination/Hybrid), Mini One-Pager, Targeted Application, Modern Sidebar, Executive Serif, Fresher / Student, Creative Bold and ATS Minimal.
* **Editor** (`/student-portal/resume-editor?id=`): personal details, summary, experience, education, projects, grouped skills, certifications, achievements, languages and a target job. Entries can be added, removed and reordered. The preview updates as you type, changes autosave, and the template, font and accent colour can be switched at any time without losing content.
* **Download PDF:** opens the browser print dialog with only the resume on an A4 page. Choose **Save as PDF** and turn off "Headers and footers". The PDF keeps real, selectable text.
* **Use for job matching:** saves a plain-text copy of the resume as the student's current resume, so job recommendations and recruiters use it.
* Each student can keep up to 10 resumes. All data is validated on the server, stored in the `resume_docs` table and only readable by its owner.
* The editor shows how many A4 pages the resume will print on. Resumes with more content than one page continue on a second page.

Run `node tests/e2e/resume-check.js` (server running on a fresh database) for a browser check of all 10 templates, including a PDF text check.
