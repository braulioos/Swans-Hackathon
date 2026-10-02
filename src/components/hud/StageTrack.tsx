import { Check } from "lucide-react";
import type { Stage } from "@/lib/types";
import { STAGES } from "@/lib/format";

// Level-progress bar: where the case is on its journey. Same component on firm and provider sides.
export function StageTrack({ stage }: { stage: Stage }) {
  const current = STAGES.findIndex((s) => s.id === stage);
  return (
    <ol className="flex w-full items-center gap-1" aria-label="Case stage">
      {STAGES.map((s, i) => {
        const done = i < current;
        const here = i === current;
        return (
          <li key={s.id} className="flex flex-1 flex-col gap-1" aria-current={here ? "step" : undefined}>
            <div className={`h-1.5 rounded-full ${done ? "bg-blue-600" : here ? "bg-blue-400" : "bg-slate-200"}`} />
            <span className={`flex items-center gap-1 text-[11px] ${here ? "font-semibold text-blue-700" : done ? "text-slate-600" : "text-slate-400"}`}>
              {done && <Check className="size-3" aria-hidden />}
              {s.label}
              {here && <span className="sr-only">(current stage)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
