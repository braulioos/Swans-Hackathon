import { CircleCheck, PlugZap, TriangleAlert } from "lucide-react";
import type { SyncReport } from "@/lib/sync";
import { SyncButton } from "@/components/clio/SyncButton";

// Signs & feedback: always show whether Clio is connected and what the last sync brought in.
export function ClioStatus({ connected, report }: { connected: boolean; report: SyncReport | null }) {
  if (!connected) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-blue-950">
            <PlugZap className="size-4" /> Connect your Clio account
          </h2>
          <p className="text-sm text-blue-900">Read-only access. Briefly never changes anything in Clio.</p>
        </div>
        <a href="/auth/clio/login" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Connect Clio
        </a>
      </section>
    );
  }

  const errorKinds = report ? Object.keys(report.errors) : [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <CircleCheck className="size-4 text-emerald-600" /> Clio connected
          </h2>
          <p className="text-sm text-slate-600">
            {report?.matter
              ? `Last sync: ${report.matter.display_number ?? report.matter.id} · ${new Date(report.finishedAt).toLocaleString()} · ${report.changed} new or changed`
              : "Not synced yet."}
          </p>
        </div>
        <SyncButton />
      </div>

      {report && Object.keys(report.counts).length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {Object.entries(report.counts).map(([kind, n]) => (
            <li key={kind} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
              {n} {kind}
              {n === 1 ? "" : "s"}
            </li>
          ))}
        </ul>
      )}

      {errorKinds.length > 0 && (
        <details className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          <summary className="flex cursor-pointer items-center gap-1.5 font-medium">
            <TriangleAlert className="size-3.5" /> {errorKinds.length} part{errorKinds.length === 1 ? "" : "s"} needed a fallback: {errorKinds.join(", ")}
          </summary>
          <ul className="mt-2 space-y-1 break-all">
            {errorKinds.map((k) => (
              <li key={k}>
                <span className="font-semibold">{k}:</span> {report?.errors[k]}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
