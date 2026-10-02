import { isClioConnected } from "@/lib/clio-auth";
import { lastSyncReport, syncMatter } from "@/lib/sync";
import { ensureDigest } from "@/lib/digest";
import { invalidateLocalCache } from "@/lib/local-cache";

// 303 + relative Location: the browser follows with GET and stays on the host it's using.
const seeOther = (location: string) => new Response(null, { status: 303, headers: { Location: location } });

// POST: pull the matter from Clio (read-only) into our DB, then digest it if anything changed.
export async function POST(request: Request) {
  if (!(await isClioConnected())) return seeOther("/auth/clio/login");
  const form = await request.formData().catch(() => null);
  const query = String(form?.get("query") ?? "Sapini");
  try {
    const report = await syncMatter(query);
    if (!report.matter) return seeOther("/firm?synced=0");
    const { reused } = await ensureDigest(report.matter.id);
    invalidateLocalCache("matters", `digest:${report.matter.id}:default`);
    return seeOther(`/firm?synced=1&digest=${reused ? "cached" : "new"}`);
  } catch (e) {
    return new Response(`Sync failed: ${String(e)}`, { status: 502 });
  }
}

// GET: the last sync report as JSON (handy for checking what Clio actually returned).
export async function GET() {
  return Response.json(await lastSyncReport());
}
