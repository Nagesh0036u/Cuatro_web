'use strict';

const db = require('../server/db');
const config = require('../server/config');

db.open();
console.log(`Database ready at ${config.dbPath}`);
console.log(`Categories loaded: ${db.get('SELECT COUNT(*) AS n FROM categories').n}`);
