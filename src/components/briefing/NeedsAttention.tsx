import { ArrowRight, CircleCheck } from "lucide-react";
import type { CaseDigest } from "@/lib/types";
import { buildAlerts, type AlertTone } from "@/lib/attention";
import { SourceLink } from "@/components/source/SourceLink";

const TONE: Record<AlertTone, string> = { urgent: "text-red-700", soon: "text-amber-700" };

// The one place for "what do I act on": overdue tasks, the next deadline, what others owe the firm,
// client contact and missing records. Big value first, one line of context (click it for the source),
// and a labeled link to the matching assistant workflow.
export function NeedsAttention({ digest }: { digest: CaseDigest }) {
  const alerts = buildAlerts(digest);

  if (alerts.length === 0) {
    return (
      <section className="flex items-center gap-2 rounded-2xl border border-emerald-200 border-l-4 border-l-emerald-500 bg-emerald-50 p-4 shadow-sm">
        <CircleCheck className="size-5 text-emerald-600" aria-hidden />
        <p className="text-sm font-medium text-emerald-800">Nothing needs attention: no overdue tasks, close deadlines or missing records.</p>
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-3 rounded-2xl border border-red-200 border-l-4 border-l-red-500 bg-red-50 p-4 shadow-sm lg:flex-row lg:items-stretch"
      aria-labelledby="h-attn"
    >
      <div className="lg:w-52 lg:shrink-0">
        <h2 id="h-attn" className="text-base font-semibold text-slate-900">
          Needs attention
        </h2>
        <p className="text-xs text-slate-600">Open a matching AI workflow for each item.</p>
      </div>
      <div className="grid flex-1 grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        {alerts.map((a) => (
          <div key={a.id} className="flex min-w-0 flex-col gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium text-slate-500">{a.kind}</span>
              <a href={a.href} className="inline-flex shrink-0 items-center gap-1 font-semibold text-blue-700 hover:underline">
                {a.cta} <ArrowRight className="size-3" />
              </a>
            </div>
            <div className="flex items-start gap-2.5">
              <b className={`shrink-0 text-xl font-bold leading-tight ${TONE[a.tone]}`}>{a.big}</b>
              <p className="line-clamp-2 min-w-0 text-[13px] leading-snug text-slate-700">
                <SourceLink source={a.source}>{a.label}</SourceLink>
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
