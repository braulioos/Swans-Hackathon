import type { CaseDigest } from "@/lib/types";
import { daysBetween } from "@/lib/format";

export type CaseAction = { id: string; label: string; sourceIds: string[]; priority: "now" | "soon" | "later" };

// Shared by the dashboard and API so a client can only prepare actions in this case.
export function listCaseActions(digest: CaseDigest, today = new Date().toISOString().slice(0, 10)): CaseAction[] {
  const tasks = digest.quests
    .filter((quest) => quest.status === "overdue" || quest.status === "upcoming" || quest.status === "waiting")
    .map((quest): CaseAction => ({ id: `quest-${quest.id}`, label: quest.title, sourceIds: quest.sources.map((source) => source.id), priority: quest.status === "overdue" ? "now" : "soon" }));
  const contact: CaseAction[] = daysBetween(digest.lastClientContact.date, today) >= 14
    ? [{ id: "client-contact", label: "Contact the client with a case update", sourceIds: [digest.lastClientContact.source.id], priority: "soon" }]
    : [];
  const suggested = digest.nextMoves.map((move, index): CaseAction => ({ id: `suggested-${index}`, label: move.text, sourceIds: move.sources.map((source) => source.id), priority: move.priority }));
  return [...tasks, ...contact, ...suggested];
}
