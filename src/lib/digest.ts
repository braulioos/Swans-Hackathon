import "server-only";
import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { db } from "@/lib/db";
import type { CaseDigest, CaseFact, Fact, Kpi, MoneyFigures, NextMove, Provider, Quest, SourceRef, Stage, TimelineEvent } from "@/lib/types";
import { formatDate } from "@/lib/format";

// Digest pipeline: synced Clio items (SQLite) -> one Claude call -> validated CaseDigest -> SQLite.
// Numbers that exist as data (KPIs, tasks, providers) are computed in code, not by the model.
// The model writes the story (brief, timeline, next moves, injuries) and must cite item IDs;
// any sentence whose citations don't resolve to a real item is dropped.
// Cached by input hash: re-opening the case never calls Claude; only new or changed Clio data does.
// Only the AI output is cached. KPIs, quests (overdue is relative to today) and providers are rebuilt
// from the synced items on every read, which is instant and always current.

const MODEL = "claude-opus-5-5";
const PROMPT_VERSION = "digest-v1";
const PRICE_PER_MTOK = { input: 4, output: 20 };

type Raw = Record<string, unknown>;

interface ItemRow {
  kind: string;
  clio_id: number;
  date: string | null;
  title: string | null;
  body: string | null;
  raw: string;
  content_hash: string;
}

interface CustomField {
  id: string;
  field_name: string;
  value: unknown;
}

// ---------- schema the model must fill ----------

const SourceIds = z.array(z.string()).describe("1-3 source IDs copied exactly from the case file, e.g. note-123");
const FactZ = z.object({ text: z.string(), sourceIds: SourceIds });
const StageZ = z.enum(["intake", "treatment", "demand", "negotiation", "litigation", "settlement", "closed"]);

const AiDigest = z.object({
  caseType: z.string().describe("Very short, e.g. 'Motor vehicle accident · sideswipe'"),
  stage: StageZ,
  stageHistory: z.array(z.object({ stage: StageZ, from: z.string().describe("YYYY-MM-DD") })),
  headline: FactZ,
  summary: z.array(FactZ),
  nextMoves: z.array(z.object({ priority: z.enum(["now", "soon", "later"]), text: z.string(), sourceIds: SourceIds })),
  injuries: z.array(FactZ),
  lastClientContact: z.object({ date: z.string().describe("YYYY-MM-DD"), sourceId: z.string() }),
  timeline: z.array(
    z.object({
      date: z.string().describe("YYYY-MM-DD, the real event date"),
      title: z.string(),
      summary: z.string(),
      category: z.enum(["medical", "legal", "communication", "money", "insurance"]),
      importance: z.enum(["milestone", "key", "routine"]),
      impact: z.string().describe("What it means for the case, one short sentence; empty string if not needed"),
      shareableWithProviders: z.boolean(),
      sourceIds: SourceIds,
    }),
  ),
});
type AiDigest = z.infer<typeof AiDigest>;

const SYSTEM = `You digest a personal-injury case file for a law-firm dashboard. Readers are attorneys and paralegals who need to get up to speed in 90 seconds. Parts of your output are later shown, filtered, to treating medical providers.

Rules:
- Use only facts in the case file. Never invent facts, amounts, dates, people or case law.
- Every text item cites 1-3 source IDs exactly as written in the brackets (e.g. note-123). Cite the items that directly support the statement.
- Plain, brief language. Headline: one sentence, at most 25 words: where the case stands and the most urgent issue.
- summary: 4-5 bullets, at most 30 words each: what happened; injuries and treatment; liability and coverage; where the case stands; the biggest risk.
- nextMoves: 3-5 concrete actions for the firm, prioritized now / soon / later, grounded in open tasks, deadlines, gaps or risks in the file. These are suggestions for the attorney.
- injuries: the primary injuries, most serious first, at most 6.
- stage: the current stage. stageHistory: each stage the case has reached, chronological, with its start date (intake starts when the file opened).
- timeline: 20-35 events that tell the story, chronological. importance: "milestone" for at most 8 turning points, "key" for important events, "routine" for the rest. Use real event dates; document upload dates are not event dates. impact is required for milestones and for anything in the last 30 days; otherwise use an empty string.
- shareableWithProviders: true only for treatment events, records or bill requests, case status changes (suit filed, settled, closed) and treatment scheduling. false for strategy, liability analysis, settlement values or negotiation, client credibility, expert strategy and internal notes.
- lastClientContact: the most recent direct contact with the client (call, meeting, or email to or from the client).`;

// ---------- helpers ----------

const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const day = (s: string | null | undefined) => (s ? s.slice(0, 10) : undefined);
const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const text = (v: unknown) => (v === null || v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v));

function sourceId(row: ItemRow): string {
  if (row.kind === "communication") return `${JSON.parse(row.raw).type === "PhoneCommunication" ? "call" : "email"}-${row.clio_id}`;
  if (row.kind === "document") return `doc-${row.clio_id}`;
  return `${row.kind}-${row.clio_id}`;
}

function sourceKind(row: ItemRow): SourceRef["kind"] {
  if (row.kind === "communication") return JSON.parse(row.raw).type === "PhoneCommunication" ? "call" : "email";
  return row.kind as SourceRef["kind"];
}

function loadInputs(matterId: number) {
  const matterRow = db.prepare("SELECT raw FROM matters WHERE id = ?").get(matterId) as { raw: string } | undefined;
  if (!matterRow) throw new Error(`Matter ${matterId} has not been synced`);
  const matter = JSON.parse(matterRow.raw) as Raw;
  const items = db
    .prepare("SELECT kind, clio_id, date, title, body, raw, content_hash FROM items WHERE matter_id = ? ORDER BY date, kind, clio_id")
    .all(matterId) as ItemRow[];
  const fields = ((matter.custom_field_values as CustomField[] | undefined) ?? []).filter((f) => f.field_name);
  return { matter, items, fields };
}

function inputHash(matter: Raw, items: ItemRow[]): string {
  return hash([PROMPT_VERSION, JSON.stringify(matter), ...items.map((i) => `${i.kind}:${i.clio_id}:${i.content_hash}`).sort()].join("\n"));
}

function buildSources(items: ItemRow[], fields: CustomField[]): Map<string, SourceRef> {
  const map = new Map<string, SourceRef>();
  for (const row of items) {
    const id = sourceId(row);
    map.set(id, {
      id,
      kind: sourceKind(row),
      label: row.title ?? row.kind,
      date: day(row.date),
      excerpt: row.body ? row.body.slice(0, 6000) : undefined,
      clioUrl: row.kind === "document" ? `/api/clio/documents/${row.clio_id}` : undefined,
    });
  }
  for (const f of fields) {
    const id = `field-${f.id}`;
    map.set(id, { id, kind: "field", label: `Custom field: ${f.field_name}`, excerpt: text(f.value) });
  }
  return map;
}

function buildPrompt(today: string, matter: Raw, items: ItemRow[], fields: CustomField[]): string {
  const client = (matter.client as Raw | undefined)?.name;
  const lines: string[] = [
    `Today is ${today}.`,
    "",
    "# Matter",
    `${text(matter.display_number)}: ${text(matter.description)}`,
    `Client: ${text(client)} · Status: ${text(matter.status)} · Opened: ${text(matter.open_date)}`,
    "",
    "# Custom fields",
    ...fields.map((f) => `[field-${f.id}] ${f.field_name}: ${text(f.value)}`),
    "",
    "# Case file items (chronological)",
  ];
  for (const row of items) {
    const id = sourceId(row);
    const head = `[${id}] ${day(row.date) ?? "undated"} ${sourceKind(row).toUpperCase()}: ${row.title ?? ""}`;
    if (row.kind === "document") lines.push(`${head} (document file; date shown is the upload date)`);
    else if (row.kind === "expense") lines.push(`${head} · ${text(JSON.parse(row.raw).note).slice(0, 300)}`);
    else lines.push(row.body ? `${head}\n${row.body.trim().slice(0, 3000)}` : head);
  }
  return lines.join("\n");
}

async function callClaude(prompt: string) {
  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(AiDigest) },
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new Error("Claude declined to digest this case.");
  if (message.stop_reason === "max_tokens") throw new Error("Digest output was cut off (max_tokens).");
  if (!message.parsed_output) throw new Error("Digest output did not match the schema.");
  return { ai: message.parsed_output as AiDigest, usage: message.usage, model: message.model };
}

// ---------- deterministic parts ----------

function field(fields: CustomField[], name: string) {
  return fields.find((f) => f.field_name.toLowerCase() === name.toLowerCase());
}

function fieldSource(f: CustomField | undefined, sources: Map<string, SourceRef>): SourceRef[] {
  const s = f && sources.get(`field-${f.id}`);
  return s ? [s] : [];
}

// Firm costs only: medical charges logged as expenses are the client's bills, not firm spend.
function firmExpenses(items: ItemRow[]) {
  const expenses = items
    .filter((i) => i.kind === "expense")
    .map((i) => JSON.parse(i.raw) as Raw)
    .filter((e) => !text(e.note).startsWith("Medical treatment charges"));
  const spend = expenses.reduce((sum, e) => sum + (Number(e.total) || Number(e.price) * Number(e.quantity || 1) || 0), 0);
  return { expenses, spend };
}

function firstSentence(s: string, max = 90) {
  const one = s.split(/(?<=[.;])\s+/)[0] ?? s;
  return one.length > max ? `${one.slice(0, max - 1).trimEnd()}…` : one;
}

// "Key case facts" widget: straight from the matter's Clio custom fields and contacts.
function buildFacts(fields: CustomField[], items: ItemRow[], sources: Map<string, SourceRef>): CaseFact[] {
  const out: CaseFact[] = [];
  const add = (label: string, name: string, format: (v: string) => string = (v) => firstSentence(v)) => {
    const f = field(fields, name);
    const v = text(f?.value);
    if (f && v) out.push({ label, value: format(v), sources: fieldSource(f, sources) });
  };
  add("Incident", "Date of Incident", (v) => formatDate(v));
  add("Location", "Accident Location", (v) => firstSentence(v, 48));
  const adverse = items.filter((i) => i.kind === "contact" && /adverse/i.test(i.body ?? ""));
  if (adverse.length > 0) {
    out.push({
      label: "Defendant",
      value: adverse.map((a) => a.title).join(", "),
      sources: adverse.map((a) => sources.get(sourceId(a))).filter((s): s is SourceRef => !!s),
    });
  }
  add("Insurance", "Insurance Carrier", (v) => firstSentence(v, 48));
  add("Claim #", "Claim Number", (v) => v.split(" ")[0]);
  add("Liability", "Liability Assessment", (v) => firstSentence(v, 60));
  add("Treatment", "Treatment Status", (v) => firstSentence(v, 60));
  add("Lien", "Health Insurance or Lien Holder", (v) => firstSentence(v, 48));
  return out;
}

// Numbers behind the "Money" widget's comparison bars.
function buildMoney(fields: CustomField[], items: ItemRow[]): MoneyFigures {
  const num = (name: string) => {
    const n = Number(field(fields, name)?.value);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const perPerson = text(field(fields, "Policy Limits")?.value).match(/\$([\d,]+)/);
  return {
    caseValue: num("Estimated Case Value"),
    specials: num("Medical Specials To Date"),
    coverageLimit: perPerson ? Number(perPerson[1].replace(/,/g, "")) : undefined,
    firmSpend: firmExpenses(items).spend,
  };
}

function buildKpis(fields: CustomField[], items: ItemRow[], sources: Map<string, SourceRef>): CaseDigest["kpis"] {
  const value = field(fields, "Estimated Case Value");
  const limits = field(fields, "Policy Limits");
  const specials = field(fields, "Medical Specials To Date");

  const limitLines = text(limits?.value).split(/\n+/).filter(Boolean);
  const [limitLabel, limitAmount] = (limitLines[0] ?? "").split(/:\s*/);

  const { expenses, spend } = firmExpenses(items);
  const expenseSource: SourceRef = {
    id: "expenses-all",
    kind: "expense",
    label: `Case expenses (${expenses.length} entries)`,
    excerpt: expenses.map((e) => `${text(e.date)}  ${money(Number(e.total) || 0)}  ${text(e.note).split("\n")[0]}`).join("\n"),
  };

  const kpi = (label: string, v: string, hint: string | undefined, src: SourceRef[]): Kpi => ({ label, value: v, hint, sources: src });
  return {
    caseValue: kpi("Case value (est.)", value ? money(Number(value.value)) : "Not set", "Attorney estimate", fieldSource(value, sources)),
    coverage: kpi("Coverage", limitAmount ?? (limitLines[0] || "Unknown"), limitLabel && limitAmount ? limitLabel : limitLines.slice(1).join(" · "), fieldSource(limits, sources)),
    medicalSpecials: kpi("Medical bills", specials ? money(Number(specials.value)) : "Unknown", "Specials to date", fieldSource(specials, sources)),
    firmSpend: kpi("Firm spend", money(spend), "Records, filing, IME", [expenseSource]),
  };
}

function buildProviders(items: ItemRow[]): Provider[] {
  const recordDocs = items.filter((i) => i.kind === "document" && (i.title ?? "").includes("medical-records")).map((i) => i.title ?? "");
  const providers = items
    .filter((i) => i.kind === "contact" && /provider|hospital|treating/i.test(i.body ?? ""))
    .map((i) => {
      const contact = (JSON.parse(i.raw) as Raw).contact as Raw | undefined;
      const name = text(contact?.name) || (i.title ?? "Provider");
      // Record files are named like "04-medical-records__created__peter-kwan-neurology-records-2023-05-31.pdf":
      // match on the provider's first distinctive name token.
      const key = name.toLowerCase().split(/[^a-z0-9]+/).find((w) => w.length > 2 && !["the", "dr"].includes(w));
      return {
        id: `contact-${text(contact?.id) || i.clio_id}`,
        name,
        specialty: (i.body ?? "").replace(/^(treating provider|medical provider|hospital)[,:]?\s*/i, "") || "Provider",
        recordsReceived: !!key && recordDocs.some((d) => (d.split("__").pop() ?? "").split("-").includes(key)),
      };
    });
  // An individual doctor named inside a practice or facility entry ("surgeon David Capiola") has their
  // records filed under that practice, so inherit its status instead of flagging them as missing.
  return providers.map((p) =>
    p.recordsReceived ? p : { ...p, recordsReceived: providers.some((o) => o !== p && o.recordsReceived && o.specialty.includes(p.name)) },
  );
}

function buildQuests(items: ItemRow[], providers: Provider[], sources: Map<string, SourceRef>, today: string): Quest[] {
  const quests: Quest[] = [];
  for (const row of items) {
    if (row.kind === "task") {
      const t = JSON.parse(row.raw) as Raw;
      if (t.status === "complete") continue;
      const due = day(text(t.due_at)) || undefined;
      const fromProvider = (row.title ?? "").match(/^By medical provider:\s*(.+?)\s+-\s+(.+)$/);
      const provider = fromProvider ? providers.find((p) => p.name === fromProvider[1]) : undefined;
      quests.push({
        id: `q-${row.clio_id}`,
        title: fromProvider ? fromProvider[2] : (row.title ?? "Task"),
        status: fromProvider ? "waiting" : due && due < today ? "overdue" : "upcoming",
        due,
        owner: "Firm",
        waitingOn: fromProvider?.[1],
        providerId: provider?.id,
        sources: [sources.get(sourceId(row))!].filter(Boolean),
      });
    }
    if (row.kind === "calendar") {
      const start = day(row.date);
      if (!start || start < today) continue;
      quests.push({
        id: `cal-${row.clio_id}`,
        title: row.title ?? "Calendar entry",
        status: "upcoming",
        due: start,
        owner: "Calendar",
        sources: [sources.get(sourceId(row))!].filter(Boolean),
      });
    }
  }
  const rank = { overdue: 0, waiting: 1, upcoming: 2 };
  return quests.sort((a, b) => rank[a.status] - rank[b.status] || (a.due ?? "9999").localeCompare(b.due ?? "9999"));
}

// ---------- assemble ----------

function assemble(
  matterId: number,
  matter: Raw,
  items: ItemRow[],
  fields: CustomField[],
  ai: AiDigest,
  meta: CaseDigest["meta"],
  digestedAt: string,
): CaseDigest {
  const sources = buildSources(items, fields);
  const resolve = (ids: string[]) => Array.from(new Set(ids)).map((id) => sources.get(id)).filter((s): s is SourceRef => !!s);
  const fact = (f: { text: string; sourceIds: string[] }): Fact | null => {
    const s = resolve(f.sourceIds);
    return s.length > 0 ? { text: f.text, sources: s } : null;
  };
  const facts = (list: { text: string; sourceIds: string[] }[]) => list.map(fact).filter((f): f is Fact => !!f);

  const today = new Date().toISOString().slice(0, 10);
  const providers = buildProviders(items);
  const timeline: TimelineEvent[] = ai.timeline
    .map((e, i) => ({
      id: `ev-${i}`,
      date: e.date,
      title: e.title,
      summary: e.summary,
      category: e.category,
      importance: e.importance,
      impact: e.impact || undefined,
      shareableWithProviders: e.shareableWithProviders,
      sources: resolve(e.sourceIds),
    }))
    .filter((e) => e.sources.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(e.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  const contactSource = sources.get(ai.lastClientContact.sourceId);
  const incident = text(field(fields, "Date of Incident")?.value) || timeline[0]?.date || text(matter.open_date);
  const headline = fact(ai.headline) ?? { text: "Digest ready. See the timeline below.", sources: [] };

  return {
    matterId: String(matterId),
    displayNumber: text(matter.display_number),
    clientName: text((matter.client as Raw | undefined)?.name) || text(matter.description),
    caseType: ai.caseType,
    incidentDate: incident.slice(0, 10),
    stage: ai.stage as Stage,
    stageHistory: ai.stageHistory.filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s.from)).sort((a, b) => a.from.localeCompare(b.from)),
    firmName: process.env.FIRM_NAME ?? "Your law firm",
    digestedAt,
    lastViewedAt: digestedAt,
    headline,
    summary: facts(ai.summary),
    nextMoves: ai.nextMoves
      .map((m) => ({ ...fact(m), priority: m.priority }))
      .filter((m): m is NextMove => !!m.text && !!m.sources),
    comparables: [],
    injuries: facts(ai.injuries),
    kpis: buildKpis(fields, items, sources),
    facts: buildFacts(fields, items, sources),
    money: buildMoney(fields, items),
    lastClientContact: contactSource
      ? { date: ai.lastClientContact.date, source: contactSource }
      : { date: today, source: { id: "none", kind: "note", label: "No client contact found" } },
    timeline,
    quests: buildQuests(items, providers, sources, today),
    providers,
    meta,
  };
}

// ---------- public API ----------

interface StoredDigest {
  ai: AiDigest;
  meta: CaseDigest["meta"];
  digestedAt: string;
}

export interface DigestResult {
  digest: CaseDigest;
  reused: boolean;
}

export async function ensureDigest(matterId: number): Promise<DigestResult> {
  const { matter, items, fields } = loadInputs(matterId);
  const key = inputHash(matter, items);

  const latest = db
    .prepare("SELECT version, input_hash FROM digests WHERE matter_id = ? ORDER BY version DESC LIMIT 1")
    .get(matterId) as { version: number; input_hash: string } | undefined;
  const cached = latest?.input_hash === key ? latestDigest(matterId) : null;
  if (cached) return { digest: cached, reused: true };

  const today = new Date().toISOString().slice(0, 10);
  const { ai, usage, model } = await callClaude(buildPrompt(today, matter, items, fields));
  const costUsd = (usage.input_tokens * PRICE_PER_MTOK.input + usage.output_tokens * PRICE_PER_MTOK.output) / 1_000_000;
  const stored: StoredDigest = {
    ai,
    meta: { model, inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, costUsd: Math.round(costUsd * 1000) / 1000 },
    digestedAt: new Date().toISOString(),
  };

  db.prepare("INSERT INTO digests (matter_id, version, input_hash, json, created_at) VALUES (?, ?, ?, ?, ?)").run(
    matterId,
    (latest?.version ?? 0) + 1,
    key,
    JSON.stringify(stored),
    stored.digestedAt,
  );
  return { digest: latestDigest(matterId)!, reused: false };
}

export function latestDigest(matterId: number): CaseDigest | null {
  const row = db.prepare("SELECT json FROM digests WHERE matter_id = ? ORDER BY version DESC LIMIT 1").get(matterId) as
    | { json: string }
    | undefined;
  if (!row) return null;
  const stored = JSON.parse(row.json) as StoredDigest;
  if (!stored.ai) return null;
  const { matter, items, fields } = loadInputs(matterId);
  return assemble(matterId, matter, items, fields, stored.ai, stored.meta, stored.digestedAt);
}
