"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { SourceRef } from "@/lib/types";
import { SourceDrawer } from "@/components/source/SourceDrawer";

// Lets any SourceChip anywhere on the page open the one shared drawer.
const OpenSourceContext = createContext<(source: SourceRef) => void>(() => {});

export const useOpenSource = () => useContext(OpenSourceContext);

export function SourceProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<SourceRef | null>(null);
  return (
    <OpenSourceContext.Provider value={setActive}>
      {children}
      <SourceDrawer source={active} onClose={() => setActive(null)} />
    </OpenSourceContext.Provider>
  );
}
