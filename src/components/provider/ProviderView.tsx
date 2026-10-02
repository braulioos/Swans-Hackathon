import type { ReactNode } from "react";
import { Bell, CircleCheck, CircleX, Lock, ShieldCheck } from "lucide-react";
import type { SharePacket } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import { StageTrack } from "@/components/hud/StageTrack";
import { CaseTimeline } from "@/components/timeline/CaseTimeline";

// What a medical provider sees. Renders ONLY the SharePacket, never the CaseDigest.
// Used by /share/[token] (real) and by the share builder preview (attorney's "view as provider").
export function ProviderView({ packet }: { packet: SharePacket }) {
  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {packet.firmName} · shared with {packet.providerName}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-900">Patient: {packet.patientName}</h1>
          {packet.caseAlive !== undefined && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                packet.caseAlive ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              {packet.caseAlive ? <CircleCheck className="size-4" /> : <CircleX className="size-4" />}
              {packet.caseAlive ? "Case is active" : "Case is closed"}
            </span>
          )}
        </div>
        {packet.statusLine && <p className="mt-1 text-sm text-slate-600">{packet.statusLine}</p>}
        {packet.stage && (
          <div className="mt-4">
            <StageTrack stage={packet.stage} />
          </div>
        )}
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {packet.coverage && (
            <Tile label="Coverage" value={packet.coverage} icon={<ShieldCheck className="size-3" />} />
          )}
          {packet.bills && (
            <Tile
              label="Your bills on file"
              value={packet.bills.billed !== undefined ? formatMoney(packet.bills.billed) : packet.bills.recordsReceived ? "On file" : "Pending"}
              hint={packet.bills.recordsReceived ? "Records received" : "Records still needed"}
            />
          )}
          {packet.attendance && (
            <Tile
              label="Attendance"
              value={`${packet.attendance.attended} visits · ${packet.attendance.missed} missed`}
              hint={packet.attendance.lastVisit ? `Last visit ${formatDate(packet.attendance.lastVisit)}` : undefined}
            />
          )}
        </div>
      </header>

      {packet.noteToProvider && (
        <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <span className="font-semibold">Note from the firm:</span> {packet.noteToProvider}
        </p>
      )}

      {packet.requests && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">What the firm needs from you</h2>
          {packet.requests.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Nothing right now. You&apos;re all caught up.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {packet.requests.map((q) => (
                <li key={q.id} className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
                  {q.title}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {packet.timeline && packet.incidentDate && (
        <CaseTimeline
          events={packet.timeline}
          start={packet.incidentDate}
          end={packet.updatedAt}
          stageHistory={packet.stageHistory}
          compact
        />
      )}

      {packet.otherProviders && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Other treating providers</h2>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {packet.otherProviders.map((p) => (
              <li key={p.name} className="flex justify-between py-2">
                <span>
                  {p.name} <span className="text-slate-500">· {p.specialty}</span>
                </span>
                <span className="text-xs text-slate-500">{p.recordsReceived ? "Records on file" : "Records pending"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="flex items-center gap-1.5 text-base font-semibold text-slate-900">
            <Bell className="size-4" /> Get notified when the case moves
          </h2>
          <p className="text-xs text-slate-500">We&apos;ll email you when the stage changes or the firm needs something.</p>
        </div>
        {/* TODO: store subscription in your DB; send on stage change (digest diff). */}
        <button type="button" disabled className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white opacity-50">
          Notify me
        </button>
      </section>

      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <Lock className="size-3" /> You&apos;re seeing only what {packet.firmName} chose to share. Updated {formatDate(packet.updatedAt)}.
      </p>
    </div>
  );
}

function Tile({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 px-3 py-2">
      <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </p>
      <p className="text-base font-semibold text-slate-900">{value}</p>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
