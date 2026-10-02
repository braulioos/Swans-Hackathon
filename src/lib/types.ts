// The shape of a digested case. Every UI component reads from these types,
// so the mock fixture and the real Clio + AI pipeline must both produce them.

export type SourceKind =
  | "note"
  | "email"
  | "call"
  | "document"
  | "task"
  | "calendar"
  | "expense"
  | "field"
  | "contact";

// Where a fact came from. Attorneys: "If a date is on screen, I need to see where it came from."
export interface SourceRef {
  id: string;
  kind: SourceKind;
  label: string;
  date?: string;
  page?: number;
  excerpt?: string;
  clioUrl?: string;
}

// Any AI-generated sentence. No sources = it does not get rendered.
export interface Fact {
  text: string;
  sources: SourceRef[];
}

export type Stage =
  | "intake"
  | "treatment"
  | "demand"
  | "negotiation"
  | "litigation"
  | "settlement"
  | "closed";

export type EventCategory = "medical" | "legal" | "communication" | "money" | "insurance";

// milestone + key show in "Story" zoom; routine only appears in "Everything" zoom.
export type Importance = "milestone" | "key" | "routine";

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  summary: string;
  category: EventCategory;
  importance: Importance;
  // "When new information comes in, what does that mean for the case?"
  impact?: string;
  shareableWithProviders: boolean;
  sources: SourceRef[];
}

export type MovePriority = "now" | "soon" | "later";

// AI-suggested next step. The attorney decides; the suggestion must cite why.
export interface NextMove extends Fact {
  priority: MovePriority;
}

// Precedent / comparable outcome. Must link to a real, checkable source (never AI-invented).
export interface Comparable {
  id: string;
  title: string;
  outcome: string;
  whySimilar: string;
  sourceLabel: string;
  sourceUrl?: string;
}

export type QuestStatus = "overdue" | "upcoming" | "waiting";

export interface Quest {
  id: string;
  title: string;
  status: QuestStatus;
  due?: string;
  owner: string;
  waitingOn?: string;
  providerId?: string;
  sources: SourceRef[];
}

export interface Kpi {
  label: string;
  value: string;
  hint?: string;
  sources: SourceRef[];
}

export interface Provider {
  id: string;
  name: string;
  specialty: string;
  billed?: number;
  recordsReceived: boolean;
  lastVisit?: string;
  visitsAttended?: number;
  visitsMissed?: number;
}

export interface CaseDigest {
  matterId: string;
  displayNumber: string;
  clientName: string;
  clientPhotoUrl?: string;
  caseType: string;
  incidentDate: string;
  stage: Stage;
  stageHistory: { stage: Stage; from: string }[];
  firmName: string;
  digestedAt: string;
  lastViewedAt: string;
  firstVisit?: boolean;
  headline: Fact;
  summary: Fact[];
  nextMoves: NextMove[];
  comparables: Comparable[];
  injuries: Fact[];
  kpis: {
    caseValue: Kpi;
    coverage: Kpi;
    firmSpend: Kpi;
    medicalSpecials: Kpi;
  };
  lastClientContact: { date: string; source: SourceRef };
  timeline: TimelineEvent[];
  quests: Quest[];
  providers: Provider[];
  // Logged per digest run so the submission can state a real cost per case.
  meta?: { model: string; inputTokens: number; outputTokens: number; costUsd: number };
}

export type ShareSection =
  | "status"
  | "coverage"
  | "timeline"
  | "requests"
  | "bills"
  | "attendance"
  | "otherProviders";

export interface ShareConfig {
  token: string;
  matterId: string;
  providerId: string;
  sections: Record<ShareSection, boolean>;
  coverageDetail: "yesNo" | "amount";
  hiddenEventIds: string[];
  noteToProvider?: string;
  createdAt: string;
  views: { at: string; who?: string }[];
}

// The only thing a provider's browser ever receives. Built server-side from the digest + config.
export interface SharePacket {
  firmName: string;
  patientName: string;
  providerName: string;
  stage?: Stage;
  stageHistory?: { stage: Stage; from: string }[];
  incidentDate?: string;
  caseAlive?: boolean;
  statusLine?: string;
  coverage?: string;
  timeline?: TimelineEvent[];
  requests?: Quest[];
  bills?: { billed?: number; recordsReceived: boolean };
  attendance?: { attended: number; missed: number; lastVisit?: string };
  otherProviders?: { name: string; specialty: string; recordsReceived: boolean }[];
  noteToProvider?: string;
  updatedAt: string;
}
