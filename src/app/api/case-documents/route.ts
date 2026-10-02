import { getCaseDigest } from "@/lib/data";
import { db } from "@/lib/db";
import { getAccessToken } from "@/lib/clio-auth";
import { clioDownload } from "@/lib/clio";
import { addReviewedFact, completeWorkflow, createCaseActionWorkflow, createRecordsRequest, createWorkflow, getCaseDocument, getCaseDocumentFile, listCaseDocuments, listFactReviews, listWorkflows, scanCaseDocument, searchCaseDocuments } from "@/lib/document-intelligence";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const matterId = new URL(request.url).searchParams.get("matterId") ?? "";
  const digest = await getCaseDigest(matterId);
  if (!digest) return Response.json({ error: "Unknown matter" }, { status: 404 });
  const [documents, workflows, facts] = await Promise.all([listCaseDocuments(digest), listWorkflows(matterId), listFactReviews(matterId)]);
  return Response.json({ documents, workflows, facts });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const matterId = String(body.matterId ?? "");
    const digest = await getCaseDigest(matterId);
    if (!digest) return Response.json({ error: "Unknown matter" }, { status: 404 });
    if (body.action === "search") {
      const query = String(body.query ?? "").trim().slice(0, 500);
      if (!query) return Response.json({ error: "Enter a document question." }, { status: 400 });
      return Response.json(await searchCaseDocuments(digest, query));
    }
    if (body.action === "scan-clio") {
      if (!/^\d+$/.test(matterId)) return Response.json({ error: "Connect and sync Clio before scanning its documents." }, { status: 400 });
      const documentId = Number(body.documentId);
      if (!Number.isSafeInteger(documentId) || documentId <= 0) return Response.json({ error: "Invalid document ID" }, { status: 400 });
      const row = await db.prepare("SELECT title, raw FROM items WHERE kind = 'document' AND matter_id = ? AND clio_id = ?")
        .get(Number(matterId), documentId) as { title: string | null; raw: string } | undefined;
      if (!row) return Response.json({ error: "Document is not in this case." }, { status: 404 });
      const token = await getAccessToken();
      if (!token) return Response.json({ error: "Connect Clio first." }, { status: 401 });
      const file = await clioDownload(token, documentId);
      const raw = JSON.parse(row.raw) as { content_type?: string };
      const contentType = (file.contentType.split(";")[0] === "application/octet-stream" ? raw.content_type : file.contentType.split(";")[0]) || "application/pdf";
      const document = await scanCaseDocument({ id: `doc-${documentId}`, digest, title: row.title ?? `Clio document ${documentId}`, origin: "clio", data: file.data, mimeType: contentType });
      return Response.json({ document });
    }
    if (body.action === "rescan") {
      const document = await getCaseDocument(String(body.documentId ?? ""));
      const data = document ? await getCaseDocumentFile(document.id) : null;
      if (!document || document.matter_id !== matterId || !data || !document.mime_type) return Response.json({ error: "Document file unavailable." }, { status: 404 });
      const rescanned = await scanCaseDocument({ id: document.id, digest, title: document.title, origin: document.origin, providerName: document.provider_name ?? undefined, data, mimeType: document.mime_type });
      return Response.json({ document: rescanned });
    }
    if (body.action === "workflow") {
      const documentId = String(body.documentId ?? "");
      const suggestion = body.suggestion as { label?: string; kind?: string; rationale?: string } | undefined;
      if (!suggestion?.label || !["contact", "file", "task"].includes(suggestion.kind ?? "")) return Response.json({ error: "Invalid suggestion" }, { status: 400 });
      const workflow = await createWorkflow(digest, documentId, { label: suggestion.label, kind: suggestion.kind as "contact" | "file" | "task", rationale: suggestion.rationale ?? "" });
      return Response.json({ workflow });
    }
    if (body.action === "request-records") {
      return Response.json(await createRecordsRequest(digest, String(body.providerId ?? "")));
    }
    if (body.action === "case-action") {
      return Response.json(await createCaseActionWorkflow(digest, String(body.actionId ?? "")));
    }
    if (body.action === "add-fact") {
      const fact = await addReviewedFact(digest, String(body.documentId ?? ""), String(body.fact ?? ""));
      return Response.json({ fact });
    }
    if (body.action === "complete-workflow") {
      await completeWorkflow(matterId, String(body.workflowId ?? ""));
      return Response.json({ status: "done" });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Document action failed." }, { status: 500 });
  }
}
