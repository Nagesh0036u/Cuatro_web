'use strict';

const db = require('../server/db');
const demo = require('../server/demoJobs');

function seedDemoJobs() {
  const existing = db.get('SELECT COUNT(*) AS n FROM jobs WHERE is_demo = 1').n;
  if (existing > 0) return 0;
  const deadline = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  let n = 0;
  demo.forEach((j) => {
    const cat = db.get('SELECT id FROM categories WHERE name = ?', j.category);
    if (!cat) throw new Error(`Unknown category: ${j.category}`);
    db.run(
      `INSERT INTO jobs (title, category_id, description, short_description, responsibilities, skills, qualifications, experience_level,
         experience_years_min, location, employment_type, work_mode, salary_min, salary_max, salary_text, status, is_demo, posted_at, deadline)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'published', 1, datetime('now'), ?)`,
      j.title, cat.id, j.description, j.short_description, j.responsibilities, j.skills, j.qualifications, j.experience_level,
      j.experience_years_min, j.location, j.employment_type, j.work_mode, j.salary_min || null, j.salary_max || null, j.salary_text || null, deadline);
    n += 1;
  });
  return n;
}

if (require.main === module) {
  db.open();
  const n = seedDemoJobs();
  console.log(n ? `Seeded ${n} demonstration job records (clearly labelled as demonstration listings).` : 'Demonstration jobs already exist. Nothing to do.');
}

module.exports = { seedDemoJobs };
