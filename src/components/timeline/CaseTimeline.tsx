"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { EventCategory, Stage, TimelineEvent } from "@/lib/types";
import { CATEGORY_STYLE, STAGES, formatDate } from "@/lib/format";
import { Sources } from "@/components/source/SourceChip";

// The case as a map you can zoom. Three disclosure layers:
//   1. dots on a track (shape of the story at a glance)
//   2. hover/focus a dot -> one-line peek card
//   3. click a dot -> pinned detail with sources (which open the raw original)

type Zoom = "story" | "everything";

interface Props {
  events: TimelineEvent[];
  start: string;
  end: string;
  stageHistory?: { stage: Stage; from: string }[];
  lastViewedAt?: string;
  compact?: boolean;
}

const LANES = 3;
const LANE_HEIGHT = 24;
const AXIS_Y = 56;

const DOT_SIZE = { milestone: "size-5", key: "size-3.5", routine: "size-2.5" } as const;

export function CaseTimeline({ events, start, end, stageHistory = [], lastViewedAt, compact = false }: Props) {
  const [zoom, setZoom] = useState<Zoom>("story");
  const [hiddenCats, setHiddenCats] = useState<Set<EventCategory>>(new Set());
  const [newOnly, setNewOnly] = useState(false);
  const [peekId, setPeekId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const pct = (iso: string) => 2 + (95 * (new Date(iso).getTime() - startMs)) / (endMs - startMs);
  const isNew = (e: TimelineEvent) => !!lastViewedAt && e.date > lastViewedAt;

  const visible = useMemo(
    () =>
      events
        .filter((e) => compact || zoom === "everything" || e.importance !== "routine")
        .filter((e) => !hiddenCats.has(e.category))
        .filter((e) => !newOnly || (!!lastViewedAt && e.date > lastViewedAt))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [events, compact, zoom, hiddenCats, newOnly, lastViewedAt],
  );

  // Greedy lane assignment so nearby dots stack instead of overlapping.
  const placed = useMemo(() => {
    const minGap = zoom === "everything" && !compact ? 1.6 : 3.5;
    const laneEnds = Array<number>(LANES).fill(-Infinity);
    return visible.map((e) => {
      const x = 2 + (95 * (new Date(e.date).getTime() - startMs)) / (endMs - startMs);
      let lane = laneEnds.findIndex((last) => x - last >= minGap);
      if (lane === -1) lane = laneEnds.indexOf(Math.min(...laneEnds));
      laneEnds[lane] = x;
      return { event: e, x, lane };
    });
  }, [visible, zoom, compact, startMs, endMs]);

  const bands = stageHistory.map((s, i) => ({
    ...s,
    label: STAGES.find((st) => st.id === s.stage)?.label ?? s.stage,
    x1: pct(s.from),
    x2: i + 1 < stageHistory.length ? pct(stageHistory[i + 1].from) : 97,
    current: i === stageHistory.length - 1,
  }));

  const years: number[] = [];
  for (let y = new Date(start).getUTCFullYear() + 1; y <= new Date(end).getUTCFullYear(); y++) years.push(y);

  const pinnedIndex = visible.findIndex((e) => e.id === pinnedId);
  const pinned = pinnedIndex >= 0 ? visible[pinnedIndex] : null;

  const step = (dir: 1 | -1) => {
    if (visible.length === 0) return;
    const next = pinnedIndex === -1 ? (dir === 1 ? 0 : visible.length - 1) : (pinnedIndex + dir + visible.length) % visible.length;
    setPinnedId(visible[next].id);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    if (e.key === "Escape") setPinnedId(null);
  };

  const toggleCat = (c: EventCategory) =>
    setHiddenCats((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  const newCount = events.filter(isNew).length;
  const trackHeight = AXIS_Y + LANES * LANE_HEIGHT + 28;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="h-timeline">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-[260px] flex-1">
          <h2 id="h-timeline" className="text-base font-semibold text-slate-900">
            Case timeline
          </h2>
          <p className="text-xs text-slate-500">
            {compact
              ? "Hover a dot to preview an update · click it for details"
              : "Hover a dot to preview · click for details & sources · dashed line = your last visit"}
          </p>
        </div>
        {!compact && (
          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500">View:</span>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 font-medium" role="group" aria-label="Zoom level">
                {(
                  [
                    ["story", "Story", "Only the turning points and key events"],
                    ["everything", "Everything", "Every event, on a wider scrollable track"],
                  ] as const
                ).map(([z, label, hint]) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setZoom(z)}
                    aria-pressed={zoom === z}
                    title={hint}
                    className="rounded-md px-2.5 py-1 text-slate-600 aria-pressed:bg-white aria-pressed:text-slate-900 aria-pressed:shadow-sm"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-slate-500">Show:</span>
              {(Object.keys(CATEGORY_STYLE) as EventCategory[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCat(c)}
                  aria-pressed={!hiddenCats.has(c)}
                  title={`${hiddenCats.has(c) ? "Show" : "Hide"} ${CATEGORY_STYLE[c].label.toLowerCase()} events`}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ring-1 transition aria-[pressed=false]:opacity-40 ${CATEGORY_STYLE[c].chip}`}
                >
                  <span className={`size-2 rounded-full ${CATEGORY_STYLE[c].dot}`} />
                  {CATEGORY_STYLE[c].label}
                </button>
              ))}
            </div>
            {lastViewedAt && newCount > 0 && (
              <button
                type="button"
                onClick={() => setNewOnly((v) => !v)}
                aria-pressed={newOnly}
                title="Show only what happened since you last opened this case"
                className="rounded-lg px-2.5 py-1 font-semibold text-blue-700 ring-1 ring-blue-300 aria-pressed:bg-blue-600 aria-pressed:text-white"
              >
                {newOnly ? "Showing only new" : `Only new since last visit (${newCount})`}
              </button>
            )}
          </div>
        )}
      </div>

      <div className={`mt-1 pb-1 ${zoom === "everything" && !compact ? "overflow-x-auto" : "overflow-x-auto lg:overflow-visible"}`} onKeyDown={onKeyDown}>
        <div
          className="relative"
          style={{ height: trackHeight, minWidth: zoom === "everything" && !compact ? 1400 : 640 }}
          onMouseLeave={() => setPeekId(null)}
        >
          {bands.map((b) => (
            <div
              key={b.stage}
              title={b.label}
              className={`absolute top-0 bottom-6 border-l border-slate-200 ${b.current ? "bg-blue-50/70" : ""}`}
              style={{ left: `${b.x1}%`, width: `${b.x2 - b.x1}%` }}
            >
              {(b.current || b.x2 - b.x1 >= 5) && (
                <span
                  className={`absolute top-1 whitespace-nowrap text-[11px] font-medium ${b.current ? "right-1.5 text-blue-700" : "left-1.5 text-slate-400"}`}
                >
                  {b.current ? `${b.label} · now` : b.label}
                </span>
              )}
            </div>
          ))}

          <div className="absolute left-[2%] right-[3%] h-0.5 rounded bg-slate-200" style={{ top: AXIS_Y }} />

          {lastViewedAt && !compact && (
            <div
              className="absolute bottom-6 border-l-2 border-dashed border-blue-400"
              style={{ left: `${pct(lastViewedAt)}%`, top: 18 }}
              title={`Your last visit: ${formatDate(lastViewedAt)}`}
              aria-hidden
            />
          )}

          {years.map((y) => (
            <span
              key={y}
              className="absolute bottom-0 -translate-x-1/2 text-[11px] text-slate-400"
              style={{ left: `${pct(`${y}-01-01`)}%` }}
            >
              {y}
            </span>
          ))}

          {placed.map(({ event: e, x, lane }) => {
            const top = AXIS_Y + lane * LANE_HEIGHT;
            const fresh = isNew(e);
            const align = x < 15 ? "left-0" : x > 85 ? "right-0" : "left-1/2 -translate-x-1/2";
            return (
              <div key={e.id} className="absolute" style={{ left: `${x}%`, top }}>
                {lane > 0 && <span className="absolute left-0 w-px -translate-x-1/2 bg-slate-200" style={{ top: -lane * LANE_HEIGHT, height: lane * LANE_HEIGHT }} />}
                <button
                  type="button"
                  onMouseEnter={() => setPeekId(e.id)}
                  onFocus={() => setPeekId(e.id)}
                  onBlur={() => setPeekId(null)}
                  onClick={() => setPinnedId(pinnedId === e.id ? null : e.id)}
                  aria-label={`${formatDate(e.date)}: ${e.title}`}
                  className={`relative block -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white transition hover:scale-125 focus:outline-none focus-visible:ring-blue-500 ${DOT_SIZE[e.importance]} ${CATEGORY_STYLE[e.category].dot} ${pinnedId === e.id ? "scale-125 outline-2 outline-offset-2 outline-slate-900" : ""}`}
                >
                  {fresh && !compact && <span className="absolute -inset-1 animate-pulse rounded-full ring-2 ring-blue-500" />}
                </button>
                {peekId === e.id && (
                  <div className={`pointer-events-none absolute bottom-4 z-10 w-56 rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-lg ${align}`}>
                    <p className="text-[11px] text-slate-500">
                      {formatDate(e.date)} · {CATEGORY_STYLE[e.category].label}
                      {fresh && !compact && <span className="ml-1 font-semibold text-blue-600">NEW</span>}
                    </p>
                    <p className="text-sm font-semibold text-slate-900">{e.title}</p>
                    <p className="line-clamp-2 text-xs text-slate-600">{e.summary}</p>
                  </div>
                )}
              </div>
            );
          })}

          {visible.length === 0 && (
            <p className="absolute inset-x-0 text-center text-sm text-slate-400" style={{ top: AXIS_Y + 16 }}>
              No events match these filters.
            </p>
          )}
        </div>
      </div>

      {pinned && (
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <button type="button" onClick={() => step(-1)} className="rounded p-1 text-slate-500 hover:bg-white" aria-label="Previous event">
            <ChevronLeft className="size-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">
              {formatDate(pinned.date)} ·{" "}
              <span>{CATEGORY_STYLE[pinned.category].label}</span>
            </p>
            <p className="mt-1 font-semibold text-slate-900">{pinned.title}</p>
            <p className="text-sm text-slate-700">{pinned.summary}</p>
            {pinned.impact && <p className="mt-1 text-sm font-medium text-blue-800">What it means: {pinned.impact}</p>}
            {!compact && (
              <div className="mt-2">
                <Sources sources={pinned.sources} />
              </div>
            )}
          </div>
          <button type="button" onClick={() => step(1)} className="rounded p-1 text-slate-500 hover:bg-white" aria-label="Next event">
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </section>
  );
}
