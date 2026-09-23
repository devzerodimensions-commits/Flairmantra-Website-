import pg from 'pg';

const url = process.env.DATABASE_URL;
const local = /localhost|127\.0\.0\.1/.test(url || '');

export const pool = url ? new pg.Pool({
  connectionString: url,
  ssl: local ? false : {rejectUnauthorized: false},
  max: Number(process.env.PG_POOL_MAX || 5),
  idleTimeoutMillis: 30000
}) : null;

pool?.on('error', err => console.error('Postgres pool error:', err.message));

export const q = (text, params) => pool.query(text, params);

export async function migrate() {
  await q(`CREATE TABLE IF NOT EXISTS kv (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await q(`CREATE TABLE IF NOT EXISTS orders (
    id text PRIMARY KEY,
    email text,
    customer_id text,
    status text,
    total numeric(12,2),
    data jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await q('CREATE INDEX IF NOT EXISTS orders_email_idx ON orders (lower(email))');
  await q(`CREATE TABLE IF NOT EXISTS messages (
    id text PRIMARY KEY,
    data jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await q(`CREATE TABLE IF NOT EXISTS customers (
    id serial PRIMARY KEY,
    name text,
    email text UNIQUE NOT NULL,
    phone text,
    password_hash text NOT NULL,
    address jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await q(`CREATE TABLE IF NOT EXISTS admins (
    id serial PRIMARY KEY,
    name text,
    email text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL DEFAULT 'owner',
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
}

export async function getKv(keys) {
  const {rows} = await q('SELECT key, value FROM kv WHERE key = ANY($1)', [keys]);
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

export async function setKv(key, value) {
  await q(`INSERT INTO kv (key, value, updated_at) VALUES ($1, $2, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [key, JSON.stringify(value)]);
}
