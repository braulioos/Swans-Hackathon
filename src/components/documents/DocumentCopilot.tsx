"use client";

import { useEffect, useState } from "react";
import { FileSearch, Sparkles } from "lucide-react";
import type { CaseDocument } from "@/lib/document-intelligence";
import type { Provider } from "@/lib/types";
import type { CaseAction } from "@/lib/case-actions";

type Workflow = { id: string; documentId: string; kind: string; title: string; content: string; status: string; createdAt: string };
type FactReview = { id: string; documentId: string; fact: string; evidenceJson: string; createdAt: string };
type SearchResult = { answer: string; results: { document: CaseDocument; reason: string }[] };

export function DocumentCopilot({ matterId, providers, suggestedActions, initialDocuments, initialWorkflows, initialFacts }: { matterId: string; providers: Provider[]; suggestedActions: CaseAction[]; initialDocuments: CaseDocument[]; initialWorkflows: Workflow[]; initialFacts: FactReview[] }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [facts, setFacts] = useState(initialFacts);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchResult | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [allDocs, setAllDocs] = useState(true);
  const [allWorkflows, setAllWorkflows] = useState(true);
  const [lastPreparedId, setLastPreparedId] = useState("");

  useEffect(() => {
    if (initialDocuments.length > 0) return;
    const controller = new AbortController();
    fetch(`/api/case-documents?matterId=${encodeURIComponent(matterId)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load documents");
        return response.json();
      })
      .then((data) => { setDocuments(data.documents); setWorkflows(data.workflows); setFacts(data.facts); })
      .catch((cause) => { if (!controller.signal.aborted) setError(String(cause)); });
    return () => controller.abort();
  }, [matterId, initialDocuments.length]);

  async function refresh() {
    const response = await fetch(`/api/case-documents?matterId=${encodeURIComponent(matterId)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not refresh documents");
    setDocuments(data.documents); setWorkflows(data.workflows); setFacts(data.facts);
  }
  async function action(name: string, payload: Record<string, unknown>, after?: (data: Record<string, unknown>) => void) {
    setBusy(name); setError("");
    try {
      const response = await fetch("/api/case-documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matterId, ...payload }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Action failed");
      after?.(data);
      if (payload.action !== "search") {
        setLastPreparedId(String(data.taskId ?? data.requestId ?? (data.workflow as { id?: string } | undefined)?.id ?? ""));
        setAllWorkflows(true);
        await refresh();
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Action failed"); }
    finally { setBusy(""); }
  }
  function downloadDraft(workflow: Workflow) {
    const url = URL.createObjectURL(new Blob([workflow.content], { type: "text/plain" }));
    const link = document.createElement("a"); link.href = url; link.download = `case-workflow-${workflow.id}.txt`; link.click(); URL.revokeObjectURL(url);
  }
  const missingProviders = providers.filter((provider) => !provider.recordsReceived);
  const shownDocuments = allDocs ? documents : documents.slice(0, 3);
  const shownWorkflows = allWorkflows ? workflows : workflows.slice(0, 2);

  return <section id="document-copilot" className="mx-auto mt-7 w-full max-w-[1400px] scroll-mt-24 px-4"><div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-white to-indigo-50/60 p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Sparkles className="size-5 text-indigo-600" /> Case document copilot</h2><p className="mt-1 text-sm text-slate-600">Ask for a document in plain language. Provider files are scanned on arrival and checked against the case record.</p></div><button type="button" disabled={!!busy} onClick={() => { setBusy("refresh"); refresh().catch((cause) => setError(String(cause))).finally(() => setBusy("")); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">Refresh inbox</button></div>
    <form onSubmit={(event) => { event.preventDefault(); action("search", { action: "search", query }, (data) => setSearch(data as SearchResult)); }} className="mt-4 flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find the MRI, a bill requesting payment, or evidence of missed visits…" aria-label="Find case documents with AI" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500" /><button disabled={!query.trim() || !!busy} className="flex shrink-0 items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><FileSearch className="size-4" />{busy === "search" ? "Finding…" : "Find with AI"}</button></form>
    <div className="mt-2 flex flex-wrap gap-2">{["Where is the MRI showing the lumbar injury?", "Find bills and lien reduction requests", "Which document supports the insurer demand?"].map((prompt) => <button key={prompt} type="button" onClick={() => { setQuery(prompt); action("search", { action: "search", query: prompt }, (data) => setSearch(data as SearchResult)); }} className="rounded-full bg-white px-3 py-1 text-xs text-indigo-700 ring-1 ring-indigo-100 hover:ring-indigo-300">{prompt}</button>)}</div>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {search && <div className="mt-4 rounded-xl border border-indigo-100 bg-white p-4"><p className="text-sm font-medium text-slate-800">{search.answer}</p><ul className="mt-3 space-y-2">{search.results.map(({ document, reason }) => <li key={document.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"><div><p className="text-sm font-semibold text-slate-900">{document.title}</p><p className="text-xs text-slate-600">{reason}</p><p className="text-[11px] text-slate-500">{document.origin} · {document.scan ? "full file scanned" : "reference/title only"} · {document.id}</p></div>{document.url && <a href={document.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-indigo-700">Open file</a>}</li>)}</ul></div>}
    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-semibold text-slate-900">Document inbox <span className="font-normal text-slate-500">· {documents.filter((d) => d.origin === "provider").length} provider · {documents.filter((d) => d.scan).length} scanned</span></h3><div className={`mt-2 space-y-2 ${allDocs ? "max-h-[570px] overflow-y-auto pr-1" : ""}`}>{shownDocuments.map((doc) => <div key={doc.id} className="rounded-xl border border-slate-200 p-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-900" title={doc.title}>{doc.title}</p><p className="text-xs text-slate-500">{doc.origin === "provider" ? doc.providerName ?? "Provider" : doc.origin === "clio" ? "Clio" : "Case reference"} · {doc.scan ? "AI scanned" : "Not scanned"}</p></div><div className="flex shrink-0 gap-2 text-xs font-semibold">{doc.url && <a href={doc.url} target="_blank" rel="noreferrer" className="text-blue-700">Open</a>}{doc.origin === "clio" && !doc.scan && <button disabled={!!busy} onClick={() => action(`scan-${doc.id}`, { action: "scan-clio", documentId: Number(doc.id.replace("doc-", "")) })} className="text-blue-700">{busy === `scan-${doc.id}` ? "Scanning…" : "Scan"}</button>}{doc.origin === "provider" && !doc.scan && <button disabled={!!busy} onClick={() => action(`scan-${doc.id}`, { action: "rescan", documentId: doc.id })} className="text-blue-700">Retry scan</button>}</div></div>{doc.scan && <details open className="mt-3 border-t border-slate-100 pt-3 text-sm"><summary className="cursor-pointer text-xs font-semibold text-blue-700">AI scan · {doc.scan.suggestions.length} suggested actions</summary><p className="mt-2 text-slate-700"><b>Summary:</b> {doc.scan.summary}</p><p className="mt-1 text-slate-700"><b>Impact:</b> {doc.scan.significance}</p>{doc.scan.requests.length > 0 && <p className="mt-1 text-amber-800"><b>Requests:</b> {doc.scan.requests.join("; ")}</p>}{doc.scan.conflicts.length > 0 && <p className="mt-1 text-red-700"><b>Check:</b> {doc.scan.conflicts.join("; ")}</p>}{doc.scan.suggestions.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{doc.scan.suggestions.map((suggestion, index) => <button key={index} disabled={!!busy} onClick={() => action(`workflow-${doc.id}-${index}`, { action: "workflow", documentId: doc.id, suggestion })} title={suggestion.rationale} className="rounded-lg bg-blue-700 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{busy === `workflow-${doc.id}-${index}` ? "Preparing…" : suggestion.label}</button>)}</div>}{doc.scan.facts.length > 0 && <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-blue-700">Cross checked facts ({doc.scan.facts.length})</summary><ul className="mt-2 space-y-2">{doc.scan.facts.map((fact, index) => <li key={index} className="rounded-lg bg-slate-50 p-2 text-xs"><p className="font-medium text-slate-800">{fact.text}</p><p className="text-slate-500">{fact.status} · {fact.corroboratingSourceIds.join(", ") || "no independent match"}{fact.page ? ` · page ${fact.page}` : ""}</p><button disabled={!!busy || facts.some((f) => f.documentId === doc.id && f.fact === fact.text)} onClick={() => action(`fact-${doc.id}-${index}`, { action: "add-fact", documentId: doc.id, fact: fact.text })} className="mt-1 font-semibold text-blue-700 disabled:text-slate-400">{facts.some((f) => f.documentId === doc.id && f.fact === fact.text) ? "In review log" : "Add to review log"}</button></li>)}</ul></details>}</details>}</div>)}{documents.length === 0 && <p className="text-sm text-slate-500">No documents yet.</p>}</div>{documents.length > 3 && <button onClick={() => setAllDocs(!allDocs)} className="mt-3 text-xs font-semibold text-blue-700">{allDocs ? "Show fewer" : `Show all ${documents.length} documents`}</button>}</div>
      <div className="space-y-4"><div id="record-requests" className="scroll-mt-24 rounded-xl border border-slate-200 p-4"><h3 className="text-sm font-semibold text-slate-900">Request missing records</h3>{missingProviders.length ? <div className="mt-2 flex flex-wrap gap-2">{missingProviders.map((provider) => <button key={provider.id} disabled={!!busy} onClick={() => action(`request-${provider.id}`, { action: "request-records", providerId: provider.id })} className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-50">{busy === `request-${provider.id}` ? "Preparing…" : `Request from ${provider.name}`}</button>)}</div> : <p className="mt-2 text-xs text-slate-500">No missing records flagged.</p>}</div>
      <div id="one-click-workflows" className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-semibold text-slate-900">One click workflows <span className="font-normal text-slate-500">· {workflows.length}</span></h3>
      {suggestedActions.length > 0 && <div className="mt-3 border-b border-slate-100 pb-3"><p className="text-xs font-semibold text-slate-600">Suggested tasks</p><ul className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">{suggestedActions.map((suggestion) => <li key={suggestion.id} className="flex items-start justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"><span className="min-w-0 text-xs text-slate-800">{suggestion.label}</span><button disabled={!!busy} onClick={() => { setAllWorkflows(true); action(`case-${suggestion.id}`, { action: "case-action", actionId: suggestion.id }); }} className="shrink-0 text-xs font-semibold text-blue-700 disabled:opacity-50">{busy === `case-${suggestion.id}` ? "Preparing…" : "Prepare workflow"}</button></li>)}</ul></div>}
      <div className="mt-2 space-y-2">{shownWorkflows.map((workflow) => <WorkflowCard key={workflow.id} workflow={workflow} highlighted={workflow.id === lastPreparedId} busy={!!busy} onDone={() => action(`done-${workflow.id}`, { action: "complete-workflow", workflowId: workflow.id })} onDownload={() => downloadDraft(workflow)} />)}{workflows.length === 0 && <p className="text-xs text-slate-500">Scan a file or request records to prepare work.</p>}</div>{workflows.length > 2 && <button onClick={() => setAllWorkflows(!allWorkflows)} className="mt-3 text-xs font-semibold text-blue-700">{allWorkflows ? "Show fewer" : `Show all ${workflows.length} workflows`}</button>}</div>
      {facts.length > 0 && <details open className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer text-sm font-semibold text-slate-900">Case review log · {facts.length}</summary><ul className="mt-2 space-y-2">{facts.map((fact) => <li key={fact.id} className="text-xs text-slate-700">{fact.fact} <span className="text-slate-500">[{fact.documentId}]</span></li>)}</ul></details>}</div>
    </div>
  </div></section>;
}


function WorkflowCard({ workflow, highlighted, busy, onDone, onDownload }: { workflow: Workflow; highlighted: boolean; busy: boolean; onDone: () => void; onDownload: () => void }) {
  const [beforeSources, sourceList = ""] = workflow.content.split(/\n\s*Sources:\s*/);
  const [body, checklistText = ""] = beforeSources.split(/\n\s*Checklist:\s*/);
  const steps = checklistText.split("\n").map((line) => line.replace(/^[-*]\s*/, "").trim()).filter(Boolean);
  const sources = sourceList.split(",").map((source) => source.trim()).filter(Boolean);
  const preview = body.trim().split("\n").find(Boolean) ?? workflow.content.slice(0, 160);
  const kindLabel = workflow.kind === "contact" ? "Message draft" : workflow.kind === "file" ? "Filing packet" : "Internal task";
  return <article id={`workflow-${workflow.id}`} className={`rounded-xl border bg-white p-3 shadow-sm ${highlighted ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}`}>
    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">{kindLabel}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${workflow.status === "done" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{workflow.status === "done" ? "Done" : workflow.kind === "task" ? "Ready" : "Review before sending"}</span></div>
    <h4 className="mt-2 text-sm font-semibold text-slate-900">{workflow.title}</h4>
    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">{preview}</p>
    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold"><button onClick={() => navigator.clipboard.writeText(workflow.content)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-700 hover:bg-slate-50">Copy</button>{workflow.kind === "contact" && <a href={`mailto:?subject=${encodeURIComponent(workflow.title)}&body=${encodeURIComponent(workflow.content)}`} className="rounded-lg bg-blue-700 px-2.5 py-1.5 text-white">Open email draft</a>}{workflow.kind === "file" && <button onClick={onDownload} className="rounded-lg bg-blue-700 px-2.5 py-1.5 text-white">Download packet</button>}{workflow.kind === "task" && workflow.status === "open" && <button disabled={busy} onClick={onDone} className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-white disabled:opacity-50">Mark done</button>}</div>
    <details open={highlighted} className="mt-3 border-t border-slate-100 pt-2"><summary className="cursor-pointer text-xs font-semibold text-blue-700">Steps and evidence</summary><div className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{body.trim()}</div>{steps.length > 0 && <ol className="mt-3 space-y-1.5">{steps.map((step, index) => <li key={index} className="flex gap-2 text-xs text-slate-700"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-indigo-50 font-semibold text-indigo-700">{index + 1}</span><span>{step}</span></li>)}</ol>}{sources.length > 0 && <p className="mt-3 text-[11px] text-slate-500">Sources: {sources.join(", ")}</p>}</details>
  </article>;
}
