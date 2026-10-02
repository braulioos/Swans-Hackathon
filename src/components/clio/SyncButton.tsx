"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

// Feedback while a sync + digest runs (can take a minute when Claude has new material to read).
export function SyncButton() {
  const [busy, setBusy] = useState(false);
  return (
    <form action="/api/clio/sync" method="post" className="flex gap-2" onSubmit={() => setBusy(true)}>
      <input name="query" defaultValue="Sapini" aria-label="Matter search" className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
      >
        <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />
        {busy ? "Syncing & digesting…" : "Sync from Clio"}
      </button>
    </form>
  );
}
