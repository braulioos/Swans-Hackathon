"use client";

import type { SourceKind, SourceRef } from "@/lib/types";
import { useOpenSource } from "@/components/source/SourceProvider";
import { SOURCE_ICON } from "@/components/source/icons";

const KIND_WORD: Record<SourceKind, string> = {
  note: "note",
  email: "email",
  call: "call",
  document: "document",
  task: "task",
  calendar: "calendar",
  expense: "expense",
  field: "Clio field",
  contact: "contact",
};

// "If a date is on screen, I need to see where it came from." Blue = clickable proof.
// compact: icon + kind only (for narrow widgets); the full label is in the tooltip and the drawer.
export function SourceChip({ source, compact = false }: { source: SourceRef; compact?: boolean }) {
  const open = useOpenSource();
  const Icon = SOURCE_ICON[source.kind];
  return (
    <button
      type="button"
      onClick={() => open(source)}
      className="inline-flex max-w-full items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 align-middle text-[11px] font-medium text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100 hover:ring-blue-300"
      title={`Source: ${source.label}. Click to read the original ${KIND_WORD[source.kind]}.`}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{compact ? KIND_WORD[source.kind] : source.label}</span>
      {source.page !== undefined && <span className="shrink-0 text-blue-500">· p.{source.page}</span>}
    </button>
  );
}

export function Sources({ sources, max = 2, compact = false }: { sources: SourceRef[]; max?: number; compact?: boolean }) {
  if (sources.length === 0) return null;
  return (
    <span className="ml-1 inline-flex min-w-0 max-w-full flex-wrap gap-1 align-middle">
      {sources.slice(0, max).map((s) => (
        <SourceChip key={s.id} source={s} compact={compact} />
      ))}
    </span>
  );
}
