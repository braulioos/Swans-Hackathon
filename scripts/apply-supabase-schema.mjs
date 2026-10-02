import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

if (!process.env.SUPABASE_DB_PASSWORD || !process.env.SUPABASE_DB_HOST || !process.env.SUPABASE_DB_USER) {
  throw new Error('Supabase database connection is not configured.');
}
const client = new pg.Client({
  host: process.env.SUPABASE_DB_HOST,
  port: Number(process.env.SUPABASE_DB_PORT ?? 5432),
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});
const schema = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20261002000000_initial_case_store.sql'), 'utf8');
try {
  await client.connect();
  await client.query('BEGIN');
  await client.query(schema);
  await client.query('COMMIT');
  const { rows } = await client.query("SELECT count(*)::int AS count FROM pg_tables WHERE schemaname = 'app_private'");
  console.log(`Supabase schema ready: ${rows[0].count} private tables.`);
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally {
  await client.end().catch(() => {});
}
