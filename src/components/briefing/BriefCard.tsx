import type { CaseDigest } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { Sources } from "@/components/source/SourceChip";

// Layer 1: the 90-second read. One headline + at most 5 bullets (chunking keeps working memory free).
export function BriefCard({ digest }: { digest: CaseDigest }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">The 90-second brief</h2>
        <span className="text-[11px] text-slate-400">Digested {formatDate(digest.digestedAt)}</span>
      </div>
      <p className="mt-2 text-lg font-semibold leading-snug text-slate-900">
        {digest.headline.text}
        <Sources sources={digest.headline.sources} />
      </p>
      <ul className="mt-3 space-y-2">
        {digest.summary.slice(0, 5).map((f) => (
          <li key={f.text} className="flex gap-2 text-sm leading-relaxed text-slate-700">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-slate-400" />
            <span>
              {f.text}
              <Sources sources={f.sources} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
