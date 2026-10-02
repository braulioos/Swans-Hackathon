import "server-only";

// Read-only Clio Manage v4 client. Rule 3 of the hackathon: read everything, write nothing.
// This module deliberately exposes GET only, so judges reading the repo can verify it at a glance.
// Docs: https://docs.developers.clio.com/clio-manage/api-reference/

const CLIO_BASE = process.env.CLIO_BASE_URL ?? "https://app.clio.com";

export class ClioError extends Error {
  constructor(
    public status: number,
    public url: string,
    public body: string,
  ) {
    super(`Clio GET ${url.replace(CLIO_BASE, "")} failed: ${status} ${body.slice(0, 300)}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function clioFetch(accessToken: string, url: string, attempt = 0): Promise<Response> {
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (res.status === 429 && attempt < 4) {
    const wait = Number(res.headers.get("retry-after") ?? "10");
    await sleep((Number.isFinite(wait) ? wait : 10) * 1000);
    return clioFetch(accessToken, url, attempt + 1);
  }
  if (!res.ok) throw new ClioError(res.status, url, await res.text());
  return res;
}

function buildUrl(path: string, params: Record<string, string>) {
  return `${CLIO_BASE}/api/v4/${path}.json?${new URLSearchParams(params)}`;
}

// Single resource, e.g. clioGet(token, `matters/${id}`, { fields: "id,display_number" }).
export async function clioGet<T>(accessToken: string, path: string, params: Record<string, string>): Promise<T> {
  const res = await clioFetch(accessToken, buildUrl(path, params));
  return ((await res.json()) as { data: T }).data;
}

// Follows meta.paging.next until every record is loaded.
// Clio returns only id/etag unless you pass ?fields=..., e.g. "id,subject,detail,date,created_at".
export async function clioGetAll<T>(accessToken: string, path: string, params: Record<string, string>): Promise<T[]> {
  let url: string | undefined = buildUrl(path, { limit: "200", ...params });
  const out: T[] = [];
  while (url) {
    const res = await clioFetch(accessToken, url);
    const page = (await res.json()) as { data: T[]; meta?: { paging?: { next?: string } } };
    out.push(...page.data);
    url = page.meta?.paging?.next;
  }
  return out;
}

// Binary download (scanned PDFs etc.) for the digest pipeline.
export async function clioDownload(accessToken: string, documentId: number): Promise<{ contentType: string; data: Buffer }> {
  const res = await clioFetch(accessToken, `${CLIO_BASE}/api/v4/documents/${documentId}/download`);
  return { contentType: res.headers.get("content-type") ?? "application/octet-stream", data: Buffer.from(await res.arrayBuffer()) };
}
