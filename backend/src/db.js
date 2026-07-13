import pg from "pg";
import { config } from "./config.js";

// PostgreSQL, via node-postgres. Call sites already use `$1` placeholders
// and `await query(...)`, so no route changes are needed for this backend.

// created_at/updated_at are BIGINT (epoch ms). node-postgres returns BIGINT
// (OID 20) as a string by default to avoid precision loss beyond 2^53, but
// every epoch-ms timestamp we store fits safely in a JS number, and the
// frontend types (timestamp: number) rely on that.
pg.types.setTypeParser(20, (val) => parseInt(val, 10));

const connectionString = config.db.url;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — add it to backend/.env");
}

// Managed Postgres providers (Render, Supabase, Neon, ...) terminate TLS with
// a cert chain Node doesn't trust by default; a plain local Postgres doesn't
// use TLS at all.
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);

export const pool = new pg.Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

/** pg-compatible query helper: returns { rows, rowCount }. */
export async function query(text, params = []) {
  return pool.query(text, params);
}

/** Run raw multi-statement SQL (schema files). */
export async function exec(sql) {
  await pool.query(sql);
}

export async function assertDbConnection() {
  try {
    await pool.query("SELECT 1");
  } catch (err) {
    throw new Error(`Postgres connection failed — ${err.message}`);
  }
}
