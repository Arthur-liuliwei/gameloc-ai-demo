/** Issue categories the QA checker reports (AI + deterministic checks). */
export type QaIssueType =
  | "Missing Placeholder"
  | "Glossary Inconsistency"
  | "UI Length Risk"
  | "Machine Translation Tone"
  | "Unnatural Game Phrasing"
  | "Potential Mistranslation"
  | "Forbidden Glossary Term";

export type QaSeverity = "High" | "Medium" | "Low";

/** One QA finding; ready for JSON API + UI. */
export type QaIssue = {
  type: QaIssueType | string;
  severity: QaSeverity;
  issue: string;
  suggestedFix: string;
};

export type QaCheckRequestBody = {
  sourceText?: string;
  aiDraft?: string;
  finalTranslation?: string;
  targetLanguage?: string;
  promptPresetId?: string;
  gameTone?: string;
  /** Glossary rows relevant to this source (e.g. matches from Translation Workspace). */
  glossaryMatches?: Array<{
    sourceTerm: string;
    targetTerm: string;
    priority?: string;
    category?: string;
    id?: string;
  }>;
  /** Optional max character count for final translation before flagging length risk. */
  lengthLimit?: number;
};

export type QaCheckResponseBody = {
  issues: QaIssue[];
  /** Optional server-side note (e.g. parse fallback). */
  meta?: string;
};
