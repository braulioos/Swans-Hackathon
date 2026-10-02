import Link from "next/link";
import { AlertTriangle, ArrowLeft, FolderOpen, MessageCircle, Share2 } from "lucide-react";
import type { CaseDigest } from "@/lib/types";
import { daysBetween, formatDate } from "@/lib/format";
import { StageTrack } from "@/components/hud/StageTrack";
import { KpiTile } from "@/components/hud/KpiTile";

// Layer 0, the HUD: answers "who, where, how much, what's on fire" without a click.
// Only the identity bar stays pinned while scrolling; stage + KPIs scroll away to keep the view uncluttered.
export function CaseHud({ digest }: { digest: CaseDigest }) {
  const now = digest.digestedAt;
  const contactDays = daysBetween(digest.lastClientContact.date, now);
  const overdue = digest.quests.filter((q) => q.status === "overdue").length;
  const ageMonths = Math.floor(daysBetween(digest.incidentDate, now) / 30.4);
  const initials = (digest.clientName.match(/\b[A-Za-z]/g) ?? []).join("").slice(0, 2).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <Link href="/firm" className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="All matters">
            <ArrowLeft className="size-4" />
          </Link>
          {/* TODO: client photo from Clio contact/document. "I want to see the client's picture as soon as I open their matter." */}
          <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
            {digest.clientPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={digest.clientPhotoUrl} alt="" className="size-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold text-slate-900">{digest.clientName}</h1>
            <p className="truncate text-xs text-slate-500">
              {digest.displayNumber} · {digest.caseType} · incident {formatDate(digest.incidentDate)} · {ageMonths} months old
            </p>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <a href="#case-file" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
              <FolderOpen className="size-4" /> Full case file
            </a>
            <Link
              href={`/firm/matter/${digest.matterId}/share`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
            >
              <Share2 className="size-4" /> Share with provider
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 pt-4">
        <StageTrack stage={digest.stage} />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          <KpiTile {...digest.kpis.caseValue} tone="good" />
          <KpiTile {...digest.kpis.coverage} />
          <KpiTile {...digest.kpis.medicalSpecials} />
          <KpiTile {...digest.kpis.firmSpend} />
          <KpiTile
            label="Last client contact"
            value={`${contactDays} days ago`}
            hint={formatDate(digest.lastClientContact.date)}
            sources={[digest.lastClientContact.source]}
            tone={contactDays > 30 ? "bad" : contactDays > 14 ? "warn" : "good"}
            icon={<MessageCircle className="size-3" aria-hidden />}
          />
          <KpiTile
            label="Overdue"
            value={`${overdue} item${overdue === 1 ? "" : "s"}`}
            hint="See quest log"
            tone={overdue > 0 ? "bad" : "good"}
            icon={<AlertTriangle className="size-3" aria-hidden />}
          />
        </div>
      </div>
    </>
  );
}
