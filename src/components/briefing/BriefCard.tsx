import { ArrowDown } from "lucide-react";
import type { CaseDigest } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { Sources } from "@/components/source/SourceChip";

// The 90-second read: headline + up to 5 labeled bullets, each with its source.
// The digest prompt orders bullets: what happened, injuries, liability & coverage, where it stands, biggest risk.
const LEADS = ["What happened", "Injuries", "Liability & coverage", "Where it stands", "Biggest risk"];

export function BriefCard({ digest }: { digest: CaseDigest }) {
  const bullets = digest.summary.slice(0, 5);
  const labeled = bullets.length === LEADS.length;
  const newCount = digest.timeline.filter((e) => e.date > digest.lastViewedAt.slice(0, 10)).length;

  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white px-4 pb-2.5 pt-3.5 shadow-sm" aria-label="Case summary">
      <div className="scroll-shadow min-h-0 flex-1 overflow-y-auto pr-1">
        <p className="text-[17px] font-semibold leading-snug text-slate-900">
          {digest.headline.text}
          <Sources sources={digest.headline.sources} max={1} compact />
        </p>
        <ul className="mt-1.5 space-y-1">
          {bullets.map((f, i) => (
            <li key={f.text} className="flex gap-2 text-sm leading-snug text-slate-700">
              <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${labeled && i === 4 ? "bg-red-500" : "bg-slate-400"}`} aria-hidden />
              <span>
                {labeled && <b className={`font-semibold ${i === 4 ? "text-red-700" : "text-slate-900"}`}>{LEADS[i]}: </b>}
                {f.text}
                <Sources sources={f.sources} max={1} compact />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-xs text-slate-500">
        <span>AI summary, {formatDate(digest.digestedAt)} · blue tags = sources, click one to read the original</span>
        {newCount > 0 && (
          <a href="#changes" className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline">
            See the {newCount} updates since your last visit <ArrowDown className="size-3" />
          </a>
        )}
      </div>
    </section>
  );
}
