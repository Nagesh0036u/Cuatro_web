'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');
const { CATEGORIES } = require('./categories');

let db = null;

function open(dbPath = config.dbPath) {
  if (db) return db;
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  migrate(db);
  return db;
}

function migrate(conn) {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  conn.exec(schema);
  const insert = conn.prepare('INSERT OR IGNORE INTO categories (name, sort_order) VALUES (?, ?)');
  CATEGORIES.forEach((name, i) => insert.run(name, i + 1));
  conn.prepare('INSERT OR IGNORE INTO schema_migrations (name) VALUES (?)').run('001_init');
}

function clean(params) {
  return params.map((p) => (p === undefined ? null : typeof p === 'boolean' ? (p ? 1 : 0) : p));
}

function get(sql, ...params) { return open().prepare(sql).get(...clean(params)); }
function all(sql, ...params) { return open().prepare(sql).all(...clean(params)); }
function run(sql, ...params) { return open().prepare(sql).run(...clean(params)); }

function transaction(fn) {
  const conn = open();
  conn.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    conn.exec('COMMIT');
    return result;
  } catch (err) {
    try { conn.exec('ROLLBACK'); } catch (_) { /* already rolled back */ }
    throw err;
  }
}

function close() {
  if (db) { db.close(); db = null; }
}

module.exports = { open, get, all, run, transaction, close };
