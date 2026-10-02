import { db } from "@/lib/db";
import { getAccessToken } from "@/lib/clio-auth";
import { clioDownload } from "@/lib/clio";

// Opens the original document behind a source chip: streams it from Clio (read-only GET).
// Only documents we have synced for a matter can be opened through here.
export async function GET(_request: Request, ctx: RouteContext<"/api/clio/documents/[id]">) {
  const { id } = await ctx.params;
  const known = db.prepare("SELECT title FROM items WHERE kind = 'document' AND clio_id = ?").get(Number(id)) as
    | { title: string | null }
    | undefined;
  if (!known) return new Response("Unknown document", { status: 404 });

  const token = await getAccessToken();
  if (!token) return new Response("Clio is not connected", { status: 401 });

  const file = await clioDownload(token, Number(id));
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `inline; filename="${(known.title ?? "document").replace(/"/g, "")}"`,
    },
  });
}
