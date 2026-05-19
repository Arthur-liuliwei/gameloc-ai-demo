"use client";

import { GlossaryProvider } from "@/contexts/glossary-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return <GlossaryProvider>{children}</GlossaryProvider>;
}
