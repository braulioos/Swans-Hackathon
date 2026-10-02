import { Lightbulb } from "lucide-react";
import type { MovePriority, NextMove } from "@/lib/types";
import { Sources } from "@/components/source/SourceChip";

// Not just a digest: suggest the next move, and cite the facts behind each suggestion.
const PRIORITY: Record<MovePriority, { label: string; style: string }> = {
  now: { label: "Now", style: "bg-red-50 text-red-700 ring-red-200" },
  soon: { label: "Soon", style: "bg-amber-50 text-amber-800 ring-amber-200" },
  later: { label: "Later", style: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export function NextMoves({ moves }: { moves: NextMove[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-base font-semibold text-slate-900">
          <Lightbulb className="size-4 text-amber-500" aria-hidden /> Suggested next moves
        </h2>
        <span className="text-[11px] text-slate-400">AI suggestion · attorney decides</span>
      </div>
      <ol className="mt-3 space-y-2">
        {moves.map((m) => (
          <li key={m.text} className="flex gap-3 text-sm leading-relaxed text-slate-700">
            <span className={`mt-0.5 h-fit shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${PRIORITY[m.priority].style}`}>
              {PRIORITY[m.priority].label}
            </span>
            <span>
              {m.text}
              <Sources sources={m.sources} />
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
