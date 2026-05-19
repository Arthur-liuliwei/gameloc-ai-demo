import type { OverflowRisk } from "@/lib/localization-constraints";

/** Client / server shared shape for optional row metadata on translate requests. */
export type RowConstraintsPayload = {
  pageId?: string;
  stringContext?: string;
  uiComponent?: string;
  characterLimit?: number;
  constraintNotes?: string;
};

export type TranslateSegmentPayload = {
  id: string;
  sourceText?: string;
  rowConstraints?: RowConstraintsPayload;
};

export type PeerTranslationPayload = {
  id: string;
  sourceText?: string;
  aiTranslation?: string;
  finalTranslation?: string;
  rowConstraints?: RowConstraintsPayload;
};

export type TranslateSuccessSegmentFeedback = {
  id: string;
  overflowRisk: OverflowRisk;
  measuredLength: number;
  characterLimit: number;
  constraintWarnings: string[];
  shorterAlternatives: string[];
};
