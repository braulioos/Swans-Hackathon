// One-time import of the existing mock case store, document bytes, and demo fixture.
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import pg from 'pg';

if (process.argv[2] !== '--full') throw new Error('Use --full to import the complete mock case store.');
const sqlitePath = process.env.DB_PATH ?? path.join(process.cwd(), '.data', 'case-digest.db');
if (!fs.existsSync(sqlitePath)) throw new Error('Local case store not found.');
const source = new Database(sqlitePath, { readonly: true, fileMustExist: true });
const connectionOptions = {
  host: process.env.SUPABASE_DB_HOST,
  port: Number(process.env.SUPABASE_DB_PORT ?? 5432),
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: process.env.SUPABASE_DB_CA_FILE
    ? { ca: fs.readFileSync(process.env.SUPABASE_DB_CA_FILE, 'utf8'), rejectUnauthorized: true }
    : { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
  query_timeout: 30000,
};
let client;
for (let attempt = 1; attempt <= 6; attempt++) {
  client = new pg.Client(connectionOptions);
  client.on('error', (error) => console.error(`Database connection error: ${error.message}`));
  try {
    await client.connect();
    break;
  } catch (error) {
    client.connection?.stream?.destroy();
    if (attempt === 6) throw error;
    console.log(`Pooler connection retry ${attempt}/6.`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
const tables = ['clio_tokens', 'matters', 'items', 'sync_runs', 'digests', 'shares', 'share_views', 'matter_views', 'case_documents', 'case_workflows', 'case_fact_reviews', 'case_settlements'];
const counts = {};
try {
  console.log('Connected to Supabase; starting transaction.');
  await client.query('BEGIN');
  for (const table of tables) {
    const { rows } = await client.query(`SELECT EXISTS (SELECT 1 FROM app_private.${table} LIMIT 1) AS populated`);
    if (rows[0].populated) throw new Error(`Destination ${table} already contains data. Migration requires an empty case store.`);
  }
  const existingSnapshots = await client.query('SELECT EXISTS (SELECT 1 FROM app_private.case_snapshots LIMIT 1) AS populated');
  if (existingSnapshots.rows[0].populated) throw new Error('Destination case snapshots already contain data.');
  for (const table of tables) {
    const columns = source.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
    const rows = source.prepare(`SELECT * FROM ${table}`).all();
    const insert = `INSERT INTO app_private.${table} (${columns.map((column) => `"${column}"`).join(', ')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')}) ON CONFLICT DO NOTHING`;
    for (const row of rows) await client.query(insert, columns.map((column) => table === 'case_documents' && column === 'file_path' ? null : row[column]));
    counts[table] = rows.length;
    console.log(`Imported ${table}: ${rows.length} rows.`);
  }
  const documents = source.prepare('SELECT id, file_path FROM case_documents WHERE file_path IS NOT NULL').all();
  let blobs = 0;
  for (const document of documents) {
    if (!fs.existsSync(document.file_path)) throw new Error(`Missing document file for ${document.id}`);
    await client.query('INSERT INTO app_private.case_document_blobs (id, data, updated_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data, updated_at=EXCLUDED.updated_at', [document.id, fs.readFileSync(document.file_path), new Date().toISOString()]);
    blobs++;
  }
  const { sapiniMock } = await import('../src/lib/mock/sapini.ts');
  const { demoShares } = await import('../src/lib/mock/shares.ts');
  await client.query('INSERT INTO app_private.case_snapshots (matter_id, json, created_at) VALUES ($1, $2, $3)', [sapiniMock.matterId, JSON.stringify(sapiniMock), new Date().toISOString()]);
  for (const share of Object.values(demoShares)) {
    const { token, matterId, createdAt, views, ...config } = share;
    await client.query('INSERT INTO app_private.shares (token, matter_id, config, created_at) VALUES ($1, $2, $3, $4)', [token, matterId, JSON.stringify(config), createdAt]);
    for (const view of views) await client.query('INSERT INTO app_private.share_views (token, viewed_at, who) VALUES ($1, $2, $3)', [token, view.at, view.who ?? null]);
  }
  await client.query("SELECT setval(pg_get_serial_sequence('app_private.sync_runs', 'id'), COALESCE((SELECT MAX(id) FROM app_private.sync_runs), 1), true)");
  await client.query('COMMIT');
  console.log(`Migration complete: ${Object.values(counts).reduce((sum, count) => sum + count, 0)} prior rows, ${blobs} document files, one demo case, ${Object.keys(demoShares).length} demo share.`);
} catch (error) {
  console.error(`Migration stopped: ${error instanceof Error ? error.message : String(error)}`);
  await Promise.race([client.query('ROLLBACK').catch(() => {}), new Promise((resolve) => setTimeout(resolve, 1000))]);
  throw error;
} finally {
  source.close();
  client.connection?.stream?.destroy();
}
