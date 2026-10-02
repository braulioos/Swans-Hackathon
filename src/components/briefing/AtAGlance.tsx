import type { CaseDigest } from "@/lib/types";
import { daysBetween, formatDate, formatMoney } from "@/lib/format";
import { SourceLink } from "@/components/source/SourceLink";

// Landing-screen widgets to the left of the brief. Both read straight from Clio case fields (no AI).
// Values are underlined links to their source instead of carrying a badge on every row.

const CARD = "flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";

export function KeyFacts({ digest }: { digest: CaseDigest }) {
  const contactDays = daysBetween(digest.lastClientContact.date, new Date().toISOString());
  return (
    <section id="facts" className={`${CARD} scroll-mt-24`} aria-labelledby="h-facts">
      <h2 id="h-facts" className="text-base font-semibold text-slate-900">
        Key case facts
      </h2>
      <p className="text-xs text-slate-500">From the case&apos;s Clio fields. Click a value to see its source.</p>
      <dl className="mt-2 grid min-h-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 overflow-y-auto pr-1 text-[13px] leading-snug scroll-shadow">
        {(digest.facts ?? []).map((f) => (
          <div key={f.label} className="contents">
            <dt className="text-slate-500">{f.label}</dt>
            <dd className="text-slate-900">
              <SourceLink source={f.sources[0]}>{f.value}</SourceLink>
            </dd>
          </div>
        ))}
        <dt className="text-slate-500">Last contact</dt>
        <dd className={contactDays > 30 ? "text-red-700" : contactDays > 14 ? "text-amber-700" : "text-slate-900"}>
          <SourceLink source={digest.lastClientContact.source}>
            {formatDate(digest.lastClientContact.date)} ({contactDays} days ago)
          </SourceLink>
        </dd>
      </dl>
    </section>
  );
}

function Bar({ label, value, max, tone }: { label: string; value: number; max: number; tone: "blue" | "amber" | "red" }) {
  const ratio = max > 0 ? (value / max) * 100 : 0;
  const shown = ratio > 0 && ratio < 1 ? "<1%" : `${Math.round(ratio)}%`;
  const fill = { blue: "bg-blue-600", amber: "bg-amber-500", red: "bg-red-500" }[tone];
  return (
    <div>
      <div className="flex justify-between gap-2 text-xs text-slate-500">
        <span>{label}</span>
        <span className="font-semibold text-slate-700">{shown}</span>
      </div>
      <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${label}: ${shown}`}>
        <i className={`block h-full rounded-full ${fill}`} style={{ width: `${Math.min(100, ratio)}%` }} />
      </div>
    </div>
  );
}

// "The two KPIs I care about most: what is the case worth, and what coverage sits behind it."
export function MoneyWidget({ digest }: { digest: CaseDigest }) {
  const { caseValue, coverage, medicalSpecials, firmSpend } = digest.kpis;
  const m = digest.money ?? {};
  const rows = [
    { label: "Est. worth", kpi: caseValue },
    { label: "Coverage", kpi: coverage },
    { label: "Medical bills", kpi: medicalSpecials },
    { label: "Firm spend", kpi: firmSpend },
  ];
  const overBy = m.caseValue && m.coverageLimit && m.caseValue > m.coverageLimit ? m.caseValue - m.coverageLimit : 0;

  return (
    <section className={CARD} aria-labelledby="h-money">
      <h2 id="h-money" className="text-base font-semibold text-slate-900">
        Money
      </h2>
      <p className="text-xs text-slate-500">What the case may be worth vs. what insurance can pay.</p>
      <div className="scroll-shadow mt-2 min-h-0 overflow-y-auto pr-1">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="contents">
              <dt className="text-slate-500">{r.label}</dt>
              <dd className="font-semibold text-slate-900">
                <SourceLink source={r.kpi.sources[0]}>{r.kpi.value}</SourceLink>
              </dd>
            </div>
          ))}
        </dl>
        {m.caseValue && m.coverageLimit ? (
          <div className="mt-3 space-y-2 border-t border-slate-100 pt-2">
            <Bar label="Worth vs. coverage limit" value={m.caseValue} max={m.coverageLimit} tone={overBy > 0 ? "red" : "blue"} />
            {overBy > 0 && <p className="text-xs font-medium text-red-700">Worth is {formatMoney(overBy)} over the limit. Recovery may be capped.</p>}
            {m.specials ? <Bar label="Medical bills vs. coverage limit" value={m.specials} max={m.coverageLimit} tone="amber" /> : null}
            {m.firmSpend ? <Bar label="Firm spend vs. est. worth" value={m.firmSpend} max={m.caseValue} tone="amber" /> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
