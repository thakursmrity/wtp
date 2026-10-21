// Postgres access. Works with any Postgres (Neon, Supabase, Vercel Postgres).
// Set DATABASE_URL in Vercel. Tables are created on first use, with a wtp_ prefix
// so they never collide with other projects sharing the same database.

import pg from 'pg';

let pool;
const ready = new WeakMap();

export function getPool() {
  if (globalThis.__WTP_TEST_POOL) return globalThis.__WTP_TEST_POOL;
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      idleTimeoutMillis: 10000,
    });
  }
  return pool;
}

async function ensureSchema(p) {
  if (ready.has(p)) return ready.get(p);
  const job = (async () => {
    await p.query(`CREATE TABLE IF NOT EXISTS wtp_messages (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      note TEXT NOT NULL DEFAULT '',
      ip_hash TEXT NOT NULL
    )`);
    await p.query(`CREATE TABLE IF NOT EXISTS wtp_login_attempts (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ip_hash TEXT NOT NULL
    )`);
  })();
  ready.set(p, job);
  try {
    await job;
  } catch (err) {
    ready.delete(p);
    throw err;
  }
  return job;
}

export async function query(text, params) {
  const p = getPool();
  await ensureSchema(p);
  return p.query(text, params);
}
