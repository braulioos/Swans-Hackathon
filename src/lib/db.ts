import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

// Our own database. Clio is read-only, so everything we write (tokens, synced items, digests,
// shares, view receipts) lives here. Override the location with DB_PATH (e.g. outside OneDrive).
const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), ".data", "case-digest.db");

function open(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS clio_tokens (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS matters (
      id INTEGER PRIMARY KEY,
      display_number TEXT,
      description TEXT,
      raw TEXT NOT NULL,
      synced_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS items (
      kind TEXT NOT NULL,
      clio_id INTEGER NOT NULL,
      matter_id INTEGER NOT NULL,
      date TEXT,
      title TEXT,
      body TEXT,
      raw TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      synced_at TEXT NOT NULL,
      PRIMARY KEY (kind, clio_id)
    );
    CREATE TABLE IF NOT EXISTS sync_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matter_id INTEGER,
      started_at TEXT NOT NULL,
      report TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS digests (
      matter_id INTEGER NOT NULL,
      version INTEGER NOT NULL,
      input_hash TEXT NOT NULL,
      json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (matter_id, version)
    );
    CREATE TABLE IF NOT EXISTS shares (
      token TEXT PRIMARY KEY,
      matter_id INTEGER NOT NULL,
      config TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked_at TEXT
    );
    CREATE TABLE IF NOT EXISTS share_views (
      token TEXT NOT NULL,
      viewed_at TEXT NOT NULL,
      who TEXT
    );
    CREATE TABLE IF NOT EXISTS matter_views (
      user_id TEXT NOT NULL,
      matter_id INTEGER NOT NULL,
      last_viewed_at TEXT NOT NULL,
      PRIMARY KEY (user_id, matter_id)
    );
  `);
  return db;
}

// Reuse one connection across dev hot reloads.
const globalForDb = globalThis as unknown as { __caseDigestDb?: Database.Database };
export const db = globalForDb.__caseDigestDb ?? open();
globalForDb.__caseDigestDb = db;
