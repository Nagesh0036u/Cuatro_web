-- Cuatro Tech Solutions: recruitment platform schema (SQLite)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','student')),
  contact_number TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS student_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  college TEXT,
  degree TEXT,
  specialisation TEXT,
  graduation_year INTEGER,
  skills TEXT NOT NULL DEFAULT '',          -- comma separated, as entered by the student
  experience TEXT,                          -- free text
  experience_years REAL,                    -- optional numeric value
  location TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resumes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  stored_name TEXT NOT NULL UNIQUE,         -- random file name on disk (never user supplied)
  original_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf','docx','txt')),
  file_size INTEGER NOT NULL,
  extracted_text TEXT,
  extracted_skills TEXT,                    -- JSON array
  is_current INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Uploaded',
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_resumes_student ON resumes(student_id, is_current);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  company_name TEXT NOT NULL DEFAULT 'Cuatro Tech Solutions',
  description TEXT NOT NULL,
  short_description TEXT,
  responsibilities TEXT,                    -- newline separated list
  skills TEXT NOT NULL DEFAULT '',          -- comma separated required skills
  qualifications TEXT,                      -- newline separated list
  experience_level TEXT,
  experience_years_min REAL,
  location TEXT NOT NULL,
  employment_type TEXT NOT NULL,
  work_mode TEXT NOT NULL,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'INR',
  salary_period TEXT DEFAULT 'year',
  salary_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','closed')),
  is_demo INTEGER NOT NULL DEFAULT 0,
  posted_at TEXT,
  deadline TEXT,                            -- YYYY-MM-DD
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category_id);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_code TEXT NOT NULL UNIQUE,    -- public application ID e.g. CTS-2026-8F3K2Q
  student_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
  resume_id INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT NOT NULL,
  cover_letter TEXT,
  relevant_info TEXT,
  match_score INTEGER,                      -- snapshot at submission time
  current_status TEXT NOT NULL DEFAULT 'Application Submitted',
  candidate_message TEXT,                   -- latest candidate-visible message
  next_step TEXT,
  interview_at TEXT,
  interview_details TEXT,
  reapply_allowed INTEGER NOT NULL DEFAULT 0,
  superseded INTEGER NOT NULL DEFAULT 0,
  internal_notes_count INTEGER NOT NULL DEFAULT 0,
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- one live application per student per job (an admin can allow reapplication, which supersedes the old one)
CREATE UNIQUE INDEX IF NOT EXISTS uq_application_active ON applications(student_id, job_id) WHERE superseded = 0;
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(current_status);

CREATE TABLE IF NOT EXISTS application_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  candidate_message TEXT,                   -- visible to the candidate
  changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- admin id; internal only
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_history_app ON application_status_history(application_id);

-- Private recruiter notes. NEVER returned by any student endpoint.
CREATE TABLE IF NOT EXISTS application_internal_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_student ON notifications(student_id, is_read);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  ip TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role TEXT,
  csrf_token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  contact_number TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  consent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'New',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Resume Builder: documents created by students in the portal (data is validated JSON, owned by one student)
CREATE TABLE IF NOT EXISTS resume_docs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  template TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_resume_docs_student ON resume_docs(student_id);
