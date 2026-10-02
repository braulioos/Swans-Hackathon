import Link from "next/link";
import { Check, X } from "lucide-react";
import type { CaseDigest } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { Sources } from "@/components/source/SourceChip";

// "Somewhere in a 200-page scan are my client's primary injuries."
export function InjuriesCard({ digest }: { digest: CaseDigest }) {
  return (
    <section className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Primary injuries</h2>
      <p className="text-xs text-slate-500">Most serious first, pulled from notes and medical records.</p>
      <ul className="mt-2 space-y-1.5">
        {digest.injuries.map((f) => (
          <li key={f.text} className="text-sm text-slate-700">
            {f.text}
            <Sources sources={f.sources} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ProvidersCard({ digest }: { digest: CaseDigest }) {
  return (
    <section id="providers" className="h-full scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Treating providers</h2>
      <p className="text-xs text-slate-500">Who is treating the client, and whether the firm has their records.</p>
      <ul className="mt-2 divide-y divide-slate-100">
        {digest.providers.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">{p.name}</p>
              <p className="text-xs text-slate-500">{p.specialty}</p>
            </div>
            <div className="text-right">
              {p.billed !== undefined && <p className="font-medium text-slate-900">{formatMoney(p.billed)}</p>}
              <p className={`inline-flex items-center gap-1 text-xs ${p.recordsReceived ? "text-emerald-700" : "text-amber-700"}`}>
                {p.recordsReceived ? <Check className="size-3" /> : <X className="size-3" />}
                {p.recordsReceived ? "Records in" : "Records missing"}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <Link
        href={`/firm/matter/${digest.matterId}/share`}
        className="mt-2 block rounded-lg px-3 py-2 text-center text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
      >
        Share case status with a provider →
        <span className="block text-[11px] font-normal text-slate-500">They see progress, not your strategy</span>
      </Link>
    </section>
  );
}
