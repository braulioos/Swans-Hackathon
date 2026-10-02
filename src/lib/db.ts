import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import fs from "node:fs";
import { Pool, types, type PoolClient, type QueryResult } from "pg";
// All application data lives in Supabase Postgres. The private schema is inaccessible
// through the public Data API; only server-side code opens this connection.
types.setTypeParser(20, (value) => Number(value));
const globalForPool = globalThis as typeof globalThis & { __caseDigestPool?: Pool };
const pool = globalForPool.__caseDigestPool ?? new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || undefined,
  host: process.env.SUPABASE_DATABASE_URL ? undefined : process.env.SUPABASE_DB_HOST,
  port: process.env.SUPABASE_DATABASE_URL ? undefined : Number(process.env.SUPABASE_DB_PORT ?? 5432),
  user: process.env.SUPABASE_DATABASE_URL ? undefined : (process.env.SUPABASE_DB_USER ?? "postgres"),
  password: process.env.SUPABASE_DATABASE_URL ? undefined : process.env.SUPABASE_DB_PASSWORD,
  database: process.env.SUPABASE_DATABASE_URL ? undefined : "postgres",
  ssl: process.env.SUPABASE_DB_CA_FILE
    ? { ca: fs.readFileSync(process.env.SUPABASE_DB_CA_FILE, "utf8"), rejectUnauthorized: true }
    : { rejectUnauthorized: false },
  max: 2,
  connectionTimeoutMillis: 12000,
  idleTimeoutMillis: 300000,
  keepAlive: true,
});
globalForPool.__caseDigestPool = pool;
const transactionClient = new AsyncLocalStorage<PoolClient>();
const TABLES = ["clio_tokens", "matters", "items", "sync_runs", "digests", "case_snapshots", "shares", "share_views", "matter_views", "case_documents", "case_document_blobs", "case_workflows", "case_fact_reviews", "case_settlements"];

function postgresQuery(source: string, args: unknown[]) {
  let sql = source.replace(/\bAS\s+([a-z][a-z0-9]*[A-Z][A-Za-z0-9]*)\b/g, 'AS "$1"');
  sql = sql.replace(/\b(DELETE\s+FROM|FROM|JOIN|INTO|UPDATE)\s+([a-z_][a-z_0-9]*)\b/gi, (match, keyword: string, table: string) =>
    TABLES.includes(table.toLowerCase()) ? `${keyword} app_private.${table}` : match);
  const values: unknown[] = [];
  if (args.length === 1 && args[0] && typeof args[0] === "object" && !Array.isArray(args[0]) && !Buffer.isBuffer(args[0])) {
    const named = args[0] as Record<string, unknown>;
    sql = sql.replace(/@([a-z_][a-z_0-9]*)/gi, (_match, key: string) => { values.push(named[key]); return `$${values.length}`; });
  } else {
    sql = sql.replace(/\?/g, () => { values.push(args[values.length]); return `$${values.length}`; });
  }
  if (/^\s*INSERT\s+OR\s+IGNORE\b/i.test(sql)) {
    sql = sql.replace(/\bINSERT\s+OR\s+IGNORE\b/i, "INSERT");
    sql += " ON CONFLICT DO NOTHING";
  }
  return { sql, values };
}

async function query(source: string, args: unknown[]): Promise<QueryResult> {
  const { sql, values } = postgresQuery(source, args);
  const client = transactionClient.getStore();
  if (client) return client.query(sql, values);
  try { return await pool.query(sql, values); }
  catch (error) {
    if (/connection terminated|ECONNRESET|timeout/i.test(String(error))) return await pool.query(sql, values);
    throw error;
  }
}

export const db = {
  prepare(source: string) {
    return {
      async get(...args: unknown[]): Promise<unknown> {
        return (await query(source, args)).rows[0];
      },
      async all(...args: unknown[]): Promise<unknown[]> {
        return (await query(source, args)).rows;
      },
      async run(...args: unknown[]): Promise<{ changes: number }> {
        return { changes: (await query(source, args)).rowCount ?? 0 };
      },
    };
  },
  transaction<T>(fn: () => Promise<T>) {
    return async (): Promise<T> => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const value = await transactionClient.run(client, fn);
        await client.query("COMMIT");
        return value;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally { client.release(); }
    };
  },
};
