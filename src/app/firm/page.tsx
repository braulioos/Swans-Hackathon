import Link from "next/link";
import { connection } from "next/server";
import { listMatters } from "@/lib/data";
import { STAGES } from "@/lib/format";
import { isClioConnected } from "@/lib/clio-auth";
import { lastSyncReport } from "@/lib/sync";
import { ClioStatus } from "@/components/clio/ClioStatus";

export default async function MatterList() {
  await connection();
  const connected = isClioConnected();
  const report = lastSyncReport();
  const matters = await listMatters();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <Link href="/" className="text-sm text-slate-500 hover:underline">
        ← Switch role
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Your matters</h1>
      <div className="mt-6">
        <ClioStatus connected={connected} report={report} />
      </div>
      <ul className="mt-6 space-y-3">
        {matters.map((m) => (
          <li key={m.matterId}>
            <Link
              href={`/firm/matter/${m.matterId}`}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:shadow-md"
            >
              <span>
                <span className="block font-semibold text-slate-900">{m.clientName}</span>
                <span className="text-sm text-slate-500">
                  {m.displayNumber} · {m.caseType}
                </span>
              </span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {STAGES.find((s) => s.id === m.stage)?.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
