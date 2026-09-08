import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { config } from './config.mjs';

const databasePath = resolve(config.dataDir, 'alliage.sqlite');
export const db = new DatabaseSync(databasePath, { timeout: 5000 });

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS records (
    entity TEXT NOT NULL,
    id TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (entity, id)
  );
  CREATE INDEX IF NOT EXISTS records_entity_created ON records(entity, created_at);

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT,
    password_salt TEXT,
    email_verified INTEGER NOT NULL DEFAULT 0,
    google_id TEXT,
    microsoft_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS auth_codes (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL COLLATE NOCASE,
    code_hash TEXT NOT NULL,
    purpose TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    consumed_at TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS auth_codes_lookup ON auth_codes(email, purpose, expires_at);

  CREATE TABLE IF NOT EXISTS oauth_states (
    state TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    redirect_to TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_log (
    id TEXT PRIMARY KEY,
    email_type TEXT NOT NULL,
    recipients TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL,
    provider_id TEXT,
    error TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS job_runs (
    job_name TEXT PRIMARY KEY,
    last_run_at TEXT NOT NULL,
    status TEXT NOT NULL,
    details TEXT
  );

  CREATE TABLE IF NOT EXISTS sequences (
    name TEXT PRIMARY KEY,
    value INTEGER NOT NULL
  );
`);

const insertRecordStatement = db.prepare(`
  INSERT INTO records (entity, id, data, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?)
`);
const upsertRecordStatement = db.prepare(`
  INSERT INTO records (entity, id, data, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(entity, id) DO UPDATE SET
    data = excluded.data,
    updated_at = excluded.updated_at
`);
const updateRecordStatement = db.prepare(`
  UPDATE records SET data = ?, updated_at = ? WHERE entity = ? AND id = ?
`);

function parseRecord(row) {
  return row ? JSON.parse(row.data) : null;
}

function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'pt-BR', { numeric: true });
}

export function getRecord(entity, id) {
  return parseRecord(db.prepare('SELECT data FROM records WHERE entity = ? AND id = ?').get(entity, id));
}

export function listRecords(entity, { filters = {}, sort = '', limit = 500, skip = 0 } = {}) {
  let rows = db.prepare('SELECT data FROM records WHERE entity = ?').all(entity).map(parseRecord);
  rows = rows.filter((record) => Object.entries(filters).every(([key, value]) => {
    const current = record[key];
    if (Array.isArray(value)) return value.includes(current);
    if (value && typeof value === 'object') return JSON.stringify(current) === JSON.stringify(value);
    return current === value;
  }));

  if (sort) {
    const descending = sort.startsWith('-');
    const field = descending ? sort.slice(1) : sort;
    rows.sort((left, right) => compareValues(left[field], right[field]) * (descending ? -1 : 1));
  }

  return rows.slice(Math.max(0, skip), Math.max(0, skip) + Math.min(Math.max(0, limit), 5000));
}

export function createRecord(entity, input, actor = null) {
  const now = new Date().toISOString();
  const record = {
    ...input,
    id: input.id || randomUUID(),
    created_date: input.created_date || now,
    updated_date: input.updated_date || now,
    ...(actor ? {
      created_by: input.created_by || actor.email,
      created_by_id: input.created_by_id || actor.id,
    } : {}),
  };
  insertRecordStatement.run(entity, record.id, JSON.stringify(record), record.created_date, record.updated_date);
  return record;
}

export function updateRecord(entity, id, patch) {
  const existing = getRecord(entity, id);
  if (!existing) return null;
  const record = { ...existing, ...patch, id, updated_date: new Date().toISOString() };
  updateRecordStatement.run(JSON.stringify(record), record.updated_date, entity, id);
  return record;
}

export function deleteRecord(entity, id) {
  return db.prepare('DELETE FROM records WHERE entity = ? AND id = ?').run(entity, id).changes > 0;
}

export function upsertImportedRecord(entity, input) {
  const now = new Date().toISOString();
  const record = {
    ...input,
    id: input.id || randomUUID(),
    created_date: input.created_date || now,
    updated_date: input.updated_date || input.created_date || now,
  };
  upsertRecordStatement.run(entity, record.id, JSON.stringify(record), record.created_date, record.updated_date);
  return record;
}

export function countRecords() {
  return Object.fromEntries(db.prepare('SELECT entity, COUNT(*) AS count FROM records GROUP BY entity ORDER BY entity').all().map(row => [row.entity, row.count]));
}

export function getAccountByEmail(email) {
  return db.prepare('SELECT * FROM accounts WHERE email = ? COLLATE NOCASE').get(email);
}

export function getAccountById(id) {
  return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
}

export function upsertAccount({ id = randomUUID(), email, passwordHash = null, passwordSalt = null, emailVerified = false, googleId = null, microsoftId = null }) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO accounts (id, email, password_hash, password_salt, email_verified, google_id, microsoft_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      password_hash = COALESCE(excluded.password_hash, accounts.password_hash),
      password_salt = COALESCE(excluded.password_salt, accounts.password_salt),
      email_verified = MAX(accounts.email_verified, excluded.email_verified),
      google_id = COALESCE(excluded.google_id, accounts.google_id),
      microsoft_id = COALESCE(excluded.microsoft_id, accounts.microsoft_id),
      updated_at = excluded.updated_at
  `).run(id, email.toLowerCase(), passwordHash, passwordSalt, emailVerified ? 1 : 0, googleId, microsoftId, now, now);
  return getAccountByEmail(email);
}

export function setAccountPassword(email, passwordHash, passwordSalt) {
  const now = new Date().toISOString();
  const existing = getAccountByEmail(email);
  if (!existing) return upsertAccount({ email, passwordHash, passwordSalt });
  db.prepare('UPDATE accounts SET password_hash = ?, password_salt = ?, updated_at = ? WHERE email = ? COLLATE NOCASE')
    .run(passwordHash, passwordSalt, now, email);
  return getAccountByEmail(email);
}

export function setAccountVerified(email, verified = true) {
  db.prepare('UPDATE accounts SET email_verified = ?, updated_at = ? WHERE email = ? COLLATE NOCASE')
    .run(verified ? 1 : 0, new Date().toISOString(), email);
}

export function saveAuthCode({ email, codeHash, purpose, expiresAt }) {
  const now = new Date().toISOString();
  db.prepare('DELETE FROM auth_codes WHERE email = ? COLLATE NOCASE AND purpose = ? AND consumed_at IS NULL').run(email, purpose);
  const id = randomUUID();
  db.prepare('INSERT INTO auth_codes (id, email, code_hash, purpose, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, email.toLowerCase(), codeHash, purpose, expiresAt, now);
  return id;
}

export function consumeAuthCode({ email, codeHash, purpose }) {
  const row = db.prepare(`
    SELECT * FROM auth_codes
    WHERE email = ? COLLATE NOCASE AND purpose = ? AND code_hash = ?
      AND consumed_at IS NULL AND expires_at > ?
    ORDER BY created_at DESC LIMIT 1
  `).get(email, purpose, codeHash, new Date().toISOString());
  if (!row) return false;
  db.prepare('UPDATE auth_codes SET consumed_at = ? WHERE id = ?').run(new Date().toISOString(), row.id);
  return true;
}

export function consumeAuthCodeByHash({ codeHash, purpose }) {
  const row = db.prepare(`
    SELECT * FROM auth_codes
    WHERE purpose = ? AND code_hash = ?
      AND consumed_at IS NULL AND expires_at > ?
    ORDER BY created_at DESC LIMIT 1
  `).get(purpose, codeHash, new Date().toISOString());
  if (!row) return null;
  db.prepare('UPDATE auth_codes SET consumed_at = ? WHERE id = ?').run(new Date().toISOString(), row.id);
  return row;
}

export function saveOauthState({ state, provider, redirectTo, expiresAt }) {
  db.prepare('DELETE FROM oauth_states WHERE expires_at <= ?').run(new Date().toISOString());
  db.prepare('INSERT INTO oauth_states (state, provider, redirect_to, expires_at) VALUES (?, ?, ?, ?)')
    .run(state, provider, redirectTo, expiresAt);
}

export function consumeOauthState(state, provider) {
  const row = db.prepare('SELECT * FROM oauth_states WHERE state = ? AND provider = ? AND expires_at > ?')
    .get(state, provider, new Date().toISOString());
  if (!row) return null;
  db.prepare('DELETE FROM oauth_states WHERE state = ?').run(state);
  return row;
}

export function getJobRun(jobName) {
  return db.prepare('SELECT * FROM job_runs WHERE job_name = ?').get(jobName);
}

export function saveJobRun(jobName, status, details = null) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO job_runs (job_name, last_run_at, status, details)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(job_name) DO UPDATE SET
      last_run_at = excluded.last_run_at,
      status = excluded.status,
      details = excluded.details
  `).run(jobName, now, status, details == null ? null : JSON.stringify(details));
  return now;
}

export function getEmailStats() {
  return Object.fromEntries(db.prepare('SELECT status, COUNT(*) AS count FROM email_log GROUP BY status').all()
    .map(row => [row.status, row.count]));
}

export function nextTrainingRequestId(year = new Date().getFullYear()) {
  const name = `training-request-${year}`;
  const prefix = `TR-${year}-`;
  db.exec('BEGIN IMMEDIATE');
  try {
    const sequence = db.prepare('SELECT value FROM sequences WHERE name = ?').get(name);
    let value;
    if (sequence) {
      value = sequence.value + 1;
      db.prepare('UPDATE sequences SET value = ? WHERE name = ?').run(value, name);
    } else {
      value = db.prepare('SELECT data FROM records WHERE entity = ?').all('TrainingRequest')
        .map(row => JSON.parse(row.data).request_id)
        .filter(requestId => requestId?.startsWith(prefix))
        .reduce((highest, requestId) => Math.max(highest, Number(requestId.slice(prefix.length)) || 0), 0) + 1;
      db.prepare('INSERT INTO sequences (name, value) VALUES (?, ?)').run(name, value);
    }
    db.exec('COMMIT');
    return `${prefix}${String(value).padStart(3, '0')}`;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
