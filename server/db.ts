import pg from 'pg';
import { Pool as NeonPool } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolves the project root from either layout: `server/` under tsx, or
 * `dist/server/` after compilation — so the built client is always found
 * in the same place.
 */
function findProjectRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 5; i += 1) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(start, '..');
}

export const PROJECT_ROOT = findProjectRoot(here);

// ── Neon connection ──────────────────────────────────────────────────────────
// Direct (unpooled) connections are used by default because the Neon pooler
// (pgbouncer) can be unreachable from this host. Fall back to the pooled URL
// only when DATABASE_URL_UNPOOLED is not set.
function resolveDatabaseUrl(): string {
  const url =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL;
  if (url) return url;
  if (process.env.PGHOST) {
    return `postgresql://${encodeURIComponent(process.env.PGUSER || 'neondb_owner')}:${encodeURIComponent(
      process.env.PGPASSWORD || '',
    )}@${process.env.PGHOST}/${process.env.PGDATABASE || 'neondb'}`;
  }
  throw new Error('[emodulo] No database URL configured. Set DATABASE_URL in .env.');
}

const databaseUrl = resolveDatabaseUrl();

/**
 * Neon endpoints are normally reached on port 5432. Many campus, corporate and
 * VPN networks silently drop outbound 5432, which surfaces as
 * `AggregateError [ETIMEDOUT]` for every resolved address during `migrate()`.
 * The serverless driver talks to the same endpoint over WSS on port 443, so
 * Neon hosts use it while a plain Postgres (local, Docker, RDS) keeps `pg`.
 */
function isNeonUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith('.neon.tech');
  } catch {
    return false;
  }
}

interface Queryable {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
  on(event: 'error', listener: (err: Error) => void): unknown;
  end(): Promise<void>;
}

function createPool(url: string): Queryable {
  const onError = (err: Error) => console.error('[emodulo] unexpected Postgres pool error:', err);
  if (isNeonUrl(url)) {
    const neonPool = new NeonPool({ connectionString: url });
    neonPool.on('error', onError);
    return neonPool as unknown as Queryable;
  }
  const pgPool = new pg.Pool({
    connectionString: url,
    // Neon recommends a small pool per process; the default max is generous
    // enough for this single-process deployment.
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  pgPool.on('error', onError);
  return pgPool as unknown as Queryable;
}

const pool = createPool(databaseUrl);

/**
 * Neon suspends idle compute, so the first connection of a session can fail or
 * time out before the endpoint is awake. Boot-time statements are idempotent,
 * so retrying them a couple of times turns a crash-at-startup into a few
 * seconds of extra latency.
 */
async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= attempts) {
        const detail = describeError(err);
        throw new Error(`[emodulo] ${label} failed after ${attempts} attempts: ${detail}`, { cause: err });
      }
      console.warn(`[emodulo] ${label} failed (attempt ${attempt}/${attempts}): ${describeError(err)} — retrying…`);
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
    }
  }
}

/** Flattens the `AggregateError` that `pg` throws for multi-address failures. */
function describeError(err: unknown): string {
  if (err instanceof AggregateError) {
    const parts = err.errors.map(describeError).filter(Boolean);
    return parts.length ? parts.join('; ') : err.message;
  }
  if (err && typeof err === 'object') {
    const e = err as { code?: string; message?: string; error?: { message?: string; code?: string }; type?: string };
    // The serverless driver rejects with a browser-style `ErrorEvent`.
    if (e.type === 'error' && !e.message) {
      const inner = e.error;
      return `WebSocket connection to the database failed${inner?.code ? ` (${inner.code})` : ''}`;
    }
    if (e.code && e.message) return `${e.code}: ${e.message}`;
    if (e.message) return e.message;
  }
  return String(err);
}

// Minimal result objects that mirror the legacy node:sqlite API used across the
// app: `prepare(sql).run(...)` / `.get(...)` / `.all(...)`.
interface Prep {
  run(...params: unknown[]): Promise<{ rowsAffected: number }>;
  get(...params: unknown[]): Promise<Record<string, unknown> | null>;
  all(...params: unknown[]): Promise<Record<string, unknown>[]>;
}

function rowToRecord(row: Record<string, unknown>): Record<string, unknown> {
  return row;
}

/**
 * The `pg` driver expects numbered placeholders (`$1`, `$2`, …). Many call
 * sites still pass `?` placeholders from the legacy SQLite API, so the shim
 * rewrites them to `$n` before forwarding. String literals are skipped so a
 * `?` inside a quoted value is never mistaken for a bind parameter.
 */
function normalizePlaceholders(sql: string): string {
  let out = '';
  let n = 0;
  let inString = false;
  for (let i = 0; i < sql.length; i += 1) {
    const c = sql[i];
    if (inString) {
      out += c;
      if (c === "'") inString = false;
    } else if (c === "'") {
      inString = true;
      out += c;
    } else if (c === '?') {
      n += 1;
      out += `$${n}`;
    } else {
      out += c;
    }
  }
  return out;
}

export const db = {
  prepare(sql: string): Prep {
    const normalized = normalizePlaceholders(sql);
    return {
      run(...params: unknown[]) {
        return pool.query(normalized, params).then((r) => ({
          rowsAffected: Number(r.rowCount ?? 0),
        }));
      },
      get(...params: unknown[]) {
        return pool.query(normalized, params).then((r) => (r.rows[0] ? rowToRecord(r.rows[0]) : null));
      },
      all(...params: unknown[]) {
        return pool.query(normalized, params).then((r) => r.rows.map(rowToRecord));
      },
    };
  },
};

export const now = (): string => new Date().toISOString();

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  occupation: string;
  bio: string;
  avatar: string;
  role: string;
  level: string;
  created_at: string;
}

export function passwordHash(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

// ── Schema migration ─────────────────────────────────────────────────────────

/** Postgres DDL mirror of the legacy SQLite schema. Runs idempotently on
 * startup. We use `GENERATED BY DEFAULT AS IDENTITY` in place of
 * `AUTOINCREMENT`, `TEXT` in place of SQLite strings, and
 * `TIMESTAMPTZ` in place of the TEXT timestamps the app already stores as
 * ISO-8601 strings.
 */
export async function migrate(): Promise<void> {
  // Create tables.
  await withRetry('schema migration', () => pool.query(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  occupation TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT 'blue',
  role TEXT NOT NULL DEFAULT 'student',
  level TEXT NOT NULL DEFAULT 'easy',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS preferences (
  user_id INTEGER PRIMARY KEY,
  theme TEXT NOT NULL DEFAULT 'system',
  motivational INTEGER NOT NULL DEFAULT 1,
  pace TEXT NOT NULL DEFAULT 'steady',
  daily_reminders INTEGER NOT NULL DEFAULT 1,
  weekly_reminders INTEGER NOT NULL DEFAULT 1,
  email_announcements INTEGER NOT NULL DEFAULT 1,
  email_progress INTEGER NOT NULL DEFAULT 0,
  weekly_goal INTEGER NOT NULL DEFAULT 5,
  CONSTRAINT preferences_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_resets (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_slug TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, lesson_slug)
);

CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  ref_key TEXT NOT NULL,
  level TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  score INTEGER NOT NULL DEFAULT 0,
  raw_score INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  hints_used INTEGER NOT NULL DEFAULT 0,
  lives_left INTEGER,
  passed INTEGER NOT NULL DEFAULT 0,
  answers_json TEXT NOT NULL DEFAULT '{}',
  started_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS attempt_answers (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  selected INTEGER,
  is_correct INTEGER NOT NULL DEFAULT 0,
  explanation TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_slug TEXT NOT NULL,
  earned_at TEXT NOT NULL,
  PRIMARY KEY (user_id, badge_slug)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  link TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS threads (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  subject TEXT NOT NULL,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  thread_id INTEGER NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT 'eMódulo',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_events (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  points INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  issued_at TEXT NOT NULL,
  UNIQUE (user_id, level)
);

CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id, ref_key);
CREATE INDEX IF NOT EXISTS idx_events_user ON learning_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_threads_participants ON threads(student_id, instructor_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(thread_id, sender_id, read_at) WHERE read_at IS NULL;
  `));
}

export async function seed(): Promise<void> {
  await withRetry('seed', seedOnce);
}

async function seedOnce(): Promise<void> {
  // Idempotent: skip if any user already exists.
  const userCount = (await db.prepare('SELECT COUNT(*) AS c FROM users').get()) as { c: number } | null;
  if (!userCount || userCount.c > 0) return;

  const created = now();

  await db
    .prepare(
      `INSERT INTO users (email, password_hash, first_name, last_name, occupation, bio, avatar, role, level, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'instructor', 'easy', $8)`,
    )
    .run(
      'instructor@emodulo.edu',
      passwordHash('Emodulo2025!'),
      'Maria',
      'Barbacena',
      'OOP Instructor',
      'Teaching object-oriented design in C++ and C#. Ask me anything about classes, objects, or the module activities.',
      'rose',
      created,
    );

  const instructorRow = (await db.prepare('SELECT id FROM users WHERE email = $1').get('instructor@emodulo.edu')) as
    | { id: number }
    | null;
  if (instructorRow) {
    await db.prepare('INSERT INTO preferences (user_id) VALUES ($1)').run(instructorRow.id);
    const announcements = [
      ['New lesson! Introduction to Object-Oriented Programming', 'Start with the Course Overview section, then work through Inheritance, Encapsulation, Abstraction, and Polymorphism.'],
      ['Quiz next Monday: review the last module', 'Make sure you review the last module before the quiz. Your activity and pre-test scores are saved in Progress.'],
    ];
    for (const [title, body] of announcements) {
      await db
        .prepare('INSERT INTO announcements (title, body, author, created_at) VALUES ($1, $2, $3, $4)')
        .run(title, body, 'Dr. Barbacena', created);
    }
  }

  await db
    .prepare(
      `INSERT INTO users (email, password_hash, first_name, last_name, occupation, bio, avatar, role, level, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'student', 'easy', $8)`,
    )
    .run(
      'student@emodulo.edu',
      passwordHash('Emodulo2025!'),
      'Demo',
      'Learner',
      'BS Computer Science',
      'Exploring object-oriented programming one activity at a time.',
      'blue',
      created,
    );
}

// ── Helpers (unchanged shape, Postgres-backed) ────────────────────────────────

export async function addNotification(
  userId: number,
  type: string,
  title: string,
  body = '',
  link: string | null = null,
): Promise<void> {
  await db.prepare(
    'INSERT INTO notifications (user_id, type, title, body, link, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
  ).run(userId, type, title, body, link, now());
}

export async function recordEvent(userId: number, type: string, title: string, detail = '', points = 0): Promise<void> {
  await db.prepare(
    'INSERT INTO learning_events (user_id, type, title, detail, points, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
  ).run(userId, type, title, detail, points, now());
}

export async function getUserById(id: number): Promise<UserRow | undefined> {
  const row = await db.prepare('SELECT * FROM users WHERE id = $1').get(id);
  if (!row) return undefined;
  return row as unknown as UserRow;
}

export async function getUserByEmail(email: string): Promise<UserRow | undefined> {
  const row = await db.prepare('SELECT * FROM users WHERE lower(email) = $1').get(email.toLowerCase());
  if (!row) return undefined;
  return row as unknown as UserRow;
}

export async function ensurePreferences(userId: number): Promise<void> {
  const row = await db.prepare('SELECT user_id FROM preferences WHERE user_id = $1').get(userId);
  if (!row) await db.prepare('INSERT INTO preferences (user_id) VALUES ($1)').run(userId);
}
