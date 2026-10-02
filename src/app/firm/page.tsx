import Link from "next/link";
import { Suspense } from "react";
import { listMatters } from "@/lib/data";
import { STAGES } from "@/lib/format";
import { isClioConnected } from "@/lib/clio-auth";
import { lastSyncReport } from "@/lib/sync";
import { ClioStatus } from "@/components/clio/ClioStatus";
import { Brand } from "@/components/Brand";

async function ClioConnection() {
  const [connected, report] = await Promise.all([isClioConnected(), lastSyncReport()]);
  return <ClioStatus connected={connected} report={report} />;
}

async function MatterCards() {
  let matters: Awaited<ReturnType<typeof listMatters>>;
  try { matters = await listMatters(); }
  catch {
    return <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Cases could not load right now. <a href="/firm" className="font-semibold underline">Retry</a></p>;
  }
  if (matters.length === 0) return <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">No cases yet. Connect Clio to sync a case.</p>;
  return <ul className="space-y-3">
    {matters.map((m) => (
      <li key={m.matterId}>
        <Link
          href={`/firm/matter/${m.matterId}`}
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:shadow-md"
        >
          <span>
            <span className="block font-semibold text-slate-900">{m.clientName}</span>
            <span className="text-sm text-slate-500">{m.displayNumber} · {m.caseType}</span>
          </span>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            {STAGES.find((s) => s.id === m.stage)?.label}
          </span>
        </Link>
      </li>
    ))}
  </ul>;
}

export default function MatterList() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <div><Brand className="mb-5 text-base" /></div>
      <Link href="/" className="block text-sm text-slate-500 hover:underline">
        ← Switch role
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Your matters</h1>
      <div className="mt-6">
        <Suspense fallback={<div className="h-24 animate-pulse rounded-2xl bg-blue-50" aria-label="Loading Clio connection" />}>
          <ClioConnection />
        </Suspense>
      </div>
      <div className="mt-6">
        <Suspense fallback={<div className="space-y-3" aria-label="Loading cases"><div className="h-20 animate-pulse rounded-2xl bg-slate-200" /><div className="h-20 animate-pulse rounded-2xl bg-slate-200" /></div>}>
          <MatterCards />
        </Suspense>
      </div>
    </main>
  );
}
