import type { EventCategory, Stage } from "@/lib/types";

export const STAGES: { id: Stage; label: string }[] = [
  { id: "intake", label: "Intake" },
  { id: "treatment", label: "Treatment" },
  { id: "demand", label: "Demand" },
  { id: "negotiation", label: "Negotiation" },
  { id: "litigation", label: "Litigation" },
  { id: "settlement", label: "Settlement" },
];

// One color per category, used everywhere (Hodent: consistency). Always paired with a text label.
export const CATEGORY_STYLE: Record<EventCategory, { label: string; dot: string; chip: string }> = {
  medical: { label: "Medical", dot: "bg-sky-500", chip: "bg-sky-50 text-sky-800 ring-sky-200" },
  legal: { label: "Legal", dot: "bg-violet-500", chip: "bg-violet-50 text-violet-800 ring-violet-200" },
  communication: { label: "Comms", dot: "bg-slate-500", chip: "bg-slate-100 text-slate-700 ring-slate-200" },
  money: { label: "Money", dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  insurance: { label: "Insurance", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-800 ring-amber-200" },
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000);
}

export function formatMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
