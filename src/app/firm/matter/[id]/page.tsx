import { ArrowDown } from "lucide-react";
import { notFound } from "next/navigation";
import { getCaseDigest } from "@/lib/data";
import { SourceProvider } from "@/components/source/SourceProvider";
import { CaseHud } from "@/components/hud/CaseHud";
import { NeedsAttention } from "@/components/briefing/NeedsAttention";
import { KeyFacts, MoneyWidget } from "@/components/briefing/AtAGlance";
import { BriefCard } from "@/components/briefing/BriefCard";
import { InjuriesCard, ProvidersCard } from "@/components/briefing/SideCards";
import { SimilarCases } from "@/components/briefing/SimilarCases";
import { RecordView } from "@/components/briefing/RecordView";
import { CaseTimeline } from "@/components/timeline/CaseTimeline";
import { FullCaseFile } from "@/components/casefile/FullCaseFile";
import { DocumentCopilot } from "@/components/documents/DocumentCopilot";
import { listCaseDocuments, listFactReviews, listWorkflows } from "@/lib/document-intelligence";
import { SettlementPanel } from "@/components/settlement/SettlementPanel";
import { getSettlement } from "@/lib/settlement";
import { listCaseActions } from "@/lib/case-actions";
import { sapiniMock } from "@/lib/mock/sapini";

// Firm dashboard. The first screen is everything you need in 90 seconds:
//   header (who + stage) -> needs attention -> [key facts | money | brief] -> timeline
// On desktop the landing area is sized to the viewport, so the timeline always sits at the bottom of the first screen.
// Below it: injuries, providers, and the full case file.
export default async function MatterDashboard(props: PageProps<"/firm/matter/[id]">) {
  const { id } = await props.params;
  const { since } = await props.searchParams;
  const digest = id === "sapini" ? sapiniMock : await getCaseDigest(id, { sinceDays: since ? Number(since) || undefined : undefined });
  if (!digest) notFound();
  const [documents, workflows, facts, settlement] = id === "sapini"
    ? [[], [], [], null] as [Awaited<ReturnType<typeof listCaseDocuments>>, Awaited<ReturnType<typeof listWorkflows>>, Awaited<ReturnType<typeof listFactReviews>>, Awaited<ReturnType<typeof getSettlement>>]
    : await Promise.all([listCaseDocuments(digest), listWorkflows(digest.matterId), listFactReviews(digest.matterId), getSettlement(digest.matterId)]);

  return (
    <SourceProvider>
      <RecordView matterId={digest.matterId} />
      <CaseHud digest={digest} />

      <main className="mx-auto w-full max-w-[1400px] px-4">
        <div className="flex flex-col gap-3 py-3 lg:h-[calc(100dvh-68px)] lg:min-h-[700px]">
          <NeedsAttention digest={digest} />
          <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)]">
            <div className="lg:col-span-3 lg:min-h-0 lg:[&>section]:h-full">
              <KeyFacts digest={digest} />
            </div>
            <div className="lg:col-span-3 lg:min-h-0 lg:[&>section]:h-full">
              <MoneyWidget digest={digest} />
            </div>
            <div className="lg:col-span-6 lg:min-h-0 lg:[&>section]:h-full">
              <BriefCard digest={digest} />
            </div>
          </div>
          <CaseTimeline
            events={digest.timeline}
            start={digest.incidentDate}
            end={new Date().toISOString()}
            stageHistory={digest.stageHistory}
            lastViewedAt={digest.lastViewedAt}
          />
        </div>

        <a href="#more" className="mx-auto mb-3 flex w-fit items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-700">
          <ArrowDown className="size-3.5" /> More below: injuries, providers and the full case file
        </a>

        <div id="more" className="grid scroll-mt-20 items-stretch gap-6 pb-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <InjuriesCard digest={digest} />
          <ProvidersCard digest={digest} />
        </div>
        {digest.comparables.length > 0 && <div className="pb-2"><SimilarCases cases={digest.comparables} /></div>}
      </main>
      <DocumentCopilot matterId={digest.matterId} providers={digest.providers} suggestedActions={listCaseActions(digest)} initialDocuments={documents} initialWorkflows={workflows} initialFacts={facts} />
      <div className="mx-auto mt-6 w-full max-w-[1400px] px-4"><SettlementPanel matterId={digest.matterId} initialSettlement={settlement} /></div>
      <FullCaseFile digest={digest} />
    </SourceProvider>
  );
}
