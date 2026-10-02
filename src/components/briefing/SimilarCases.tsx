import { ExternalLink, Scale, TriangleAlert } from "lucide-react";
import type { Comparable } from "@/lib/types";

// Precedent / comparable outcomes. Every row must link to a real, checkable source.
// TODO: fill from a verdict/settlement source (e.g. Claude web search restricted to trusted domains,
// with citations). Never let the model invent a case: fake citations are the #1 legal-AI failure.
export function SimilarCases({ cases }: { cases: Comparable[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-1.5 text-base font-semibold text-slate-900">
        <Scale className="size-4 text-slate-500" aria-hidden /> Similar cases
      </h2>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-700">
        <TriangleAlert className="size-3" aria-hidden /> Check the source before relying on any comparison.
      </p>
      <ul className="mt-3 divide-y divide-slate-100">
        {cases.map((c) => (
          <li key={c.id} className="py-2 text-sm">
            <p className="font-medium text-slate-900">{c.title}</p>
            <p className="text-slate-600">
              {c.outcome} · <span className="text-slate-500">{c.whySimilar}</span>
            </p>
            <a
              href={c.sourceUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!c.sourceUrl}
              className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline aria-disabled:pointer-events-none aria-disabled:text-slate-400"
            >
              {c.sourceLabel} <ExternalLink className="size-3" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
