import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const directory = path.join(process.cwd(), ".data", "cache");
const pending = new Map<string, Promise<unknown>>();

function filename(key: string) {
  return path.join(directory, `${crypto.createHash("sha256").update(key).digest("hex")}.json`);
}

function read<T>(key: string): { savedAt: number; value: T } | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(filename(key), "utf8")) as { savedAt: number; value: T };
    return Number.isFinite(parsed.savedAt) ? parsed : null;
  } catch { return null; }
}

function save<T>(key: string, value: T) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const target = filename(key);
  const temporary = `${target}.${process.pid}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify({ savedAt: Date.now(), value }), { mode: 0o600 });
  fs.renameSync(temporary, target);
}

function refresh<T>(key: string, load: () => Promise<T>): Promise<T> {
  const existing = pending.get(key);
  if (existing) return existing as Promise<T>;
  const task = load().then((value) => {
    try { save(key, value); } catch { /* A cache write must not fail the database request. */ }
    return value;
  }).finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}

export function locallyCached<T>(key: string, load: () => Promise<T>, maxAgeMs = 300_000): Promise<T> {
  const stored = read<T>(key);
  if (stored) {
    if (Date.now() - stored.savedAt > maxAgeMs) void refresh(key, load).catch(() => {});
    return Promise.resolve(stored.value);
  }
  return refresh(key, load);
}

export function invalidateLocalCache(...keys: string[]) {
  for (const key of keys) {
    try { fs.unlinkSync(filename(key)); } catch { /* Already absent. */ }
  }
}
