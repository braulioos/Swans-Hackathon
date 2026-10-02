import "server-only";
import { connection } from "next/server";
import type { CaseDigest, ShareConfig } from "@/lib/types";
import { db } from "@/lib/db";
import { latestDigest } from "@/lib/digest";
import { getSettlement } from "@/lib/settlement";
import { locallyCached } from "@/lib/local-cache";

// The one seam between UI and data. All cases, including the demo fixture, are stored remotely.
export const LOCAL_USER = "firm-admin";
const RECAP_FALLBACK_DAYS = 30;

type MatterSummary = Pick<CaseDigest, "matterId" | "displayNumber" | "clientName" | "caseType" | "stage">;

async function withStoredWork(digest: CaseDigest): Promise<CaseDigest> {
  const [settlement, requests] = await Promise.all([
    getSettlement(digest.matterId),
    db.prepare("SELECT id, document_id AS documentId FROM case_workflows WHERE matter_id = ? AND id LIKE ? AND kind = 'contact'")
      .all(digest.matterId, `records-request-${digest.matterId}-%`) as Promise<{ id: string; documentId: string }[]>,
  ]);
  return {
    ...digest,
    ...(settlement && { stage: "settlement" as const, stageHistory: [...digest.stageHistory.filter((item) => item.stage !== "settlement"), { stage: "settlement" as const, from: settlement.settledOn }] }),
    quests: [...digest.quests, ...requests.map((request) => ({ id: request.id, title: "Please upload current treatment records and an itemized bill.", status: "waiting" as const, owner: "Provider", providerId: request.documentId.replace(/^provider:/, ""), sources: [] }))],
  };
}

export async function listMatters(): Promise<MatterSummary[]> {
  await connection();
  return locallyCached("matters", async () => {
  const [snapshots, ids] = await Promise.all([
    db.prepare("SELECT json FROM case_snapshots ORDER BY created_at DESC").all() as Promise<{ json: string }[]>,
    db.prepare("SELECT DISTINCT matter_id FROM digests").all() as Promise<{ matter_id: string }[]>,
  ]);
  const digests = await Promise.all(ids.map(({ matter_id }) => latestDigest(Number(matter_id))));
  return await Promise.all([...digests.filter((d): d is CaseDigest => !!d), ...snapshots.map(({ json }) => JSON.parse(json) as CaseDigest)].map(withStoredWork));
  });
}

export async function getCaseDigest(matterId: string, opts: { sinceDays?: number } = {}): Promise<CaseDigest | null> {
  await connection();
  return locallyCached(`digest:${matterId}:${opts.sinceDays ?? "default"}`, async () => {
  const [snapshot, view] = await Promise.all([
    db.prepare("SELECT json FROM case_snapshots WHERE matter_id = ?").get(matterId) as Promise<{ json: string } | undefined>,
    db.prepare("SELECT last_viewed_at FROM matter_views WHERE user_id = ? AND matter_id = ?")
      .get(LOCAL_USER, matterId) as Promise<{ last_viewed_at: string } | undefined>,
  ]);
  const digest = snapshot ? JSON.parse(snapshot.json) as CaseDigest : /^\d+$/.test(matterId) ? await latestDigest(Number(matterId)) : null;
  if (!digest) return null;

  const fallback = new Date(Date.now() - (opts.sinceDays ?? RECAP_FALLBACK_DAYS) * 86_400_000).toISOString();
  const useFallback = !view || opts.sinceDays !== undefined;
  return await withStoredWork({ ...digest, lastViewedAt: useFallback ? fallback : view.last_viewed_at, firstVisit: !view });
  });
}

export async function recordMatterView(matterId: string) {
  await db.prepare(
    `INSERT INTO matter_views (user_id, matter_id, last_viewed_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id, matter_id) DO UPDATE SET last_viewed_at = excluded.last_viewed_at`,
  ).run(LOCAL_USER, matterId, new Date().toISOString());
}

export async function getShare(token: string): Promise<ShareConfig | null> {
  await connection();
  const row = await db.prepare("SELECT token, matter_id, config, created_at FROM shares WHERE token = ? AND revoked_at IS NULL").get(token) as
    | { token: string; matter_id: number; config: string; created_at: string }
    | undefined;
  if (!row) return null;
  const views = await db.prepare("SELECT viewed_at AS at, who FROM share_views WHERE token = ? ORDER BY viewed_at DESC").all(token) as {
    at: string;
    who: string | null;
  }[];
  return {
    ...(JSON.parse(row.config) as Omit<ShareConfig, "token" | "matterId" | "createdAt" | "views">),
    token: row.token,
    matterId: String(row.matter_id),
    createdAt: row.created_at,
    views: views.map((v) => ({ at: v.at, who: v.who ?? undefined })),
  };
}

export async function listShares(matterId: string): Promise<ShareConfig[]> {
  await connection();
  const tokens = await db.prepare("SELECT token FROM shares WHERE matter_id = ? AND revoked_at IS NULL ORDER BY created_at DESC").all(matterId) as {
    token: string;
  }[];
  const shares = await Promise.all(tokens.map((t) => getShare(t.token)));
  return shares.filter((s): s is ShareConfig => !!s);
}

export async function recordShareView(token: string, who: string) {
  await db.prepare("INSERT INTO share_views (token, viewed_at, who) VALUES (?, ?, ?)").run(token, new Date().toISOString(), who);
}

// Default share for a new provider: everything a provider may see is on ("give as much as is safe").
export function newShareDraft(digest: CaseDigest): ShareConfig {
  return {
    token: "",
    matterId: digest.matterId,
    providerId: digest.providers[0]?.id ?? "",
    sections: { status: true, coverage: true, timeline: true, requests: true, bills: true, attendance: true, otherProviders: true },
    coverageDetail: "yesNo",
    hiddenEventIds: [],
    noteToProvider: "",
    createdAt: new Date().toISOString(),
    views: [],
  };
}
