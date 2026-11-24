'use strict';

/** One-step setup: creates the database, the first admin (from .env) and optional demonstration jobs. */
const config = require('../server/config');
const db = require('../server/db');
const { ensureInitialAdmin } = require('../server/bootstrap');
const { seedDemoJobs } = require('./seed-demo');

(async () => {
  db.open();
  console.log(`Database ready at ${config.dbPath}`);
  await ensureInitialAdmin(config);
  if (process.env.SEED_DEMO_JOBS !== 'false') {
    const n = seedDemoJobs();
    if (n) console.log(`Seeded ${n} DEMONSTRATION jobs. Delete or unpublish them in the Admin Portal when you add real vacancies.`);
  }
  console.log('Setup complete. Start the site with: npm start');
})().catch((e) => { console.error(e); process.exit(1); });
