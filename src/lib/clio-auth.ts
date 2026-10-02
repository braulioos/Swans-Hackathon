import "server-only";
import { db } from "@/lib/db";

// Clio OAuth tokens, stored server-side only. Access tokens expire; refresh tokens renew them.
const CLIO_BASE = process.env.CLIO_BASE_URL ?? "https://app.clio.com";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

interface TokenRow {
  access_token: string;
  refresh_token: string | null;
  expires_at: number;
}

export async function saveTokens(t: TokenResponse) {
  const existing = await db.prepare("SELECT refresh_token FROM clio_tokens WHERE id = 1").get() as { refresh_token: string | null } | undefined;
  await db.prepare(
    `INSERT INTO clio_tokens (id, access_token, refresh_token, expires_at, updated_at)
     VALUES (1, @access_token, @refresh_token, @expires_at, @updated_at)
     ON CONFLICT(id) DO UPDATE SET access_token = excluded.access_token, refresh_token = excluded.refresh_token,
       expires_at = excluded.expires_at, updated_at = excluded.updated_at`,
  ).run({
    access_token: t.access_token,
    refresh_token: t.refresh_token ?? existing?.refresh_token ?? null,
    expires_at: Date.now() + t.expires_in * 1000,
    updated_at: new Date().toISOString(),
  });
}

export async function isClioConnected(): Promise<boolean> {
  try { return !!(await db.prepare("SELECT 1 FROM clio_tokens WHERE id = 1").get()); }
  catch { return false; }
}

export async function exchangeToken(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${CLIO_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.CLIO_CLIENT_ID ?? "",
      client_secret: process.env.CLIO_CLIENT_SECRET ?? "",
      ...params,
    }),
  });
  if (!res.ok) throw new Error(`Clio token request failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// Returns a valid access token, refreshing it if it expires within a minute. Null if never connected.
export async function getAccessToken(): Promise<string | null> {
  const row = await db.prepare("SELECT access_token, refresh_token, expires_at FROM clio_tokens WHERE id = 1").get() as TokenRow | undefined;
  if (!row) return null;
  if (row.expires_at - 60_000 > Date.now()) return row.access_token;
  if (!row.refresh_token) return null;
  const fresh = await exchangeToken({ grant_type: "refresh_token", refresh_token: row.refresh_token });
  await saveTokens(fresh);
  return fresh.access_token;
}
