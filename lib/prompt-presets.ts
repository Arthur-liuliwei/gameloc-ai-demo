import type { NormalizedGlossaryTerm } from "@/lib/glossary-prompt-block";
import { buildGlossaryAppliedBlock } from "@/lib/glossary-prompt-block";

/** Preset IDs sent from the client and accepted by /api/translate */
export type PromptPresetId = "aaa-cinematic" | "riot-moba" | "fantasy-rpg" | "casual-mobile";

export const DEFAULT_PROMPT_PRESET_ID: PromptPresetId = "aaa-cinematic";

export type PromptPreset = {
  id: PromptPresetId;
  /** Short label in UI */
  label: string;
  /** For explanation panel */
  intendedGenre: string;
  translationPhilosophy: string;
  whyWordingDiffers: string;
  /** Opening role line for the model */
  roleLine: string;
  /** Tone-specific bullets (after shared base rules) */
  toneRules: string[];
};

const GLOSSARY_EXAMPLES = [
  "- inhibitor => 水晶 (MOBA objective; avoid literal calques)",
  "- regroup => 重新集结",
  "- objective => 战略目标"
].join("\n");

/** Shown in Prompt Preview; mirrors enforcement sent to the API */
export const GLOSSARY_RULES_SUMMARY = [
  "Required / Preferred: when the source segment matches a glossary source term, the translation MUST include that glossary target wording.",
  "Forbidden: when the source matches, the translation MUST NOT contain the forbidden target phrase.",
  "Prefer natural in-game phrasing while satisfying glossary constraints."
].join("\n");

export const PLACEHOLDER_RULES_SUMMARY = [
  "Preserve placeholders exactly as in the source: {player_name}, %s, <br>, line breaks, and similar tokens must appear unchanged in the translation.",
  "Do not translate token names inside braces or angle-bracket tags unless the project explicitly requires it."
].join("\n");

export const PROMPT_PRESETS: Record<PromptPresetId, PromptPreset> = {
  "aaa-cinematic": {
    id: "aaa-cinematic",
    label: "AAA Cinematic",
    intendedGenre: "Console / AAA action-adventure and narrative games",
    translationPhilosophy:
      "Prioritize natural, dramatic dialogue with emotional delivery—closer to film and premium AAA localization than to textbook translation.",
    whyWordingDiffers:
      "AAA scripts reward cadence, subtext, and immersion. Literal wording often sounds flat on VO and subtitles; this preset pushes idiomatic, cinematic Chinese while keeping meaning and stakes.",
    roleLine: "You are a senior cinematic game localization linguist for AAA console titles (Ubisoft-style narrative tone).",
    toneRules: [
      "Deliver natural dramatic dialogue with emotional weight; match the scene's intensity.",
      "Use console/AAA localization tone: polished, immersive, and player-first.",
      "Avoid literal translation when it hurts immersion; prefer meaning- and performance-driven Chinese.",
      "Preserve world tone and character voice; keep lines playable in cutscenes and barks.",
      "Favor concise cinematic rhythm over word-for-word mapping when both are faithful."
    ]
  },
  "riot-moba": {
    id: "riot-moba",
    label: "Riot-style MOBA",
    intendedGenre: "Competitive live-service MOBA (League-style player-facing copy)",
    translationPhilosophy:
      "Optimize for fast scanning in combat: short, punchy lines with strong gameplay vocabulary and live-service MOBA conventions.",
    whyWordingDiffers:
      "MOBA UI and VO compete with chaos on screen. Verbose or literary phrasing slows comprehension; this preset favors tight, repeatable patterns players already know from the genre.",
    roleLine: "You are a senior localization linguist for competitive live-service MOBA games (Riot-style player-facing tone).",
    toneRules: [
      "Use concise competitive language; prioritize fast readability in combat and shop flows.",
      "Prefer strong gameplay terminology players expect (objectives, cooldowns, ranks, map calls).",
      "Keep a direct player-facing tone: confident, clear, and non-patronizing.",
      "Match live-service MOBA naming and cadence; avoid stiff literal calques.",
      "Avoid verbose wording—trim filler that does not change gameplay meaning."
    ]
  },
  "fantasy-rpg": {
    id: "fantasy-rpg",
    label: "Fantasy RPG",
    intendedGenre: "Western / JRPG-inspired fantasy RPGs with lore and quest text",
    translationPhilosophy:
      "Lean into lore-heavy, heroic narrative tone with consistent fantasy naming and vocabulary that supports worldbuilding.",
    whyWordingDiffers:
      "RPG players read quests and item text for story and tone. Modern plain speech can break the medieval/fantasy frame; this preset allows richer, more elevated register when it fits the IP.",
    roleLine: "You are a senior fantasy RPG localization linguist focused on lore, quests, and heroic narrative tone.",
    toneRules: [
      "Use lore-heavy style: proper nouns, factions, and relic names should feel consistent and epic where appropriate.",
      "Maintain fantasy naming consistency; avoid anachronistic modern slang unless the source uses it for comedy.",
      "Prefer heroic narrative tone for narration and quest headers; keep UI legible.",
      "Draw on medieval/fantasy vocabulary where it improves immersion without obscuring mechanics.",
      "Preserve immersion and worldbuilding; do not flatten poetic source lines into dry manuals."
    ]
  },
  "casual-mobile": {
    id: "casual-mobile",
    label: "Casual Mobile",
    intendedGenre: "Hyper-casual / mobile F2P UI, tutorials, and short system strings",
    translationPhilosophy:
      "Optimize for small screens and quick taps: short, friendly, high-readability copy with compact translations.",
    whyWordingDiffers:
      "Mobile players skim; long clauses wrap badly on buttons. This preset favors approachable, simple words and tight line length over literary flourish.",
    roleLine: "You are a senior mobile game localization linguist for casual F2P titles and UI-heavy experiences.",
    toneRules: [
      "Use short, UI-friendly wording; keep button labels and toasts scannable at a glance.",
      "Friendly, approachable tone; avoid intimidating jargon unless the source is technical.",
      "Maximize readability: simple sentence structures and common vocabulary.",
      "Prefer compact translations that fit tight layouts; remove redundancy when meaning stays clear.",
      "Avoid complex vocabulary when a simpler word carries the same gameplay meaning."
    ]
  }
};

const SHARED_BASE_RULES = [
  "- Prioritize natural player-facing localization, not literal word-for-word translation.",
  "- Prefer idiomatic Simplified Chinese game language when target is zh-CN; keep phrasing natural for players.",
  "- Preserve placeholders exactly: {player_name}, %s, <br> and similar tokens.",
  "- Glossary enforcement is mandatory for Required/Preferred rows when the source term appears.",
  "- For Forbidden rows when the source term appears: never output the forbidden Chinese substring.",
  "- Return only the translated text. Do not add explanations."
];

/** Accepts preset id or legacy gameTone string from older clients */
export function normalizePromptPresetId(raw: string | undefined): PromptPresetId {
  const s = (raw ?? "").trim().toLowerCase();
  const ids = Object.keys(PROMPT_PRESETS) as PromptPresetId[];
  if (ids.includes(s as PromptPresetId)) return s as PromptPresetId;
  if (s.includes("moba") && s.includes("riot")) return "riot-moba";
  if (s.includes("fantasy") || s.includes("rpg")) return "fantasy-rpg";
  if (s.includes("casual") || s.includes("mobile")) return "casual-mobile";
  if (s.includes("aaa") || s.includes("cinematic")) return "aaa-cinematic";
  return DEFAULT_PROMPT_PRESET_ID;
}

export function getPresetList(): PromptPreset[] {
  return Object.values(PROMPT_PRESETS);
}

export function buildTranslationPrompt(params: {
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  presetId: PromptPresetId;
  glossaryTerms: NormalizedGlossaryTerm[];
  /** Optional: per-row UI/page limits + notes (constraint-aware generation). */
  extraInstructionBlocks?: string[];
}): string {
  const preset = PROMPT_PRESETS[params.presetId] ?? PROMPT_PRESETS[DEFAULT_PROMPT_PRESET_ID];
  const glossaryAppliedBlock = buildGlossaryAppliedBlock(params.glossaryTerms);
  const extras = (params.extraInstructionBlocks ?? []).map((b) => b.trim()).filter(Boolean);

  return [
    preset.roleLine,
    `Source language: ${params.sourceLanguage}`,
    `Target language: ${params.targetLanguage}`,
    `Localization preset: ${preset.label}`,
    "",
    "Rules:",
    ...SHARED_BASE_RULES.map((r) => (r.startsWith("-") ? r : `- ${r}`)),
    ...preset.toneRules.map((r) => (r.startsWith("-") ? r : `- ${r}`)),
    "",
    ...extras,
    ...(extras.length ? [""] : []),
    "Glossary Applied (authoritative for this request):",
    glossaryAppliedBlock,
    "",
    "Glossary examples (style reference):",
    GLOSSARY_EXAMPLES,
    "",
    "Source text:",
    params.sourceText
  ].join("\n");
}

/** Full prompt string for preview UI (same shape as API `input`) */
export function buildTranslationPromptPreview(params: {
  sourceLanguage: string;
  targetLanguage: string;
  presetId: PromptPresetId;
  glossaryTerms: NormalizedGlossaryTerm[];
  /** Optional sample source line; if empty, a placeholder line is used */
  sampleSourceText?: string;
  /** Optional blocks shown in the collapsible prompt preview (e.g. constraints). */
  extraInstructionBlocks?: string[];
}): string {
  const sample = params.sampleSourceText?.trim() || "[Sample source line would appear here during translate.]";
  return buildTranslationPrompt({
    sourceText: sample,
    sourceLanguage: params.sourceLanguage,
    targetLanguage: params.targetLanguage,
    presetId: params.presetId,
    glossaryTerms: params.glossaryTerms,
    extraInstructionBlocks: params.extraInstructionBlocks
  });
}
