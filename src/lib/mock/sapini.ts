import type { CaseDigest, SourceKind, SourceRef } from "@/lib/types";

// DEV FIXTURE ONLY. Placeholder content so the wireframe renders before Clio is connected.
// Judges check for hardcoding: swap getCaseDigest() in lib/data.ts to the real pipeline before submitting.

const src = (id: string, kind: SourceKind, label: string, extra: Partial<SourceRef> = {}): SourceRef => ({
  id,
  kind,
  label,
  excerpt: "Placeholder excerpt. The real excerpt comes from the Clio note, email or document page.",
  ...extra,
});

export const sapiniMock: CaseDigest = {
  matterId: "sapini",
  displayNumber: "00001-Sapini",
  clientName: "Sapini (mock)",
  caseType: "Auto accident · rear-end collision",
  incidentDate: "2024-03-14",
  stage: "negotiation",
  stageHistory: [
    { stage: "intake", from: "2024-03-14" },
    { stage: "treatment", from: "2024-03-22" },
    { stage: "demand", from: "2026-02-10" },
    { stage: "negotiation", from: "2026-08-11" },
  ],
  firmName: "Demo Law Firm",
  digestedAt: "2026-10-02T09:00:00Z",
  lastViewedAt: "2026-09-20T17:00:00Z",
  headline: {
    text: "Demand sent; insurer countered low. Client still treating. Two items overdue.",
    sources: [src("n-41", "note", "Note: negotiation update", { date: "2026-09-28" })],
  },
  summary: [
    {
      text: "Client was rear-ended at a red light; liability looks clear (police report faults other driver).",
      sources: [src("d-3", "document", "Police report", { page: 2, date: "2024-03-15" })],
    },
    {
      text: "Treated with ER, orthopedics and physical therapy; MRI shows a lumbar disc herniation.",
      sources: [src("d-12", "document", "MRI report (scan)", { page: 47, date: "2024-06-02" })],
    },
    {
      text: "Demand letter for policy limits went out in August; insurer countered well below specials.",
      sources: [
        src("d-20", "document", "Demand letter", { date: "2026-08-11" }),
        src("e-88", "email", "Email from adjuster", { date: "2026-09-26" }),
      ],
    },
    {
      text: "Next decision: accept, counter again, or file suit before the statute deadline.",
      sources: [src("c-5", "calendar", "Calendar: SOL reminder", { date: "2027-03-14" })],
    },
  ],
  nextMoves: [
    {
      priority: "now",
      text: "Reply to the $32k counter-offer. It's below the $41.9k in medical bills, so counter with a documented number.",
      sources: [src("e-88", "email", "Email from adjuster", { date: "2026-09-26" }), src("tk-20", "task", "Task: respond to counter")],
    },
    {
      priority: "now",
      text: "Call the client before countering. Last contact was 20 days ago and they want to settle this year.",
      sources: [src("e-80", "email", "Email: client check-in", { date: "2026-09-12" })],
    },
    {
      priority: "soon",
      text: "Chase the Bayview ortho narrative report. It's the strongest proof of future care costs.",
      sources: [src("tk-18", "task", "Task: request narrative")],
    },
    {
      priority: "later",
      text: "If no deal by January, prepare to file suit. The statute of limitations hits Mar 14, 2027.",
      sources: [src("c-5", "calendar", "Calendar: SOL reminder", { date: "2027-03-14" })],
    },
  ],
  comparables: [
    {
      id: "cmp-1",
      title: "Placeholder: rear-end collision, lumbar herniation, injections, no surgery",
      outcome: "Settled (amount from real source)",
      whySimilar: "Same injury type and treatment path",
      sourceLabel: "TODO: verdict/settlement source",
    },
    {
      id: "cmp-2",
      title: "Placeholder: soft-tissue + disc injury, clear liability",
      outcome: "Jury verdict (amount from real source)",
      whySimilar: "Liability clear, similar medical specials",
      sourceLabel: "TODO: verdict/settlement source",
    },
  ],
  injuries: [
    { text: "Lumbar disc herniation (L4-L5)", sources: [src("d-12", "document", "MRI report (scan)", { page: 47 })] },
    { text: "Cervical strain", sources: [src("d-8", "document", "ER discharge summary", { page: 3 })] },
    { text: "Post-traumatic headaches", sources: [src("d-14", "document", "Neurology consult", { page: 5 })] },
  ],
  kpis: {
    caseValue: {
      label: "Case value (est.)",
      value: "$85k – $120k",
      hint: "Attorney estimate custom field",
      sources: [src("f-1", "field", "Custom field: Estimated case value")],
    },
    coverage: {
      label: "Coverage",
      value: "$100k policy",
      hint: "Defendant BI limits + client UM",
      sources: [src("f-2", "field", "Custom field: Policy limits")],
    },
    firmSpend: {
      label: "Firm spend",
      value: "$3,420",
      hint: "Records, filing, postage",
      sources: [src("x-all", "expense", "Case expenses (9 entries)")],
    },
    medicalSpecials: {
      label: "Medical bills",
      value: "$41,870",
      hint: "Across 4 providers",
      sources: [src("f-3", "field", "Custom field: Medical specials")],
    },
  },
  lastClientContact: {
    date: "2026-09-12",
    source: src("e-80", "email", "Email: client check-in", { date: "2026-09-12" }),
  },
  timeline: [
    { id: "t1", date: "2024-03-14", title: "Accident", summary: "Rear-end collision at a red light.", category: "legal", importance: "milestone", shareableWithProviders: true, sources: [src("d-3", "document", "Police report", { page: 1 })] },
    { id: "t2", date: "2024-03-14", title: "ER visit", summary: "Evaluated and released same day; neck and back pain.", category: "medical", importance: "key", shareableWithProviders: true, sources: [src("d-8", "document", "ER discharge summary", { page: 1 })] },
    { id: "t3", date: "2024-03-18", title: "Firm retained", summary: "Client signed the retainer; intake call completed.", category: "legal", importance: "milestone", shareableWithProviders: false, sources: [src("n-1", "note", "Note: intake")] },
    { id: "t4", date: "2024-03-22", title: "Claim opened with insurer", summary: "Letter of representation sent; claim number received.", category: "insurance", importance: "key", shareableWithProviders: true, sources: [src("e-2", "email", "Email: LOR to insurer")] },
    { id: "t5", date: "2024-04-02", title: "Started physical therapy", summary: "PT twice a week on lien.", category: "medical", importance: "key", shareableWithProviders: true, sources: [src("n-6", "note", "Note: PT referral")] },
    { id: "t6", date: "2024-05-10", title: "Records request sent", summary: "Requested ER and PT records.", category: "communication", importance: "routine", shareableWithProviders: false, sources: [src("tk-3", "task", "Task: request records")] },
    { id: "t7", date: "2024-06-02", title: "MRI: disc herniation", summary: "MRI confirms L4-L5 herniation.", category: "medical", importance: "milestone", impact: "Objective proof of a serious injury. Case value goes up.", shareableWithProviders: true, sources: [src("d-12", "document", "MRI report (scan)", { page: 47 })] },
    { id: "t8", date: "2024-07-15", title: "Ortho consult", summary: "Orthopedist recommends injections before surgery.", category: "medical", importance: "key", shareableWithProviders: true, sources: [src("d-13", "document", "Ortho consult", { page: 2 })] },
    { id: "t9", date: "2024-09-01", title: "Expense: records fees", summary: "$185 paid for medical records.", category: "money", importance: "routine", shareableWithProviders: false, sources: [src("x-2", "expense", "Expense entry")] },
    { id: "t10", date: "2025-01-20", title: "Epidural injection", summary: "First lumbar injection; partial relief.", category: "medical", importance: "key", shareableWithProviders: true, sources: [src("d-15", "document", "Procedure note", { page: 1 })] },
    { id: "t11", date: "2025-06-30", title: "Client missed 2 PT visits", summary: "Attendance gap flagged by PT office.", category: "medical", importance: "routine", shareableWithProviders: true, sources: [src("e-40", "email", "Email from PT office")] },
    { id: "t12", date: "2025-11-04", title: "Treatment complete (MMI)", summary: "Doctor declares maximum medical improvement.", category: "medical", importance: "milestone", impact: "Treatment costs are now known, so the demand can be prepared.", shareableWithProviders: true, sources: [src("d-18", "document", "MMI letter", { page: 1 })] },
    { id: "t13", date: "2026-02-10", title: "All records & bills collected", summary: "Final bills received from all four providers.", category: "money", importance: "key", shareableWithProviders: true, sources: [src("n-30", "note", "Note: records complete")] },
    { id: "t14", date: "2026-08-11", title: "Demand sent", summary: "Policy-limits demand sent to insurer.", category: "insurance", importance: "milestone", impact: "The clock is on the insurer to respond.", shareableWithProviders: true, sources: [src("d-20", "document", "Demand letter")] },
    { id: "t15", date: "2026-09-12", title: "Client check-in", summary: "Client reports ongoing back pain; wants to settle this year.", category: "communication", importance: "routine", shareableWithProviders: false, sources: [src("e-80", "email", "Email: client check-in")] },
    { id: "t16", date: "2026-09-26", title: "Insurer counter-offer", summary: "Adjuster countered at $32k.", category: "insurance", importance: "milestone", impact: "Offer is below medical bills ($41.9k). Expect a counter or a lawsuit.", shareableWithProviders: false, sources: [src("e-88", "email", "Email from adjuster")] },
    { id: "t17", date: "2026-09-28", title: "Strategy note", summary: "Attorney leaning toward counter at $95k.", category: "legal", importance: "key", impact: "Firm plans to push back rather than accept.", shareableWithProviders: false, sources: [src("n-41", "note", "Note: negotiation update")] },
    { id: "t18", date: "2026-09-30", title: "Lien reduction request", summary: "Asked PT office for a lien reduction.", category: "money", importance: "routine", impact: "A smaller lien means the client takes home more.", shareableWithProviders: true, sources: [src("e-91", "email", "Email to PT office")] },
  ],
  quests: [
    { id: "q1", title: "Respond to insurer counter-offer", status: "overdue", due: "2026-09-30", owner: "Attorney", sources: [src("tk-20", "task", "Task: respond to counter")] },
    { id: "q2", title: "Call client about the offer", status: "overdue", due: "2026-10-01", owner: "Case manager", sources: [src("tk-21", "task", "Task: client call")] },
    { id: "q3", title: "Updated PT bill with lien reduction", status: "waiting", owner: "Case manager", waitingOn: "Harbor Physical Therapy", providerId: "p2", sources: [src("e-91", "email", "Email to PT office")] },
    { id: "q4", title: "Ortho narrative report", status: "waiting", owner: "Paralegal", waitingOn: "Bayview Orthopedics", providerId: "p3", sources: [src("tk-18", "task", "Task: request narrative")] },
    { id: "q5", title: "Settlement conference", status: "upcoming", due: "2026-10-15", owner: "Attorney", sources: [src("c-9", "calendar", "Calendar: settlement conference")] },
    { id: "q6", title: "Statute of limitations", status: "upcoming", due: "2027-03-14", owner: "Attorney", sources: [src("c-5", "calendar", "Calendar: SOL reminder")] },
  ],
  providers: [
    { id: "p1", name: "City ER (mock)", specialty: "Emergency", billed: 6200, recordsReceived: true },
    { id: "p2", name: "Harbor Physical Therapy", specialty: "Physical therapy", billed: 12450, recordsReceived: true, lastVisit: "2025-11-01", visitsAttended: 46, visitsMissed: 4 },
    { id: "p3", name: "Bayview Orthopedics", specialty: "Orthopedics", billed: 18900, recordsReceived: false, lastVisit: "2025-10-20", visitsAttended: 7, visitsMissed: 0 },
    { id: "p4", name: "Coastal Imaging", specialty: "Radiology", billed: 4320, recordsReceived: true },
  ],
};
