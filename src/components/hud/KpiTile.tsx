import type { ReactNode } from "react";
import type { SourceRef } from "@/lib/types";
import { Sources } from "@/components/source/SourceChip";

type Tone = "neutral" | "good" | "warn" | "bad";

const TONE: Record<Tone, string> = {
  neutral: "border-slate-200",
  good: "border-emerald-300 bg-emerald-50/50",
  warn: "border-amber-300 bg-amber-50/60",
  bad: "border-red-300 bg-red-50/60",
};

export function KpiTile({
  label,
  value,
  hint,
  sources = [],
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  sources?: SourceRef[];
  tone?: Tone;
  icon?: ReactNode;
}) {
  return (
    <div className={`min-w-0 rounded-xl border bg-white px-3 py-2 ${TONE[tone]}`}>
      <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </p>
      <p className="truncate text-lg font-semibold text-slate-900">{value}</p>
      <div className="flex flex-wrap items-center gap-1">
        {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
        <Sources sources={sources} />
      </div>
    </div>
  );
}
