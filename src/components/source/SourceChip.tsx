"use client";

import type { SourceRef } from "@/lib/types";
import { useOpenSource } from "@/components/source/SourceProvider";
import { SOURCE_ICON } from "@/components/source/icons";

export function SourceChip({ source }: { source: SourceRef }) {
  const open = useOpenSource();
  const Icon = SOURCE_ICON[source.kind];
  return (
    <button
      type="button"
      onClick={() => open(source)}
      className="inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-blue-50 hover:text-blue-700 hover:ring-blue-200"
      title={`Open the original: ${source.label}`}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{source.label}</span>
      {source.page !== undefined && <span className="shrink-0 text-slate-400">· p.{source.page}</span>}
    </button>
  );
}

export function Sources({ sources }: { sources: SourceRef[] }) {
  if (sources.length === 0) return null;
  return (
    <span className="ml-1 inline-flex min-w-0 max-w-full flex-wrap gap-1 align-middle">
      {sources.map((s) => (
        <SourceChip key={s.id} source={s} />
      ))}
    </span>
  );
}
