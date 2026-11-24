'use strict';

/**
 * Usage:
 *   npm run create-admin                       (uses ADMIN_EMAIL / ADMIN_PASSWORD from .env)
 *   npm run create-admin -- you@example.com "Str0ngPassw0rd!" "Full Name"
 * Running it again for an existing admin resets that admin's password.
 */
const config = require('../server/config');
const db = require('../server/db');
const { createAdmin } = require('../server/bootstrap');

(async () => {
  const [email, password, name] = process.argv.slice(2);
  db.open();
  const res = await createAdmin({
    email: email || config.admin.email,
    password: password || config.admin.password,
    name: name || config.admin.name
  });
  console.log(res.created ? 'Administrator account created.' : 'Administrator password updated.');
})().catch((e) => { console.error(`Could not create administrator: ${e.message}`); process.exit(1); });
