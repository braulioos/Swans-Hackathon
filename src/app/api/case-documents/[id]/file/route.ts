import { getCaseDocument, getCaseDocumentFile } from "@/lib/document-intelligence";

export const runtime = "nodejs";

export async function GET(_request: Request, ctx: RouteContext<"/api/case-documents/[id]/file">) {
  const { id } = await ctx.params;
  const document = await getCaseDocument(id);
  const data = document ? await getCaseDocumentFile(document.id) : null;
  if (!document || !data) return new Response("Document unavailable", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": document.mime_type ?? "application/octet-stream", "Content-Disposition": `inline; filename="${document.title.replace(/["\\\r\n]/g, "")}"`, "Cache-Control": "private, no-store" },
  });
}
