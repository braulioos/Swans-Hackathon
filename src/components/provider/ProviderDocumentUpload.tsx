"use client";

import { useState } from "react";
import { FileUp } from "lucide-react";

export function ProviderDocumentUpload({ token }: { token: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><FileUp className="size-5 text-blue-700" /> Send a document to the firm</h2>
      <p className="mt-1 text-sm text-slate-600">Upload a medical record, bill, narrative, or response. The firm receives an AI scan with a summary and cross checks against the case file.</p>
      <form className="mt-3 flex flex-wrap items-center gap-3" onSubmit={async (event) => {
        event.preventDefault();
        if (!file) return;
        const formElement = event.currentTarget;
        setBusy(true); setMessage("Scanning your document…");
        try {
          const form = new FormData(); form.set("token", token); form.set("file", file);
          const response = await fetch("/api/provider-documents", { method: "POST", body: form });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? "Upload failed");
          setMessage(data.pending ? data.message : `Received and scanned: ${data.title}. The firm can review it now.`);
          setFile(null);
          formElement.reset();
        } catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed"); }
        finally { setBusy(false); }
      }}>
        <input aria-label="Choose document" type="file" accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,.gif" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="max-w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-medium file:text-blue-800" />
        <button disabled={!file || busy} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Scanning…" : "Upload and scan"}</button>
      </form>
      {message && <p role="status" className="mt-3 text-sm text-slate-700">{message}</p>}
      <p className="mt-2 text-xs text-slate-500">PDF, image, or text · maximum 15 MB</p>
    </section>
  );
}
