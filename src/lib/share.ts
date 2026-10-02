import type { CaseDigest, ShareConfig, SharePacket, Stage } from "@/lib/types";

const ALIVE_STAGES: Stage[] = ["intake", "treatment", "demand", "negotiation", "litigation"];

const STATUS_LINES: Record<Stage, string> = {
  intake: "Case recently opened",
  treatment: "Client is treating; case is building",
  demand: "Demand is being prepared",
  negotiation: "Negotiating with the insurer",
  litigation: "Case is in litigation",
  settlement: "Case has settled; payments being arranged",
  closed: "Case is closed",
};

// The privacy boundary. Whitelist only: anything not copied here never reaches the provider.
// The share page calls this on the server and passes only the packet to the browser.
// The share builder also calls it client-side so the attorney's preview is exactly what the provider sees.
export function buildSharePacket(digest: CaseDigest, config: ShareConfig): SharePacket {
  const provider = digest.providers.find((p) => p.id === config.providerId);
  const s = config.sections;

  return {
    firmName: digest.firmName,
    patientName: digest.clientName,
    providerName: provider?.name ?? "Provider",
    updatedAt: digest.digestedAt,
    noteToProvider: config.noteToProvider,
    ...(s.status && {
      stage: digest.stage,
      stageHistory: digest.stageHistory,
      incidentDate: digest.incidentDate,
      caseAlive: ALIVE_STAGES.includes(digest.stage),
      statusLine: STATUS_LINES[digest.stage],
    }),
    ...(s.coverage && {
      coverage: config.coverageDetail === "amount" ? digest.kpis.coverage.value : "Coverage confirmed",
    }),
    ...(s.timeline && {
      timeline: digest.timeline
        .filter((e) => e.shareableWithProviders && !config.hiddenEventIds.includes(e.id))
        .map((e) => ({ ...e, impact: undefined, sources: [] })),
    }),
    ...(s.requests && {
      requests: digest.quests
        .filter((q) => q.providerId === config.providerId)
        .map((q) => ({ ...q, sources: [] })),
    }),
    ...(s.bills && provider && {
      bills: { billed: provider.billed, recordsReceived: provider.recordsReceived },
    }),
    ...(s.attendance && provider?.visitsAttended !== undefined && {
      attendance: {
        attended: provider.visitsAttended,
        missed: provider.visitsMissed ?? 0,
        lastVisit: provider.lastVisit,
      },
    }),
    ...(s.otherProviders && {
      otherProviders: digest.providers
        .filter((p) => p.id !== config.providerId)
        .map((p) => ({ name: p.name, specialty: p.specialty, recordsReceived: p.recordsReceived })),
    }),
  };
}
