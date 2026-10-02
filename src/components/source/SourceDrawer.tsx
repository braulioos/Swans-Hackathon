"use client";

import { useEffect } from "react";
import { ExternalLink, X } from "lucide-react";
import type { SourceRef } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { SOURCE_ICON } from "@/components/source/icons";

// Layer 3 of progressive disclosure: the raw original. Slides in, Esc or backdrop closes it.
export function SourceDrawer({ source, onClose }: { source: SourceRef | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!source) return null;
  const Icon = SOURCE_ICON[source.kind];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Source">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-900/30" />
      <aside className="relative flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Icon className="size-4" aria-hidden />
            {source.kind}
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <h2 className="text-lg font-semibold text-slate-900">{source.label}</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {source.date && (
            <>
              <dt className="text-slate-500">Date</dt>
              <dd>{formatDate(source.date)}</dd>
            </>
          )}
          {source.page !== undefined && (
            <>
              <dt className="text-slate-500">Page</dt>
              <dd>{source.page}</dd>
            </>
          )}
        </dl>
        {/* TODO: render the full note/email body, or a PDF viewer jumped to source.page */}
        <blockquote className="whitespace-pre-wrap rounded-lg border-l-4 border-blue-300 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
          {source.excerpt ?? (source.kind === "document" ? "Open the original document below." : "No text stored for this source.")}
        </blockquote>
        <a
          href={source.clioUrl ?? "#"}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!source.clioUrl}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Open original <ExternalLink className="size-4" />
        </a>
      </aside>
    </div>
  );
}
