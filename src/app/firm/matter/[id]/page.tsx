import { notFound } from "next/navigation";
import { getCaseDigest } from "@/lib/data";
import { SourceProvider } from "@/components/source/SourceProvider";
import { CaseHud } from "@/components/hud/CaseHud";
import { SinceLastVisit } from "@/components/briefing/SinceLastVisit";
import { BriefCard } from "@/components/briefing/BriefCard";
import { QuestLog } from "@/components/briefing/QuestLog";
import { InjuriesCard, ProvidersCard } from "@/components/briefing/SideCards";
import { CaseTimeline } from "@/components/timeline/CaseTimeline";
import { FullCaseFile } from "@/components/casefile/FullCaseFile";
import { NextMoves } from "@/components/briefing/NextMoves";
import { SimilarCases } from "@/components/briefing/SimilarCases";
import { RecordView } from "@/components/briefing/RecordView";

// Firm dashboard. Read top to bottom = increasing detail:
//   HUD (always) -> since last visit -> 90-second brief -> next moves -> timeline -> similar cases
//   side: quest log, injuries, providers. Bottom: full case file
export default async function MatterDashboard(props: PageProps<"/firm/matter/[id]">) {
  const { id } = await props.params;
  const { since } = await props.searchParams;
  const digest = await getCaseDigest(id, { sinceDays: since ? Number(since) || undefined : undefined });
  if (!digest) notFound();

  return (
    <SourceProvider>
      <RecordView matterId={digest.matterId} />
      <CaseHud digest={digest} />
      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SinceLastVisit digest={digest} />
          <BriefCard digest={digest} />
          <NextMoves moves={digest.nextMoves} />
          <CaseTimeline
            events={digest.timeline}
            start={digest.incidentDate}
            end={digest.digestedAt}
            stageHistory={digest.stageHistory}
            lastViewedAt={digest.lastViewedAt}
          />
          {digest.comparables.length > 0 && <SimilarCases cases={digest.comparables} />}
        </div>
        <aside className="space-y-6">
          <QuestLog quests={digest.quests} />
          <InjuriesCard digest={digest} />
          <ProvidersCard digest={digest} />
        </aside>
      </main>
      <FullCaseFile digest={digest} />
    </SourceProvider>
  );
}
