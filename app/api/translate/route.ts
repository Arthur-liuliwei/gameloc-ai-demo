import { NextResponse } from "next/server";
import { aiDisabledApiResponse, isAiEnabledOnServer } from "@/lib/ai-deployment";
import { buildGlossaryAppliedBlock, normalizeGlossaryTerms, type NormalizedGlossaryTerm } from "@/lib/glossary-prompt-block";
import {
  buildRowConstraintPromptBlock,
  buildSharedPageContextBlock,
  measuredLength,
  overflowRiskForTranslation,
  type RowLocalizationMeta,
  EMPTY_ROW_META
} from "@/lib/localization-constraints";
import type {
  PeerTranslationPayload,
  RowConstraintsPayload,
  TranslateSegmentPayload,
  TranslateSuccessSegmentFeedback
} from "@/lib/translate-api-types";
import {
  buildTranslationPrompt,
  normalizePromptPresetId,
  PROMPT_PRESETS,
  type PromptPresetId
} from "@/lib/prompt-presets";

type TranslateRequestBody = {
  sourceText?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  /** @deprecated use promptPresetId */
  gameTone?: string;
  promptPresetId?: string;
  glossaryTerms?: Array<{
    source: string;
    target: string;
    priority?: NormalizedGlossaryTerm["priority"];
    category?: string;
  }>;
  /** Per-row localization metadata (constraints flow into the prompt). */
  rowConstraints?: RowConstraintsPayload;
  /**
   * Optional: strings on the same page / group so the model can mirror terminology.
   * Usually includes other rows on the same `pageId` with existing zh drafts.
   */
  sharedLocalizationPeers?: PeerTranslationPayload[];
  /**
   * Batch translate: multiple segments in one model call for consistency.
   * When present (length >= 1), `sourceText` is ignored for the primary payload.
   */
  segments?: TranslateSegmentPayload[];
};

type OpenAiResponsePayload = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: { message?: string };
};

function extractModelText(data: OpenAiResponsePayload): string {
  const fromOutputText = data.output_text?.trim();
  if (fromOutputText) return fromOutputText;

  const fromOutputContent = data.output
    ?.flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text ?? "")
    .join("\n")
    .trim();
  if (fromOutputContent) return fromOutputContent;

  const fromChoices = data.choices?.[0]?.message?.content?.trim();
  if (fromChoices) return fromChoices;

  return "";
}

function stripJsonFence(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  return t.trim();
}

function normalizeRowConstraints(raw: RowConstraintsPayload | undefined): RowLocalizationMeta {
  if (!raw) return { ...EMPTY_ROW_META };
  const lim = raw.characterLimit;
  return {
    pageId: String(raw.pageId ?? "").trim(),
    stringContext: String(raw.stringContext ?? "").trim(),
    uiComponent: String(raw.uiComponent ?? "").trim(),
    characterLimit: typeof lim === "number" && Number.isFinite(lim) && lim > 0 ? Math.floor(lim) : 0,
    constraintNotes: String(raw.constraintNotes ?? "").trim()
  };
}

function sourceContainsTerm(sourceText: string, termSource: string): boolean {
  return sourceText.toLowerCase().includes(termSource.toLowerCase());
}

function getEnforcedTargets(sourceText: string, terms: NormalizedGlossaryTerm[]): string[] {
  return terms
    .filter(
      (t) =>
        (t.priority === "Required" || t.priority === "Preferred") &&
        sourceContainsTerm(sourceText, t.source)
    )
    .map((t) => t.target);
}

function getForbiddenTargets(sourceText: string, terms: NormalizedGlossaryTerm[]): string[] {
  return terms
    .filter((t) => t.priority === "Forbidden" && sourceContainsTerm(sourceText, t.source))
    .map((t) => t.target);
}

async function callOpenAi(input: string, temperature: number): Promise<{ ok: boolean; text: string; error?: string }> {
  const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input,
      temperature
    })
  });
  const data = (await openAiResponse.json()) as OpenAiResponsePayload;
  if (!openAiResponse.ok) {
    return {
      ok: false,
      text: "",
      error: data.error?.message || "OpenAI request failed."
    };
  }
  const text = extractModelText(data);
  return { ok: true, text };
}

async function repairGlossaryTranslation(params: {
  sourceText: string;
  translatedText: string;
  enforcedTargets: string[];
  forbiddenTargets: string[];
}): Promise<string> {
  let translatedText = params.translatedText;
  const missingEnforced = translatedText
    ? params.enforcedTargets.filter((t) => !translatedText.includes(t))
    : params.enforcedTargets;
  const violatedForbidden = translatedText
    ? params.forbiddenTargets.filter((b) => translatedText.includes(b))
    : [];

  const needsRepair =
    translatedText && (missingEnforced.length > 0 || violatedForbidden.length > 0);

  if (!needsRepair || !translatedText) return translatedText;

  const repairPrompt = [
    "Revise the translation to satisfy glossary enforcement.",
    "Keep meaning, keep placeholders, keep natural player-facing Chinese tone.",
    "Return only the revised translated text. Do not add explanations.",
    "",
    `Original source text: ${params.sourceText}`,
    `Current translation: ${translatedText}`,
    missingEnforced.length
      ? `These glossary targets MUST appear: ${missingEnforced.join(", ")}`
      : "",
    violatedForbidden.length
      ? `These phrases MUST NOT appear: ${violatedForbidden.join(", ")}`
      : ""
  ]
    .filter(Boolean)
    .join("\n");

  const repair = await callOpenAi(repairPrompt, 0.1);
  if (repair.ok && repair.text.trim()) return repair.text.trim();
  return translatedText;
}

/** If over budget, one deterministic "shorten" pass (proactive, not QA-phase). */
async function shortenToFitBudget(params: {
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  presetLabel: string;
  meta: RowLocalizationMeta;
  glossaryTerms: NormalizedGlossaryTerm[];
}): Promise<string> {
  const limit = params.meta.characterLimit;
  if (!limit || limit <= 0) return params.translatedText;

  let text = params.translatedText;
  if (overflowRiskForTranslation(text, params.meta) !== "high") return text;

  const glossaryApplied = params.glossaryTerms
    .filter((t) => sourceContainsTerm(params.sourceText, t.source))
    .map((t) => `- [${t.priority}] ${t.source} => ${t.target}`)
    .join("\n");

  const prompt = [
    "You shorten an existing zh-CN game translation to satisfy a HARD length budget.",
    "Preserve placeholders exactly ({name}, %s, <br>, etc.).",
    "Keep Required/Preferred glossary targets that apply to the SOURCE (do not drop them).",
    "Do not add explanations. Return only the shortened translation text.",
    "",
    `Preset tone context: ${params.presetLabel}`,
    `Source (${params.sourceLanguage}): ${params.sourceText}`,
    `Current translation (${params.targetLanguage}): ${text}`,
    `Measured length now: ${measuredLength(text, params.meta)} — MUST be <= ${limit} (same counting rules as the client: CJK-only if notes demand it).`,
    params.meta.constraintNotes ? `Notes: ${params.meta.constraintNotes}` : "",
    "",
    "Relevant glossary rows:",
    glossaryApplied || "- (none)",
    ""
  ]
    .filter(Boolean)
    .join("\n");

  const res = await callOpenAi(prompt, 0.15);
  if (res.ok && res.text.trim()) return res.text.trim();
  return text;
}

async function fetchShorterAlternatives(params: {
  sourceText: string;
  translatedText: string;
  meta: RowLocalizationMeta;
}): Promise<string[]> {
  const limit = params.meta.characterLimit;
  if (!limit || limit <= 0) return [];

  const prompt = [
    "Return ONLY valid JSON (no markdown): {\"alternatives\":[\"...\",\"...\"]}.",
    "Provide 2-3 shorter zh-CN alternatives for a game UI string that is too long.",
    "Keep gameplay meaning; keep placeholders; max brevity.",
    "",
    `Source: ${params.sourceText}`,
    `Too-long translation: ${params.translatedText}`,
    `Target max length (same rules as counting Han vs display): ${limit}`,
    ""
  ].join("\n");

  const res = await callOpenAi(prompt, 0.3);
  if (!res.ok || !res.text) return [];
  try {
    const parsed = JSON.parse(stripJsonFence(res.text)) as { alternatives?: unknown };
    const arr = Array.isArray(parsed.alternatives) ? parsed.alternatives : [];
    return arr
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean)
      .slice(0, 3);
  } catch {
    return [];
  }
}

function buildSegmentFeedback(
  id: string,
  translatedText: string,
  meta: RowLocalizationMeta
): TranslateSuccessSegmentFeedback {
  const limit = meta.characterLimit > 0 ? meta.characterLimit : 0;
  const len = measuredLength(translatedText, meta);
  const risk = overflowRiskForTranslation(translatedText, meta);
  const warnings: string[] = [];
  if (limit > 0 && len > limit) {
    warnings.push(`Translation length ${len} exceeds hard limit ${limit} for [${id}].`);
  } else if (limit > 0 && len > Math.floor(limit * 0.85)) {
    warnings.push(`Translation length ${len} is close to the ${limit} character budget — verify UI fit.`);
  }
  return {
    id,
    overflowRisk: risk,
    measuredLength: len,
    characterLimit: limit,
    constraintWarnings: warnings,
    shorterAlternatives: []
  };
}

async function translateOneString(params: {
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  presetId: PromptPresetId;
  glossaryTerms: NormalizedGlossaryTerm[];
  rowMeta: RowLocalizationMeta;
  sharedPeersBlock: string;
}): Promise<{ translatedText: string; feedback: TranslateSuccessSegmentFeedback } | { error: string }> {
  const enforcedTargets = getEnforcedTargets(params.sourceText, params.glossaryTerms);
  const forbiddenTargets = getForbiddenTargets(params.sourceText, params.glossaryTerms);

  const constraintBlock = buildRowConstraintPromptBlock(params.rowMeta);
  const extras = [params.sharedPeersBlock, constraintBlock].filter(Boolean);

  const prompt = buildTranslationPrompt({
    sourceText: params.sourceText,
    sourceLanguage: params.sourceLanguage,
    targetLanguage: params.targetLanguage,
    presetId: params.presetId,
    glossaryTerms: params.glossaryTerms,
    extraInstructionBlocks: extras
  });

  const first = await callOpenAi(prompt, 0.2);
  if (!first.ok) return { error: first.error || "OpenAI error" };

  let translatedText = first.text.trim();
  if (!translatedText) {
    return { error: "OpenAI response did not contain translated text." };
  }

  translatedText = await repairGlossaryTranslation({
    sourceText: params.sourceText,
    translatedText,
    enforcedTargets,
    forbiddenTargets
  });

  translatedText = await shortenToFitBudget({
    sourceText: params.sourceText,
    translatedText,
    sourceLanguage: params.sourceLanguage,
    targetLanguage: params.targetLanguage,
    presetLabel: PROMPT_PRESETS[params.presetId]?.label ?? String(params.presetId),
    meta: params.rowMeta,
    glossaryTerms: params.glossaryTerms
  });

  translatedText = await repairGlossaryTranslation({
    sourceText: params.sourceText,
    translatedText,
    enforcedTargets,
    forbiddenTargets
  });

  const missingAfter = enforcedTargets.filter((t) => !translatedText.includes(t));
  if (missingAfter.length > 0) {
    return {
      error: `Glossary enforcement failed. Missing required/preferred terms: ${missingAfter.join(", ")}`
    };
  }
  const forbiddenStill = forbiddenTargets.filter((b) => translatedText.includes(b));
  if (forbiddenStill.length > 0) {
    return {
      error: `Glossary enforcement failed. Forbidden phrases still present: ${forbiddenStill.join(", ")}`
    };
  }

  const feedback = buildSegmentFeedback("single", translatedText, params.rowMeta);
  if (feedback.overflowRisk === "high" && params.rowMeta.characterLimit > 0) {
    feedback.shorterAlternatives = await fetchShorterAlternatives({
      sourceText: params.sourceText,
      translatedText,
      meta: params.rowMeta
    });
  }

  return { translatedText, feedback: { ...feedback, id: "single" } };
}

function peersToContextBlock(
  pageId: string,
  peers: PeerTranslationPayload[],
  activeIds: string[]
): string {
  const mapped = peers.map((p) => ({
    id: String(p.id ?? ""),
    sourceText: String(p.sourceText ?? "").trim(),
    aiTranslation: String(p.aiTranslation ?? "").trim(),
    finalTranslation: String(p.finalTranslation ?? "").trim(),
    meta: normalizeRowConstraints(p.rowConstraints)
  }));
  return buildSharedPageContextBlock({ pageId, peers: mapped, activeIds });
}

function parseBatchTranslationsJson(raw: string): { id: string; translatedText: string }[] {
  const cleaned = stripJsonFence(raw);
  const data = JSON.parse(cleaned) as unknown;
  if (!Array.isArray(data)) return [];
  const out: { id: string; translatedText: string }[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = typeof rec.id === "string" ? rec.id : "";
    const translatedText = typeof rec.translatedText === "string" ? rec.translatedText : "";
    if (id && translatedText.trim()) out.push({ id, translatedText: translatedText.trim() });
  }
  return out;
}

export async function POST(request: Request) {
  if (!isAiEnabledOnServer()) {
    return aiDisabledApiResponse();
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY. Please add it to your .env.local file." },
      { status: 500 }
    );
  }

  let body: TranslateRequestBody;
  try {
    body = (await request.json()) as TranslateRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const sourceLanguage = body.sourceLanguage?.trim() || "en-US";
  const targetLanguage = body.targetLanguage?.trim() || "zh-CN";
  const presetId: PromptPresetId = normalizePromptPresetId(body.promptPresetId ?? body.gameTone);
  const glossaryTerms = normalizeGlossaryTerms(body.glossaryTerms);
  const peersRaw = Array.isArray(body.sharedLocalizationPeers) ? body.sharedLocalizationPeers : [];

  const segmentsIn = Array.isArray(body.segments) ? body.segments : [];
  const useBatch = segmentsIn.length > 0;

  if (useBatch) {
    const segments = segmentsIn
      .map((s) => ({
        id: String(s.id ?? "").trim(),
        sourceText: String(s.sourceText ?? "").trim(),
        meta: normalizeRowConstraints(s.rowConstraints)
      }))
      .filter((s) => s.id && s.sourceText);

    if (segments.length === 0) {
      return NextResponse.json({ error: "segments must include id and sourceText." }, { status: 400 });
    }

    const activeIds = segments.map((s) => s.id);
    const dominantPage =
      segments.map((s) => s.meta.pageId).find((p) => p.trim().length > 0) || peersRaw[0]?.rowConstraints?.pageId || "";

    const sharedBlock =
      dominantPage.trim().length > 0
        ? peersToContextBlock(
            dominantPage.trim(),
            peersRaw.length > 0 ? peersRaw : segments.map((s) => ({ id: s.id, sourceText: s.sourceText })),
            activeIds
          )
        : "";

    const glossaryBlock = buildGlossaryAppliedBlock(glossaryTerms);
    const batchPromptParts: string[] = [
      `You translate ${segments.length} game UI strings in ONE response for naming and tone consistency.`,
      `Target language: ${targetLanguage}. Source language: ${sourceLanguage}.`,
      `Localization preset: ${PROMPT_PRESETS[presetId]?.label ?? String(presetId)}.`,
      "Preserve placeholders exactly. Observe glossary rows when the source contains the glossary source term.",
      "",
      "Glossary Applied (authoritative):",
      glossaryBlock,
      "",
      "Return ONLY a valid JSON array (no markdown, no commentary). Each element:",
      '{"id":"<same id>","translatedText":"<zh-CN>"}',
      "",
      sharedBlock,
      "",
      "--- SEGMENTS ---"
    ];

    for (const seg of segments) {
      batchPromptParts.push(
        "",
        `SEGMENT_ID: ${seg.id}`,
        buildRowConstraintPromptBlock(seg.meta),
        `SOURCE: ${seg.sourceText}`
      );
    }

    batchPromptParts.push("", "Remember: JSON array only.");

    const batchRes = await callOpenAi(batchPromptParts.join("\n"), 0.2);
    if (!batchRes.ok) {
      return NextResponse.json({ error: batchRes.error || "OpenAI batch failed." }, { status: 502 });
    }

    let pairs: { id: string; translatedText: string }[];
    try {
      pairs = parseBatchTranslationsJson(batchRes.text);
    } catch {
      return NextResponse.json(
        { error: "Could not parse batch JSON from the model. Try again or reduce batch size." },
        { status: 502 }
      );
    }

    const byId = new Map(pairs.map((p) => [p.id, p.translatedText]));
    const translations: { id: string; translatedText: string }[] = [];
    const segmentFeedback: TranslateSuccessSegmentFeedback[] = [];

    for (const seg of segments) {
      let text = byId.get(seg.id)?.trim() ?? "";
      if (!text) {
        return NextResponse.json(
          { error: `Batch missing translation for id ${seg.id}.` },
          { status: 502 }
        );
      }

      const enforcedTargets = getEnforcedTargets(seg.sourceText, glossaryTerms);
      const forbiddenTargets = getForbiddenTargets(seg.sourceText, glossaryTerms);

      text = await repairGlossaryTranslation({
        sourceText: seg.sourceText,
        translatedText: text,
        enforcedTargets,
        forbiddenTargets
      });

      text = await shortenToFitBudget({
        sourceText: seg.sourceText,
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        presetLabel: PROMPT_PRESETS[presetId]?.label ?? String(presetId),
        meta: seg.meta,
        glossaryTerms
      });

      text = await repairGlossaryTranslation({
        sourceText: seg.sourceText,
        translatedText: text,
        enforcedTargets,
        forbiddenTargets
      });

      const missingAfter = enforcedTargets.filter((t) => !text.includes(t));
      if (missingAfter.length > 0) {
        return NextResponse.json(
          {
            error: `Glossary enforcement failed for ${seg.id}. Missing: ${missingAfter.join(", ")}`
          },
          { status: 502 }
        );
      }
      const forbiddenStill = forbiddenTargets.filter((b) => text.includes(b));
      if (forbiddenStill.length > 0) {
        return NextResponse.json(
          { error: `Glossary enforcement failed for ${seg.id}. Forbidden still present.` },
          { status: 502 }
        );
      }

      const fb = buildSegmentFeedback(seg.id, text, seg.meta);
      if (fb.overflowRisk === "high" && seg.meta.characterLimit > 0) {
        fb.shorterAlternatives = await fetchShorterAlternatives({
          sourceText: seg.sourceText,
          translatedText: text,
          meta: seg.meta
        });
      }

      translations.push({ id: seg.id, translatedText: text });
      segmentFeedback.push({ ...fb, id: seg.id });
    }

    return NextResponse.json({ translations, segmentFeedback });
  }

  const sourceText = body.sourceText?.trim();
  if (!sourceText) {
    return NextResponse.json({ error: "sourceText is required." }, { status: 400 });
  }

  const rowMeta = normalizeRowConstraints(body.rowConstraints);
  const pageForPeers = rowMeta.pageId.trim() || peersRaw[0]?.rowConstraints?.pageId?.trim() || "";
  const sharedBlock =
    pageForPeers && peersRaw.length > 0 ? peersToContextBlock(pageForPeers, peersRaw, []) : "";

  try {
    const result = await translateOneString({
      sourceText,
      sourceLanguage,
      targetLanguage,
      presetId,
      glossaryTerms,
      rowMeta,
      sharedPeersBlock: sharedBlock
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({
      translatedText: result.translatedText,
      overflowRisk: result.feedback.overflowRisk,
      measuredLength: result.feedback.measuredLength,
      characterLimit: result.feedback.characterLimit,
      constraintWarnings: result.feedback.constraintWarnings,
      shorterAlternatives: result.feedback.shorterAlternatives
    });
  } catch {
    return NextResponse.json(
      { error: "Translation request failed. Please check your network and try again." },
      { status: 500 }
    );
  }
}
