/**
 * Map a character span in the source string to a span in the target string by
 * proportional alignment (CAT-style rough alignment, not word-level NLP).
 *
 * Prioritizes Final Translation, then falls back to AI Draft.
 */

export type TargetSuggestionSource = "final" | "ai";

export type TargetSuggestionResult = {
  text: string;
  from: TargetSuggestionSource;
};

function trimEdgePunctuation(s: string): string {
  return s.replace(/^[\s\u3000，。、！？,.;:!?'"“”]+|[\s\u3000，。、！？,.;:!?'"“”]+$/g, "");
}

/**
 * Reject tiny source selections that would map to almost the entire target
 * (common proportional false positive).
 */
function isSuspiciouslyWide(
  sourceLen: number,
  selStart: number,
  selEnd: number,
  targetLen: number,
  sliceStart: number,
  sliceEnd: number
): boolean {
  const selRatio = (selEnd - selStart) / sourceLen;
  const sliceRatio = (sliceEnd - sliceStart) / Math.max(1, targetLen);
  if (selRatio < 0.06 && sliceRatio > 0.82) return true;
  return false;
}

function mapProportionalSlice(
  fullSource: string,
  selStart: number,
  selEnd: number,
  target: string
): { slice: string; lo: number; hi: number } | null {
  const slen = fullSource.length;
  const tlen = target.length;
  if (slen === 0 || tlen === 0 || selEnd <= selStart) return null;

  const a = Math.max(0, Math.min(selStart, slen));
  const b = Math.max(a, Math.min(selEnd, slen));
  if (b <= a) return null;

  let lo = Math.max(0, Math.min(tlen - 1, Math.round((a / slen) * tlen)));
  let hi = Math.max(lo + 1, Math.min(tlen, Math.round((b / slen) * tlen)));
  if (hi <= lo) hi = Math.min(tlen, lo + 1);

  const raw = target.slice(lo, hi);
  const slice = trimEdgePunctuation(raw);
  if (!slice) return null;

  if (isSuspiciouslyWide(slen, a, b, tlen, lo, hi)) return null;

  return { slice, lo, hi };
}

function trySuggestFromTargetField(
  fullSource: string,
  selStart: number,
  selEnd: number,
  target: string,
  from: TargetSuggestionSource
): TargetSuggestionResult | null {
  const t = target.trim();
  if (!t) return null;
  const mapped = mapProportionalSlice(fullSource, selStart, selEnd, t);
  if (!mapped) return null;
  if (!mapped.slice.trim()) return null;
  return { text: mapped.slice, from };
}

/**
 * Infer localized wording for a source selection using proportional character
 * alignment. Tries Final Translation first, then AI Draft.
 */
export function suggestTargetFromSourceSelection(
  fullSource: string,
  selStart: number,
  selEnd: number,
  finalTranslation: string,
  aiTranslation: string
): TargetSuggestionResult | null {
  const fromFinal = trySuggestFromTargetField(fullSource, selStart, selEnd, finalTranslation, "final");
  if (fromFinal) return fromFinal;
  const fromAi = trySuggestFromTargetField(fullSource, selStart, selEnd, aiTranslation, "ai");
  if (fromAi) return fromAi;
  return null;
}

/** Walk text nodes under root; returns offsets in concatenated text (matches `element.textContent` for typical DOM). */
export function getTextOffsetsInElement(root: HTMLElement, range: Range): { start: number; end: number } | null {
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let total = 0;
  let start: number | null = null;
  let end: number | null = null;
  let node: Node | null = walker.nextNode();
  while (node) {
    const textNode = node as Text;
    const len = textNode.length;
    if (textNode === range.startContainer) {
      start = total + range.startOffset;
    }
    if (textNode === range.endContainer) {
      end = total + range.endOffset;
    }
    total += len;
    node = walker.nextNode();
  }

  if (start === null || end === null) return null;
  return { start: Math.min(start, end), end: Math.max(start, end) };
}
