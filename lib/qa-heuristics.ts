import type { GlossaryEntry } from "@/lib/glossary-types";
import type { QaIssue, QaIssueType, QaSeverity } from "@/lib/qa-check-types";

/**
 * Capture common game localization placeholders in source text.
 * Expand this list as your project adds new token patterns.
 */
const PLACEHOLDER_PATTERNS: RegExp[] = [
  /\{[^{}]+\}/g, // {player_name}
  /\{\{[^{}]+\}\}/g, // {{token}}
  /%[sdif]/gi, // %s, %d
  /<br\s*\/?>/gi
];

function extractPlaceholders(text: string): Set<string> {
  const found = new Set<string>();
  for (const re of PLACEHOLDER_PATTERNS) {
    const copy = new RegExp(re.source, re.flags);
    let m: RegExpExecArray | null;
    while ((m = copy.exec(text)) !== null) {
      found.add(m[0]);
    }
  }
  return found;
}

/** Remove newline tokens for “content” placeholder compare if desired; we keep them literal. */
export function findMissingPlaceholders(sourceText: string, finalTranslation: string): QaIssue[] {
  const src = extractPlaceholders(sourceText);
  const fin = extractPlaceholders(finalTranslation);
  const issues: QaIssue[] = [];
  for (const token of src) {
    if (!fin.has(token)) {
      issues.push({
        type: "Missing Placeholder",
        severity: "High",
        issue: `Final translation is missing the placeholder "${token}" that appears in the source.`,
        suggestedFix: `Copy "${token}" into the final translation exactly where it belongs (same spelling and braces).`
      });
    }
  }
  return issues;
}

type MatchShape = Pick<GlossaryEntry, "sourceTerm" | "targetTerm" | "priority">;

/** When source contains glossary source and final accidentally uses a forbidden target. */
export function findForbiddenGlossaryInFinal(sourceText: string, finalTranslation: string, matches: MatchShape[]): QaIssue[] {
  const lower = sourceText.toLowerCase();
  const issues: QaIssue[] = [];
  for (const row of matches) {
    if (row.priority !== "Forbidden") continue;
    if (!lower.includes(row.sourceTerm.toLowerCase())) continue;
    const t = row.targetTerm.trim();
    if (t && finalTranslation.includes(t)) {
      issues.push({
        type: "Forbidden Glossary Term",
        severity: "High",
        issue: `Forbidden glossary target "${t}" appears in the final translation while the source references "${row.sourceTerm}".`,
        suggestedFix: `Rephrase the final line to avoid "${t}"; use an approved alternative or remove the banned wording.`
      });
    }
  }
  return issues;
}

/** Required / Preferred: source triggers term but final doesn’t contain target wording. */
export function findGlossaryInconsistency(sourceText: string, finalTranslation: string, matches: MatchShape[]): QaIssue[] {
  const lower = sourceText.toLowerCase();
  const issues: QaIssue[] = [];
  for (const row of matches) {
    if (row.priority === "Forbidden") continue;
    if (!lower.includes(row.sourceTerm.toLowerCase())) continue;
    const target = row.targetTerm.trim();
    if (!target) continue;
    if (!finalTranslation.includes(target)) {
      const sev: QaSeverity = row.priority === "Required" ? "High" : "Medium";
      issues.push({
        type: "Glossary Inconsistency",
        severity: sev,
        issue: `Source contains "${row.sourceTerm}" (${row.priority}) but final does not use the glossary target "${target}".`,
        suggestedFix: `Include "${target}" in the final where that meaning is expressed, unless intentionally overridden by narrative lead.`
      });
    }
  }
  return issues;
}

export function findLengthRisk(finalTranslation: string, lengthLimit?: number): QaIssue[] {
  if (typeof lengthLimit !== "number" || !Number.isFinite(lengthLimit) || lengthLimit <= 0) return [];
  if (finalTranslation.length <= lengthLimit) return [];
  return [
    {
      type: "UI Length Risk",
      severity: "Medium",
      issue: `Final translation is ${finalTranslation.length} characters, over the configured limit of ${lengthLimit}.`,
      suggestedFix: "Shorten wording while keeping meaning and placeholders; check in-game UI truncation."
    }
  ];
}
