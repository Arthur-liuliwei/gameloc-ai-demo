/**
 * Localization row metadata + helpers for constraint-aware translation.
 * Used by the Translation Workspace UI and /api/translate.
 */

export type OverflowRisk = "safe" | "warning" | "high";

/** Per-string production metadata (Page, UI slot, hard limits, notes). */
export type RowLocalizationMeta = {
  pageId: string;
  stringContext: string;
  uiComponent: string;
  /** 0 = no numeric cap (still show notes in the prompt). */
  characterLimit: number;
  constraintNotes: string;
};

export const EMPTY_ROW_META: RowLocalizationMeta = {
  pageId: "",
  stringContext: "",
  uiComponent: "",
  characterLimit: 0,
  constraintNotes: ""
};

/** True if notes suggest counting only CJK / Han ideographs for the cap. */
export function notesSuggestCjkOnly(notes: string): boolean {
  const n = notes.toLowerCase();
  return (
    /\bcjk\b/.test(n) ||
    /\bhan\b/.test(n) ||
    /chinese characters?/.test(n) ||
    /[\u4e00-\u9fff].*(字|字符)/.test(notes) ||
    /max\s*\d+\s*cjk/i.test(notes)
  );
}

/** Count Han script characters (common game zh-CN skill/item caps). */
export function countHanChars(text: string): number {
  let n = 0;
  for (const ch of text) {
    if (/\p{Script=Han}/u.test(ch)) n += 1;
  }
  return n;
}

/** Default string length measure: counts extended grapheme clusters when possible. */
export function measureDisplayLength(text: string): number {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      const seg = new Intl.Segmenter("zh-CN", { granularity: "grapheme" });
      return [...seg.segment(text)].length;
    } catch {
      /* fall through */
    }
  }
  return Array.from(text).length;
}

export function measuredLength(text: string, meta: Pick<RowLocalizationMeta, "constraintNotes">): number {
  return notesSuggestCjkOnly(meta.constraintNotes) ? countHanChars(text) : measureDisplayLength(text);
}

export function overflowRiskForTranslation(
  translatedText: string,
  meta: RowLocalizationMeta
): OverflowRisk {
  const limit = meta.characterLimit;
  if (!limit || limit <= 0) return "safe";
  const len = measuredLength(translatedText, meta);
  if (len > limit) return "high";
  if (len > Math.floor(limit * 0.85)) return "warning";
  return "safe";
}

/**
 * Human-readable lines injected into the model prompt so limits affect generation,
 * not only post-QA.
 */
export function buildRowConstraintPromptBlock(meta: RowLocalizationMeta): string {
  const lines: string[] = [];
  const page = meta.pageId.trim();
  const ctx = meta.stringContext.trim();
  const ui = meta.uiComponent.trim();
  const notes = meta.constraintNotes.trim();
  const limit = meta.characterLimit > 0 ? meta.characterLimit : 0;

  if (page) lines.push(`Page / screen group: ${page}`);
  if (ctx) lines.push(`String role / context: ${ctx}`);
  if (ui) lines.push(`UI component / placement: ${ui}`);
  if (notes) lines.push(`Constraint notes (follow closely): ${notes}`);
  if (limit > 0) {
    const mode = notesSuggestCjkOnly(meta.constraintNotes) ? "CJK / Han ideographs only" : "display characters (graphemes)";
    lines.push(
      `HARD CHARACTER BUDGET: output MUST be at most ${limit} ${mode}. If the faithful translation is too long, shorten aggressively while preserving gameplay meaning, placeholders, and glossary targets.`
    );
    lines.push("Prefer compact MOBA / HUD readable phrasing when the source is a short UI label.");
  } else {
    lines.push(
      "No numeric character cap is set; still respect UI readability and avoid unnecessary verbosity for short HUD strings."
    );
  }

  if (!lines.length) return "";
  return ["--- ROW LOCALIZATION CONSTRAINTS ---", ...lines, "--- END CONSTRAINTS ---"].join("\n");
}

/** Summary of other strings on the same page (for consistency batching). */
export function buildSharedPageContextBlock(params: {
  pageId: string;
  peers: Array<{
    id: string;
    sourceText: string;
    aiTranslation: string;
    finalTranslation: string;
    meta: RowLocalizationMeta;
  }>;
  /** Row ids being translated in this request (peers may include more for terminology only). */
  activeIds: string[];
}): string {
  const { pageId, peers, activeIds } = params;
  if (!pageId.trim()) return "";

  const activeSet = new Set(activeIds);
  const lines: string[] = [
    "--- SHARED PAGE CONTEXT ---",
    `Page ID: ${pageId}`,
    `Related strings in this workspace for this page: ${peers.length}`,
    "Use existing Chinese on this page as terminology and tone anchors. Keep skill/HUD families consistent.",
    ""
  ];

  for (const p of peers) {
    const zh = p.finalTranslation.trim() || p.aiTranslation.trim();
    const tag = activeSet.has(p.id) ? "(in this batch)" : "(reference)";
    lines.push(`${tag} [${p.id}] ${p.meta.uiComponent ? `[${p.meta.uiComponent}] ` : ""}${p.sourceText}`);
    if (zh) lines.push(`    zh: ${zh}`);
    else lines.push("    zh: (not translated yet)");
    if (p.meta.constraintNotes.trim()) lines.push(`    constraints: ${p.meta.constraintNotes.trim()}`);
    lines.push("");
  }

  lines.push("--- END SHARED PAGE CONTEXT ---");
  return lines.join("\n");
}
