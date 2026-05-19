import type { GlossaryEntry } from "@/lib/glossary-types";

export type GlossaryPriority = "Preferred" | "Required" | "Forbidden";

export type NormalizedGlossaryTerm = {
  source: string;
  target: string;
  priority: GlossaryPriority;
  category: string;
};

type RawGlossaryTerm = {
  source?: string;
  target?: string;
  priority?: GlossaryPriority;
  category?: string;
};

export function normalizeGlossaryTerms(raw: RawGlossaryTerm[] | undefined): NormalizedGlossaryTerm[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .filter((t) => t.source?.trim() && t.target?.trim())
    .map((t) => ({
      source: t.source!.trim(),
      target: t.target!.trim(),
      priority: (t.priority ?? "Preferred") as GlossaryPriority,
      category: (t.category ?? "System").trim()
    }));
}

export function buildGlossaryAppliedBlock(terms: NormalizedGlossaryTerm[]): string {
  if (terms.length === 0) return "- (No glossary entries provided)";
  const order: Record<GlossaryPriority, number> = { Required: 0, Preferred: 1, Forbidden: 2 };
  const sorted = [...terms].sort((a, b) => order[a.priority] - order[b.priority]);
  return sorted
    .map((t) => {
      const suffix =
        t.priority === "Forbidden"
          ? " — if source appears: output MUST NOT contain this Chinese phrase"
          : " — if source appears: output MUST use this target wording";
      return `- [${t.priority}] [${t.category}] ${t.source} => ${t.target}${suffix}`;
    })
    .join("\n");
}

export function glossaryEntriesToNormalized(entries: GlossaryEntry[]): NormalizedGlossaryTerm[] {
  return entries
    .filter((e) => e.sourceTerm.trim() && e.targetTerm.trim())
    .map((e) => ({
      source: e.sourceTerm.trim(),
      target: e.targetTerm.trim(),
      priority: e.priority,
      category: e.category
    }));
}
