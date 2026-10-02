import { Sparkles } from "lucide-react";
import type { CaseDigest } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { SourceChip } from "@/components/source/SourceChip";

// "Previously on..." recap, like a game's returning-player screen.
export function SinceLastVisit({ digest }: { digest: CaseDigest }) {
  const fresh = digest.timeline.filter((e) => e.date > digest.lastViewedAt.slice(0, 10));
  const heading = digest.firstVisit
    ? `First time here: the last 30 days, ${fresh.length} event${fresh.length === 1 ? "" : "s"}`
    : `Since your last visit (${formatDate(digest.lastViewedAt)}): ${fresh.length} new`;

  if (fresh.length === 0) {
    return (
      <p id="changes" className="flex scroll-mt-24 flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-600">
        <span>Nothing new since your last visit on {formatDate(digest.lastViewedAt)}.</span>
        <a href="?since=30" className="text-xs font-medium text-blue-700 hover:underline">
          Show the last 30 days
        </a>
      </p>
    );
  }
  return (
    <section id="changes" className="scroll-mt-24 rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-blue-900">
        <Sparkles className="size-4" aria-hidden />
        {heading}
      </h2>
      <p className="text-xs text-blue-800">What changed while you were away, and what each change means for the case (→).</p>
      <ul className="mt-2 space-y-2">
        {fresh.map((e) => (
          <li key={e.id} className="text-sm text-blue-950">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-24 shrink-0 text-xs text-blue-700">{formatDate(e.date)}</span>
              <span className="font-medium">{e.title}</span>
              {e.sources[0] && <SourceChip source={e.sources[0]} />}
            </div>
            {e.impact && <p className="pl-26 text-xs text-blue-800">→ {e.impact}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
