import Link from "next/link";
import { ArrowLeft, FolderOpen, Share2 } from "lucide-react";
import type { CaseDigest } from "@/lib/types";
import { daysBetween, formatDate } from "@/lib/format";
import { StageTrack } from "@/components/hud/StageTrack";

// Pinned identity bar: who the client is, where the case is in its journey, and the two main actions.
// Money and urgent items live in the Money and Needs attention widgets right below.
export function CaseHud({ digest }: { digest: CaseDigest }) {
  const ageMonths = Math.floor(daysBetween(digest.incidentDate, new Date().toISOString()) / 30.4);
  const initials = (digest.clientName.match(/\b[A-Za-z]/g) ?? []).join("").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5">
        <Link href="/firm" className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Back to all matters" title="Back to all matters">
          <ArrowLeft className="size-4" />
        </Link>
        {/* "I want to see the client's picture as soon as I open their matter." Initials until a photo is linked. */}
        <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
          {digest.clientPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={digest.clientPhotoUrl} alt="" className="size-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-[200px] flex-1">
          <h1 className="truncate text-xl font-semibold text-slate-900">{digest.clientName}</h1>
          <p className="truncate text-xs text-slate-500">
            {digest.caseType} · incident {formatDate(digest.incidentDate)} ({ageMonths} months ago) · {digest.displayNumber}
          </p>
        </div>
        <div className="hidden w-[380px] md:block" title="Where the case is in its journey">
          <StageTrack stage={digest.stage} />
        </div>
        <nav className="flex items-stretch gap-2" aria-label="Case actions">
          <a
            href="#case-file"
            className="flex flex-col justify-center rounded-lg bg-white px-3 py-1 text-left ring-1 ring-slate-300 transition hover:bg-slate-50 hover:ring-slate-400"
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <FolderOpen className="size-4" /> Full case file
            </span>
            <span className="text-[11px] text-slate-500">Every note, email &amp; document</span>
          </a>
          <Link
            href={`/firm/matter/${digest.matterId}/share`}
            className="flex flex-col justify-center rounded-lg bg-blue-600 px-3 py-1 text-left text-white transition hover:bg-blue-700"
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <Share2 className="size-4" /> Share with a provider
            </span>
            <span className="text-[11px] text-blue-100">Pick what a treating doctor sees</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
