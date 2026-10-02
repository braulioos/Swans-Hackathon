"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CaseDigest, SourceRef } from "@/lib/types";
import { CATEGORY_STYLE, formatDate, formatMoney } from "@/lib/format";
import { SourceChip, Sources } from "@/components/source/SourceChip";

// Layer 2: everything, unfiltered. Collapsed by default but always one click away
// (HUD "Full case file" button, every "See all" link, and this always-visible bar).

const TABS = ["Events", "Tasks", "Providers", "All sources"] as const;
type Tab = (typeof TABS)[number];

export function FullCaseFile({ digest }: { digest: CaseDigest }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("Events");

  // "#case-file" opens it; "#case-file-tasks" opens it on the Tasks tab.
  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash;
      if (!hash.startsWith("#case-file")) return;
      setOpen(true);
      if (hash === "#case-file-tasks") setTab("Tasks");
      requestAnimationFrame(() => document.getElementById("case-file")?.scrollIntoView({ behavior: "smooth" }));
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  // TODO: "All sources" should list every raw item ingested from Clio (notes, emails, docs), searchable.
  const allSources = Array.from(
    new Map(
      [
        ...digest.timeline.flatMap((e) => e.sources),
        ...digest.quests.flatMap((q) => q.sources),
        ...digest.summary.flatMap((f) => f.sources),
        ...digest.injuries.flatMap((f) => f.sources),
      ].map((s): [string, SourceRef] => [s.id, s]),
    ).values(),
  );

  return (
    <section id="case-file" className="mx-auto mt-8 max-w-7xl scroll-mt-24 px-4 pb-16">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-300 bg-white px-5 py-4 text-left shadow-sm hover:bg-slate-50"
      >
        <span>
          <span className="block text-base font-semibold text-slate-900">Full case file</span>
          <span className="text-xs text-slate-500">
            Click to open everything, unfiltered: {digest.timeline.length} events, {digest.quests.length} open tasks & deadlines, providers, and{" "}
            {allSources.length} source notes, emails & documents
          </span>
        </span>
        <ChevronDown className={`size-5 text-slate-500 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex gap-1 border-b border-slate-200" role="tablist">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-slate-600 aria-selected:border-blue-600 aria-selected:font-medium aria-selected:text-slate-900"
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto">
            {tab === "Events" && (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {[...digest.timeline].reverse().map((e) => (
                    <tr key={e.id} className="align-top">
                      <td className="w-28 py-2 pr-3 text-xs text-slate-500">{formatDate(e.date)}</td>
                      <td className="w-24 py-2 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ring-1 ${CATEGORY_STYLE[e.category].chip}`}>{CATEGORY_STYLE[e.category].label}</span>
                      </td>
                      <td className="py-2">
                        <p className="font-medium text-slate-900">{e.title}</p>
                        <p className="text-slate-600">{e.summary}</p>
                      </td>
                      <td className="py-2 pl-3 text-right"><Sources sources={e.sources} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === "Tasks" && (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {digest.quests.map((q) => (
                    <tr key={q.id}>
                      <td className="w-24 py-2 pr-3 text-xs font-medium uppercase text-slate-500">{q.status}</td>
                      <td className="py-2 font-medium text-slate-900">{q.title}</td>
                      <td className="py-2 text-slate-600">{q.waitingOn ?? q.owner}</td>
                      <td className="py-2 text-xs text-slate-500">{q.due ? formatDate(q.due) : "—"}</td>
                      <td className="py-2 pl-3 text-right"><Sources sources={q.sources} /></td>
                      <td className="py-2 pl-3 text-right"><a href="#one-click-workflows" className="whitespace-nowrap text-xs font-semibold text-blue-700 hover:underline">Prepare workflow</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === "Providers" && (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {digest.providers.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 font-medium text-slate-900">{p.name}</td>
                      <td className="py-2 text-slate-600">{p.specialty}</td>
                      <td className="py-2">{p.billed !== undefined ? formatMoney(p.billed) : "—"}</td>
                      <td className="py-2 text-slate-600">{p.recordsReceived ? "Records in" : "Records missing"}</td>
                      <td className="py-2 text-xs text-slate-500">
                        {p.visitsAttended !== undefined ? `${p.visitsAttended} visits, ${p.visitsMissed ?? 0} missed` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === "All sources" && (
              <div className="flex flex-wrap gap-2">
                {allSources.map((s) => (
                  <SourceChip key={s.id} source={s} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
