"use client";

import type { ReactNode } from "react";
import type { SourceRef } from "@/lib/types";
import { useOpenSource } from "@/components/source/SourceProvider";

// Badge-free source: the value itself is clickable (dotted underline) and opens the original.
export function SourceLink({ source, children }: { source?: SourceRef; children: ReactNode }) {
  const open = useOpenSource();
  if (!source) return <>{children}</>;
  return (
    <button
      type="button"
      onClick={() => open(source)}
      title={`Source: ${source.label}. Click to read the original.`}
      className="inline text-left underline decoration-slate-300 decoration-dotted underline-offset-[3px] transition hover:text-blue-700 hover:decoration-blue-500"
    >
      {children}
    </button>
  );
}
