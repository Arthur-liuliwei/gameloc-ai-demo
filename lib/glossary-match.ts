import type { GlossaryEntry } from "@/lib/glossary-types";

export function getGlossaryMatchesForSource(text: string, entries: GlossaryEntry[]): GlossaryEntry[] {
  const lower = text.toLowerCase();
  return entries
    .filter((e) => e.sourceTerm.trim().length > 0 && lower.includes(e.sourceTerm.toLowerCase()))
    .sort((a, b) => b.sourceTerm.length - a.sourceTerm.length);
}
