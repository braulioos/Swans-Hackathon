import type { ShareConfig } from "@/lib/types";

// DEV FIXTURE ONLY. Real share configs live in your own database (Clio is read-only).
export const demoShares: Record<string, ShareConfig> = {
  demo: {
    token: "demo",
    matterId: "sapini",
    providerId: "p2",
    sections: {
      status: true,
      coverage: true,
      timeline: true,
      requests: true,
      bills: true,
      attendance: true,
      otherProviders: true,
    },
    coverageDetail: "yesNo",
    hiddenEventIds: [],
    noteToProvider: "Thanks for your patience. We expect to resolve this case within 60 days.",
    createdAt: "2026-09-30T18:00:00Z",
    views: [{ at: "2026-10-01T16:12:00Z", who: "Front desk" }],
  },
};
