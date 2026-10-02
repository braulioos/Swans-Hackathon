import type { CaseDigest, SourceRef } from "@/lib/types";
import { daysBetween, formatDate } from "@/lib/format";

// "Needs attention" strip: the few things on fire, derived from Clio data in code (no AI).
// Each alert = what kind of problem, a big scannable value, one line of context, its source, and where to act.

export type AlertTone = "urgent" | "soon";

export interface Alert {
  id: string;
  tone: AlertTone;
  kind: string;
  big: string;
  label: string;
  cta: string;
  href: string;
  source?: SourceRef;
}

const UPCOMING_WINDOW_DAYS = 14;
const CONTACT_WARN_DAYS = 14;
const CONTACT_BAD_DAYS = 30;

export function buildAlerts(d: CaseDigest, today = new Date().toISOString().slice(0, 10)): Alert[] {
  const alerts: Alert[] = [];

  const overdue = d.quests.filter((q) => q.status === "overdue");
  if (overdue.length > 0) {
    const first = overdue[0];
    const late = first.due ? daysBetween(first.due, today) : 0;
    alerts.push({
      id: "overdue",
      tone: "urgent",
      kind: overdue.length > 1 ? "Overdue tasks" : "Overdue task",
      big: overdue.length > 1 ? `${overdue.length} overdue` : `${late} day${late === 1 ? "" : "s"} late`,
      label: first.title,
      cta: "Prepare workflow",
      href: "#one-click-workflows",
      source: first.sources[0],
    });
  }

  const next = d.quests.find(
    (q) => q.status === "upcoming" && q.owner !== "Calendar" && q.due && daysBetween(today, q.due) <= UPCOMING_WINDOW_DAYS,
  );
  if (next?.due) {
    const inDays = daysBetween(today, next.due);
    alerts.push({
      id: "next",
      tone: "soon",
      kind: "Next deadline",
      big: inDays <= 0 ? "Today" : `${inDays} day${inDays === 1 ? "" : "s"}`,
      label: `${next.title} (due ${formatDate(next.due)})`,
      cta: "Prepare workflow",
      href: "#one-click-workflows",
      source: next.sources[0],
    });
  }

  const waiting = d.quests.filter((q) => q.status === "waiting");
  if (waiting.length > 0) {
    const names = Array.from(new Set(waiting.map((q) => q.waitingOn ?? "a provider")));
    alerts.push({
      id: "waiting",
      tone: "soon",
      kind: "Owed to the firm",
      big: `${waiting.length} waiting`,
      label: `Records or bills from ${names[0]}${names.length > 1 ? ` + ${names.length - 1} more` : ""}`,
      cta: "Prepare follow-up",
      href: "#one-click-workflows",
      source: waiting[0].sources[0],
    });
  }

  const contactDays = daysBetween(d.lastClientContact.date, today);
  if (contactDays >= CONTACT_WARN_DAYS) {
    alerts.push({
      id: "contact",
      tone: contactDays >= CONTACT_BAD_DAYS ? "urgent" : "soon",
      kind: "Client contact",
      big: `${contactDays} days`,
      label: "Since anyone last talked to the client",
      cta: "Prepare outreach",
      href: "#one-click-workflows",
      source: d.lastClientContact.source,
    });
  }

  const missing = d.providers.filter((p) => !p.recordsReceived);
  if (missing.length > 0) {
    alerts.push({
      id: "records",
      tone: "soon",
      kind: "Missing records",
      big: `${missing.length} provider${missing.length === 1 ? "" : "s"}`,
      label: `No records yet from ${missing[0].name}${missing.length > 1 ? ` + ${missing.length - 1} more` : ""}`,
      cta: "Request records",
      href: "#record-requests",
    });
  }

  return alerts.slice(0, 4);
}
