import "server-only";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { getAccessToken } from "@/lib/clio-auth";
import { ClioError, clioGet, clioGetAll } from "@/lib/clio";

// Ingest: copy one matter from Clio (GET only) into our case `items` table.
// Each row carries a content hash, so the digest step only re-reads items that actually changed.

type Raw = Record<string, unknown>;

interface ResourceSpec {
  kind: string;
  path: string;
  params: Record<string, string>;
  date: (r: Raw) => unknown;
  title: (r: Raw) => unknown;
  body: (r: Raw) => unknown;
}

const RESOURCES: ResourceSpec[] = [
  {
    kind: "note",
    path: "notes",
    params: { type: "Matter", fields: "id,subject,detail,date,created_at,updated_at" },
    date: (r) => r.date ?? r.created_at,
    title: (r) => r.subject,
    body: (r) => r.detail,
  },
  {
    kind: "communication",
    path: "communications",
    params: { fields: "id,subject,body,date,type,created_at,updated_at" },
    date: (r) => r.date ?? r.created_at,
    title: (r) => r.subject,
    body: (r) => r.body,
  },
  {
    kind: "task",
    path: "tasks",
    params: { fields: "id,name,description,due_at,status,priority,completed_at,created_at,updated_at" },
    date: (r) => r.due_at ?? r.created_at,
    title: (r) => r.name,
    body: (r) => r.description,
  },
  {
    kind: "calendar",
    path: "calendar_entries",
    params: { fields: "id,summary,description,start_at,end_at,all_day,created_at,updated_at" },
    date: (r) => r.start_at,
    title: (r) => r.summary,
    body: (r) => r.description,
  },
  {
    kind: "expense",
    path: "activities",
    params: { type: "ExpenseEntry", fields: "id,type,date,quantity,price,total,note,created_at,updated_at" },
    date: (r) => r.date,
    title: (r) => (r.total !== undefined ? `Expense $${r.total}` : "Expense"),
    body: (r) => r.note,
  },
  {
    kind: "document",
    path: "documents",
    params: { fields: "id,name,content_type,created_at,updated_at" },
    date: (r) => r.created_at,
    title: (r) => r.name,
    body: () => null,
  },
  {
    kind: "contact",
    path: "relationships",
    params: { fields: "id,description,contact{id,name,type},created_at,updated_at" },
    date: (r) => r.created_at,
    title: (r) => (r.contact as Raw | undefined)?.name,
    body: (r) => r.description,
  },
];

const MATTER_FIELDS = [
  "id,display_number,description,status,open_date,close_date,created_at,updated_at,client{id,name},practice_area{id,name},custom_field_values{id,value,field_name}",
  "id,display_number,description,status,open_date,created_at,updated_at,client{id,name}",
];

export interface SyncReport {
  matter: { id: number; display_number?: string; description?: string } | null;
  counts: Record<string, number>;
  changed: number;
  errors: Record<string, string>;
  fieldsSeen: Record<string, string[]>;
  startedAt: string;
  finishedAt: string;
}

const str = (v: unknown) => (v === undefined || v === null ? null : String(v));
const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const errText = (e: unknown) => (e instanceof ClioError ? `${e.status}: ${e.body.slice(0, 300)}` : String(e));

// Tries the rich field list first; if Clio rejects a field (400), falls back so we still get the records.
async function getAllWithFallback(token: string, spec: ResourceSpec, matterId: number, errors: Record<string, string>) {
  const params = { ...spec.params, matter_id: String(matterId) };
  try {
    return await clioGetAll<Raw>(token, spec.path, params);
  } catch (e) {
    errors[spec.kind] = errText(e);
    if (!(e instanceof ClioError) || e.status !== 400) return [];
    try {
      return await clioGetAll<Raw>(token, spec.path, { ...params, fields: "id,created_at,updated_at" });
    } catch (e2) {
      errors[spec.kind] += ` | fallback: ${errText(e2)}`;
      return [];
    }
  }
}

export async function findMatters(query: string) {
  const token = await getAccessToken();
  if (!token) throw new Error("Clio is not connected");
  return clioGetAll<Raw>(token, "matters", { query, fields: "id,display_number,description,status,client{id,name}" });
}

export async function syncMatter(query = "Sapini"): Promise<SyncReport> {
  const startedAt = new Date().toISOString();
  const token = await getAccessToken();
  if (!token) throw new Error("Clio is not connected");

  const report: SyncReport = { matter: null, counts: {}, changed: 0, errors: {}, fieldsSeen: {}, startedAt, finishedAt: startedAt };

  const matches = await findMatters(query);
  if (matches.length === 0) {
    report.errors.matter = `No matter matching "${query}"`;
    return finish(report);
  }
  const matterId = Number(matches[0].id);

  let matter: Raw | null = null;
  for (const fields of MATTER_FIELDS) {
    try {
      matter = await clioGet<Raw>(token, `matters/${matterId}`, { fields });
      break;
    } catch (e) {
      report.errors.matter = errText(e);
    }
  }
  if (!matter) return finish(report);
  report.matter = { id: matterId, display_number: str(matter.display_number) ?? undefined, description: str(matter.description) ?? undefined };
  report.fieldsSeen.matter = Object.keys(matter);

  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO matters (id, display_number, description, raw, synced_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET display_number = excluded.display_number, description = excluded.description,
       raw = excluded.raw, synced_at = excluded.synced_at`,
  ).run(matterId, str(matter.display_number), str(matter.description), JSON.stringify(matter), now);

  const existingHash = db.prepare("SELECT content_hash FROM items WHERE kind = ? AND clio_id = ?");
  const upsert = db.prepare(
    `INSERT INTO items (kind, clio_id, matter_id, date, title, body, raw, content_hash, synced_at)
     VALUES (@kind, @clio_id, @matter_id, @date, @title, @body, @raw, @content_hash, @synced_at)
     ON CONFLICT(kind, clio_id) DO UPDATE SET matter_id = excluded.matter_id, date = excluded.date, title = excluded.title,
       body = excluded.body, raw = excluded.raw, content_hash = excluded.content_hash, synced_at = excluded.synced_at`,
  );

  for (const spec of RESOURCES) {
    const rows = await getAllWithFallback(token, spec, matterId, report.errors);
    report.counts[spec.kind] = rows.length;
    if (rows[0]) report.fieldsSeen[spec.kind] = Object.keys(rows[0]);
    await db.transaction(async () => {
      for (const r of rows) {
        const raw = JSON.stringify(r);
        const content_hash = hash(raw);
        const prev = await existingHash.get(spec.kind, Number(r.id)) as { content_hash: string } | undefined;
        if (prev?.content_hash !== content_hash) report.changed++;
        await upsert.run({
          kind: spec.kind,
          clio_id: Number(r.id),
          matter_id: matterId,
          date: str(spec.date(r)),
          title: str(spec.title(r)),
          body: str(spec.body(r)),
          raw,
          content_hash,
          synced_at: now,
        });
      }
    })();
  }

  return finish(report);
}

async function finish(report: SyncReport): Promise<SyncReport> {
  report.finishedAt = new Date().toISOString();
  await db.prepare("INSERT INTO sync_runs (matter_id, started_at, report) VALUES (?, ?, ?)").run(
    report.matter?.id ?? null,
    report.startedAt,
    JSON.stringify(report),
  );
  return report;
}

export async function lastSyncReport(): Promise<SyncReport | null> {
  let row: { report: string } | undefined;
  try { row = await db.prepare("SELECT report FROM sync_runs ORDER BY id DESC LIMIT 1").get() as { report: string } | undefined; }
  catch { return null; }
  return row ? (JSON.parse(row.report) as SyncReport) : null;
}
