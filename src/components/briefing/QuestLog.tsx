import { AlertTriangle, CalendarClock, Hourglass } from "lucide-react";
import type { Quest, QuestStatus } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { Sources } from "@/components/source/SourceChip";

// Quest log: "What's overdue, what's coming, and what's waiting on someone else?"
const GROUPS: { status: QuestStatus; title: string; icon: typeof Hourglass; tone: string }[] = [
  { status: "overdue", title: "Overdue", icon: AlertTriangle, tone: "text-red-700" },
  { status: "upcoming", title: "Coming up", icon: CalendarClock, tone: "text-blue-700" },
  { status: "waiting", title: "Waiting on others", icon: Hourglass, tone: "text-amber-700" },
];

const MAX_PER_GROUP = 3;

export function QuestLog({ quests }: { quests: Quest[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Quest log</h2>
      <div className="mt-3 space-y-4">
        {GROUPS.map(({ status, title, icon: Icon, tone }) => {
          const items = quests.filter((q) => q.status === status);
          if (items.length === 0) return null;
          return (
            <div key={status}>
              <h3 className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${tone}`}>
                <Icon className="size-3.5" aria-hidden />
                {title} · {items.length}
              </h3>
              <ul className="mt-1.5 space-y-1.5">
                {items.slice(0, MAX_PER_GROUP).map((q) => (
                  <li key={q.id} className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-sm font-medium text-slate-900">{q.title}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                      {q.due && <span>Due {formatDate(q.due)}</span>}
                      <span>{q.waitingOn ? `Waiting on ${q.waitingOn}` : q.owner}</span>
                      <Sources sources={q.sources} />
                    </p>
                  </li>
                ))}
              </ul>
              {items.length > MAX_PER_GROUP && (
                <a href="#case-file" className="mt-1 inline-block text-xs font-medium text-blue-700 hover:underline">
                  See all {items.length} →
                </a>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
