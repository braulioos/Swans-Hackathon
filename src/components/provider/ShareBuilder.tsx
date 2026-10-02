"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Link2, Lock } from "lucide-react";
import type { CaseDigest, ShareConfig, ShareSection } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { buildSharePacket } from "@/lib/share";
import { ProviderView } from "@/components/provider/ProviderView";

// "Let me adjust what the provider sees before I send it."
// Left: toggles. Right: live preview built by the same buildSharePacket the provider page uses.
const SECTION_LABELS: { id: ShareSection; label: string; hint: string }[] = [
  { id: "status", label: "Case status & stage", hint: "Is the case alive? Where is it?" },
  { id: "coverage", label: "Coverage", hint: "Is there coverage behind the case?" },
  { id: "timeline", label: "Case updates timeline", hint: "Only events marked shareable" },
  { id: "requests", label: "What we need from them", hint: "Open requests for this provider" },
  { id: "bills", label: "Their bills & records status", hint: "What we have on file from them" },
  { id: "attendance", label: "Treatment attendance", hint: "Visits attended / missed" },
  { id: "otherProviders", label: "Other treating providers", hint: "So they are not treating with one eye closed" },
];

export function ShareBuilder({ digest, initial, existing }: { digest: CaseDigest; initial: ShareConfig; existing: ShareConfig[] }) {
  const [config, setConfig] = useState<ShareConfig>(initial);
  const [link, setLink] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const createLink = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/shares", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
      if (!res.ok) throw new Error(await res.text());
      const { token } = (await res.json()) as { token: string };
      setLink(`/share/${token}`);
    } catch {
      setLink(config.token ? `/share/${config.token}` : null);
    } finally {
      setSaving(false);
    }
  };
  const providerName = (id: string) => digest.providers.find((p) => p.id === id)?.name ?? "Provider";
  const packet = buildSharePacket(digest, config);

  const shareableEvents = digest.timeline.filter((e) => e.shareableWithProviders);
  const privateEvents = digest.timeline.filter((e) => !e.shareableWithProviders);

  const toggle = (id: ShareSection) =>
    setConfig((c) => ({ ...c, sections: { ...c.sections, [id]: !c.sections[id] } }));

  const toggleEvent = (id: string) =>
    setConfig((c) => ({
      ...c,
      hiddenEventIds: c.hiddenEventIds.includes(id) ? c.hiddenEventIds.filter((x) => x !== id) : [...c.hiddenEventIds, id],
    }));

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="provider">
            Share with
          </label>
          <select
            id="provider"
            value={config.providerId}
            onChange={(e) => setConfig((c) => ({ ...c, providerId: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {digest.providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.specialty}
              </option>
            ))}
          </select>

          <fieldset className="mt-4 space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">What they can see</legend>
            {SECTION_LABELS.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-slate-50">
                <input type="checkbox" checked={config.sections[s.id]} onChange={() => toggle(s.id)} className="mt-1 size-4 accent-blue-600" />
                <span>
                  <span className="block text-sm font-medium text-slate-900">{s.label}</span>
                  <span className="text-xs text-slate-500">{s.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {config.sections.coverage && (
            <div className="mt-2 flex gap-2 text-xs">
              {(["yesNo", "amount"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={config.coverageDetail === m}
                  onClick={() => setConfig((c) => ({ ...c, coverageDetail: m }))}
                  className="rounded-md px-2 py-1 ring-1 ring-slate-200 aria-pressed:bg-slate-900 aria-pressed:text-white"
                >
                  {m === "yesNo" ? "Coverage: yes/no only" : "Show policy amount"}
                </button>
              ))}
            </div>
          )}

          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="note">
            Note to provider
          </label>
          <textarea
            id="note"
            rows={2}
            value={config.noteToProvider ?? ""}
            onChange={(e) => setConfig((c) => ({ ...c, noteToProvider: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />

          {config.sections.timeline && (
            <div className="mt-3 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-600">Updates they&apos;ll see</p>
              <ul className="mt-1 max-h-48 space-y-1 overflow-y-auto">
                {shareableEvents.map((e) => (
                  <li key={e.id}>
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={!config.hiddenEventIds.includes(e.id)}
                        onChange={() => toggleEvent(e.id)}
                        className="size-3.5 accent-blue-600"
                      />
                      <span className="text-slate-400">{formatDate(e.date)}</span> {e.title}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-3 rounded-lg border border-dashed border-slate-300 p-3">
            <p className="flex items-center gap-1 text-xs font-semibold text-slate-600">
              <Lock className="size-3" /> Never shared
            </p>
            <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
              <li>Case value, strategy, settlement positions</li>
              {privateEvents.map((e) => (
                <li key={e.id}>{e.title}</li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={createLink}
            disabled={saving}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Link2 className="size-4" /> {saving ? "Creating…" : "Create secure link"}
          </button>
          {link && (
            <p className="mt-2 break-all rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
              Link ready:{" "}
              <Link href={link} className="font-medium text-blue-700 underline">
                {link}
              </Link>
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <Eye className="size-4" /> Has their office opened it?
          </h2>
          {existing.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No links shared yet.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {existing.map((s) => (
                <li key={s.token} className="rounded-lg bg-slate-50 px-3 py-2">
                  <Link href={`/share/${s.token}`} className="font-medium text-slate-900 hover:underline">
                    {providerName(s.providerId)}
                  </Link>
                  <p className="text-xs text-slate-500">
                    Shared {formatDate(s.createdAt)} ·{" "}
                    {s.views.length === 0
                      ? "not opened yet"
                      : `opened ${s.views.length}× · last ${formatDate(s.views[0].at)}${s.views[0].who ? ` by ${s.views[0].who}` : ""}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Preview: exactly what the provider sees</p>
        <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-slate-100 p-4">
          <ProviderView packet={packet} />
        </div>
      </div>
    </div>
  );
}
