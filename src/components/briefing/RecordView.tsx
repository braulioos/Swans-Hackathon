"use client";

import { useEffect } from "react";

// Records the visit after the page has rendered, so this visit's recap still shows what was new.
export function RecordView({ matterId }: { matterId: string }) {
  useEffect(() => {
    fetch("/api/views", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matterId }) }).catch(() => {});
  }, [matterId]);
  return null;
}
