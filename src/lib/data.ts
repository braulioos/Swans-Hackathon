import "server-only";
import { connection } from "next/server";
import type { CaseDigest, ShareConfig } from "@/lib/types";
import { db } from "@/lib/db";
import { latestDigest } from "@/lib/digest";
import { sapiniMock } from "@/lib/mock/sapini";
import { demoShares } from "@/lib/mock/shares";

// The one seam between UI and data. Pages only call these functions.
// DATA_SOURCE=clio reads digests built from your Clio account; DATA_SOURCE=mock renders the dev fixture.
const useMock = process.env.DATA_SOURCE !== "clio";

// Single local user until per-user sign-in exists; "last visit" is tracked per user + matter.
export const LOCAL_USER = "local";
const RECAP_FALLBACK_DAYS = 30;

type MatterSummary = Pick<CaseDigest, "matterId" | "displayNumber" | "clientName" | "caseType" | "stage">;

export async function listMatters(): Promise<MatterSummary[]> {
  if (useMock) return [sapiniMock];
  await connection();
  const ids = db.prepare("SELECT DISTINCT matter_id FROM digests").all() as { matter_id: number }[];
  return ids.map(({ matter_id }) => latestDigest(matter_id)).filter((d): d is CaseDigest => !!d);
}

export async function getCaseDigest(matterId: string, opts: { sinceDays?: number } = {}): Promise<CaseDigest | null> {
  if (useMock) return matterId === sapiniMock.matterId ? sapiniMock : null;
  await connection();
  const digest = latestDigest(Number(matterId));
  if (!digest) return null;

  const view = db
    .prepare("SELECT last_viewed_at FROM matter_views WHERE user_id = ? AND matter_id = ?")
    .get(LOCAL_USER, Number(matterId)) as { last_viewed_at: string } | undefined;
  const fallback = new Date(Date.now() - (opts.sinceDays ?? RECAP_FALLBACK_DAYS) * 86_400_000).toISOString();
  const useFallback = !view || opts.sinceDays !== undefined;
  return { ...digest, lastViewedAt: useFallback ? fallback : view.last_viewed_at, firstVisit: !view };
}

export function recordMatterView(matterId: string) {
  db.prepare(
    `INSERT INTO matter_views (user_id, matter_id, last_viewed_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id, matter_id) DO UPDATE SET last_viewed_at = excluded.last_viewed_at`,
  ).run(LOCAL_USER, Number(matterId), new Date().toISOString());
}

export async function getShare(token: string): Promise<ShareConfig | null> {
  if (useMock) return demoShares[token] ?? null;
  await connection();
  const row = db.prepare("SELECT token, matter_id, config, created_at FROM shares WHERE token = ? AND revoked_at IS NULL").get(token) as
    | { token: string; matter_id: number; config: string; created_at: string }
    | undefined;
  if (!row) return null;
  const views = db.prepare("SELECT viewed_at AS at, who FROM share_views WHERE token = ? ORDER BY viewed_at DESC").all(token) as {
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
  if (useMock) return Object.values(demoShares).filter((s) => s.matterId === matterId);
  await connection();
  const tokens = db.prepare("SELECT token FROM shares WHERE matter_id = ? AND revoked_at IS NULL ORDER BY created_at DESC").all(Number(matterId)) as {
    token: string;
  }[];
  const shares = await Promise.all(tokens.map((t) => getShare(t.token)));
  return shares.filter((s): s is ShareConfig => !!s);
}

export function recordShareView(token: string, who: string) {
  if (useMock) return;
  db.prepare("INSERT INTO share_views (token, viewed_at, who) VALUES (?, ?, ?)").run(token, new Date().toISOString(), who);
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
