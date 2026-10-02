"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Settlement } from "@/lib/settlement";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export function SettlementPanel({ matterId, initialSettlement }: { matterId: string; initialSettlement: Settlement | null }) {
  const router = useRouter();
  const [settlement, setSettlement] = useState(initialSettlement);
  const [amount, setAmount] = useState(initialSettlement ? String(initialSettlement.amountCents / 100) : "");
  const [settledOn, setSettledOn] = useState(initialSettlement?.settledOn ?? "");
  const [sourceNote, setSourceNote] = useState(initialSettlement?.sourceNote ?? "");
  const [showAmount, setShowAmount] = useState(initialSettlement?.showAmountToProvider ?? false);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [providerCount, setProviderCount] = useState<number | null>(null);

  useEffect(() => {
    if (initialSettlement) return;
    const controller = new AbortController();
    fetch(`/api/settlements?matterId=${encodeURIComponent(matterId)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const current = data?.settlement as Settlement | null | undefined;
        if (!current) return;
        setSettlement(current);
        setAmount(String(current.amountCents / 100));
        setSettledOn(current.settledOn);
        setSourceNote(current.sourceNote);
        setShowAmount(current.showAmountToProvider);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [matterId, initialSettlement]);

  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/settlements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matterId, amount: Number(amount), settledOn, sourceNote, showAmountToProvider: showAmount, verified }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save settlement");
      setSettlement(data.settlement); setProviderCount(data.providerCount); setVerified(false); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save settlement"); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/settlements?matterId=${encodeURIComponent(matterId)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not remove settlement");
      setSettlement(null); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove settlement"); }
    finally { setBusy(false); }
  }

  return <section id="settlement" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-base font-semibold text-slate-900">Settlement updates</h2>{settlement && <span className="text-sm font-semibold text-emerald-700">Settled · {money(settlement.amountCents)}</span>}</div>
    {settlement ? <div className="mt-3 grid gap-3 text-sm md:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3"><h3 className="font-semibold text-slate-900">For the firm</h3><p className="mt-1 text-slate-700">{settlement.firmNotice}</p></div><div className="rounded-xl bg-blue-50 p-3"><h3 className="font-semibold text-slate-900">For providers</h3><p className="mt-1 text-slate-700">{settlement.providerNotice}</p><p className="mt-1 text-xs text-slate-600">{settlement.showAmountToProvider ? `Gross value shown: ${money(settlement.amountCents)}.` : "Gross value is private."} Active provider links show this notice. Email drafts and firm tasks are in AI workflows.</p></div></div> : <p className="mt-1 text-sm text-slate-600">Record a verified settlement to update the firm and provider views and prepare follow-up work.</p>}
    {providerCount !== null && <p role="status" className="mt-2 text-xs font-medium text-emerald-700">Prepared updates for {providerCount} treating providers.</p>}
    <details className="mt-3" open={!settlement}><summary className="cursor-pointer text-sm font-semibold text-blue-700">{settlement ? "Edit settlement" : "Record settlement"}</summary><form onSubmit={save} className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><label className="font-medium text-slate-700">Gross amount ($)<input required min="0.01" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="font-medium text-slate-700">Settlement date<input required type="date" value={settledOn} onChange={(event) => setSettledOn(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="font-medium text-slate-700 sm:col-span-2">Verified source<input required minLength={8} value={sourceNote} onChange={(event) => setSourceNote(event.target.value)} placeholder="Signed agreement or Clio document ID" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="flex items-start gap-2 sm:col-span-2"><input type="checkbox" checked={showAmount} onChange={(event) => setShowAmount(event.target.checked)} className="mt-1" /><span>Show gross settlement amount to providers</span></label><label className="flex items-start gap-2 sm:col-span-2"><input required type="checkbox" checked={verified} onChange={(event) => setVerified(event.target.checked)} className="mt-1" /><span>I verified the amount and date against the source above.</span></label><div className="flex gap-3 sm:col-span-2"><button disabled={busy} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save and prepare updates"}</button>{settlement && <button type="button" disabled={busy} onClick={remove} className="font-medium text-red-700">Remove settlement</button>}</div></form></details>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </section>;
}
