import { getCaseDigest, getShare } from "@/lib/data";
import crypto from "node:crypto";
import { getCaseDocument, scanCaseDocument } from "@/lib/document-intelligence";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const token = String(form.get("token") ?? "");
    const share = await getShare(token);
    if (!share) return Response.json({ error: "Invalid or expired share link." }, { status: 403 });
    const digest = await getCaseDigest(share.matterId);
    if (!digest) return Response.json({ error: "Case unavailable." }, { status: 404 });
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Choose a document." }, { status: 400 });
    if (file.size > 15 * 1024 * 1024 || file.size === 0) return Response.json({ error: "File must be under 15 MB." }, { status: 400 });
    const providerName = digest.providers.find((p) => p.id === share.providerId)?.name ?? "Medical provider";
    const mimeType = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "text/plain");
    const id = `provider-${crypto.randomUUID()}`;
    try {
      const document = await scanCaseDocument({ id, digest, title: file.name.slice(0, 180), origin: "provider", providerName, data: Buffer.from(await file.arrayBuffer()), mimeType });
      // The provider may receive an acknowledgment, never the firm-only cross-check analysis.
      return Response.json({ id: document.id, title: document.title });
    } catch (error) {
      if (await getCaseDocument(id)) return Response.json({ id, title: file.name, pending: true, message: "Document received. AI scan is pending; the firm can retry it." }, { status: 202 });
      throw error;
    }
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 500 });
  }
}
