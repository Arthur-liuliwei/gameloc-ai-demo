import { NextResponse } from "next/server";
import { aiDisabledApiResponse, isAiEnabledOnServer } from "@/lib/ai-deployment";
import {
  findForbiddenGlossaryInFinal,
  findGlossaryInconsistency,
  findLengthRisk,
  findMissingPlaceholders
} from "@/lib/qa-heuristics";
import { normalizePromptPresetId } from "@/lib/prompt-presets";
import type { QaCheckRequestBody, QaIssue, QaSeverity } from "@/lib/qa-check-types";

type OpenAiPayload = {
  output_text?: string;
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

function extractText(data: OpenAiPayload): string {
  const t = data.output_text?.trim();
  if (t) return t;
  const fromOut = data.output
    ?.flatMap((x) => x.content ?? [])
    .filter((x) => x.type === "output_text")
    .map((x) => x.text ?? "")
    .join("\n")
    .trim();
  if (fromOut) return fromOut;
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

function stripJsonFence(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  return s.trim();
}

function normalizeSeverity(s: unknown): QaSeverity {
  const v = String(s ?? "").toLowerCase();
  if (v === "high") return "High";
  if (v === "low") return "Low";
  return "Medium";
}

/** Turn model output into validated issue objects; drops malformed entries. */
function parseQaIssuesJson(raw: string): QaIssue[] {
  const cleaned = stripJsonFence(raw);
  const parsed = JSON.parse(cleaned) as unknown;
  if (!Array.isArray(parsed)) return [];
  const out: QaIssue[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const type = typeof o.type === "string" ? o.type : "Potential Mistranslation";
    const issue = typeof o.issue === "string" ? o.issue : "";
    const suggestedFix = typeof o.suggestedFix === "string" ? o.suggestedFix : "";
    if (!issue.trim()) continue;
    out.push({
      type,
      severity: normalizeSeverity(o.severity),
      issue: issue.trim(),
      suggestedFix: suggestedFix.trim() || "(No suggestion provided)"
    });
  }
  return out;
}

function buildAiQaPrompt(params: {
  sourceText: string;
  aiDraft: string;
  finalTranslation: string;
  targetLanguage: string;
  presetLabel: string;
  glossarySummary: string;
  heuristicSummary: string;
}): string {
  return [
    "You are an expert game localization QA reviewer.",
    "Analyze the translation triple (source, AI draft, human final) and report additional quality issues.",
    "Do NOT rewrite the translation. Only list problems and suggestions.",
    "",
    `Target language: ${params.targetLanguage}`,
    `Localization preset (tone context): ${params.presetLabel}`,
    "",
    "Already detected by automated checks (do not duplicate these unless you add new nuance):",
    params.heuristicSummary || "- (none)",
    "",
    "Relevant glossary rows for this source:",
    params.glossarySummary || "- (none)",
    "",
    "Focus your review on:",
    "- Awkward machine-translation tone or unnatural game phrasing in the FINAL string",
    "- Potential mistranslation vs source meaning (final vs source)",
    "- Whether AI draft and final diverge in a way that loses gameplay clarity",
    "- UI overflow / length risk only if the final looks too long for a typical mobile button without a numeric limit",
    "",
    "Return ONLY a valid JSON array (no markdown, no prose). Each element must be an object with exactly these string keys:",
    "type, severity, issue, suggestedFix",
    "",
    '"severity" must be one of: High, Medium, Low.',
    '"type" should be one of: "Machine Translation Tone", "Unnatural Game Phrasing", "Potential Mistranslation", "UI Length Risk", "Glossary Inconsistency", "Missing Placeholder", "Forbidden Glossary Term" — or a short custom label if none fit.',
    "",
    "If there are no additional issues beyond automated checks, return an empty JSON array: []",
    "",
    "--- SOURCE ---",
    params.sourceText,
    "",
    "--- AI DRAFT ---",
    params.aiDraft || "(empty)",
    "",
    "--- FINAL ---",
    params.finalTranslation
  ].join("\n");
}

export async function POST(request: Request) {
  if (!isAiEnabledOnServer()) {
    return aiDisabledApiResponse({ issues: [] });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY. Please add it to your .env.local file.", issues: [] },
      { status: 500 }
    );
  }

  let body: QaCheckRequestBody;
  try {
    body = (await request.json()) as QaCheckRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", issues: [] }, { status: 400 });
  }

  const sourceText = body.sourceText?.trim() ?? "";
  const aiDraft = body.aiDraft?.trim() ?? "";
  const finalTranslation = body.finalTranslation?.trim() ?? "";
  const targetLanguage = body.targetLanguage?.trim() || "zh-CN";
  const presetId = normalizePromptPresetId(body.promptPresetId ?? body.gameTone);
  const glossaryMatches = Array.isArray(body.glossaryMatches) ? body.glossaryMatches : [];
  const lengthLimit = typeof body.lengthLimit === "number" ? body.lengthLimit : undefined;

  if (!sourceText && !finalTranslation) {
    return NextResponse.json({ error: "Provide at least sourceText or finalTranslation.", issues: [] }, { status: 400 });
  }

  const matchShapes = glossaryMatches
    .filter((g) => g.sourceTerm?.trim() && g.targetTerm?.trim())
    .map((g) => ({
      sourceTerm: g.sourceTerm!.trim(),
      targetTerm: g.targetTerm!.trim(),
      priority: (g.priority ?? "Preferred") as "Preferred" | "Required" | "Forbidden"
    }));

  const heuristicIssues: QaIssue[] = [
    ...findMissingPlaceholders(sourceText, finalTranslation),
    ...findForbiddenGlossaryInFinal(sourceText, finalTranslation, matchShapes),
    ...findGlossaryInconsistency(sourceText, finalTranslation, matchShapes),
    ...findLengthRisk(finalTranslation, lengthLimit)
  ];

  const glossarySummary =
    matchShapes.length === 0
      ? ""
      : matchShapes
          .map((g) => `- [${g.priority}] ${g.sourceTerm} => ${g.targetTerm}`)
          .join("\n");

  const heuristicSummary =
    heuristicIssues.length === 0
      ? ""
      : heuristicIssues.map((h) => `- [${h.severity}] ${h.type}: ${h.issue}`).join("\n");

  const presetLabel =
    presetId === "aaa-cinematic"
      ? "AAA Cinematic"
      : presetId === "riot-moba"
        ? "Riot-style MOBA"
        : presetId === "fantasy-rpg"
          ? "Fantasy RPG"
          : "Casual Mobile";

  let aiIssues: QaIssue[] = [];
  try {
    const prompt = buildAiQaPrompt({
      sourceText,
      aiDraft,
      finalTranslation,
      targetLanguage,
      presetLabel,
      glossarySummary,
      heuristicSummary
    });

    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: prompt,
        temperature: 0.15
      })
    });

    const data = (await res.json()) as OpenAiPayload;
    if (!res.ok) {
      return NextResponse.json(
        {
          error: data.error?.message ?? "OpenAI QA request failed.",
          issues: heuristicIssues,
          meta: "Returned heuristic issues only; AI call failed."
        },
        { status: 200 }
      );
    }

    const raw = extractText(data);
    if (raw) {
      try {
        aiIssues = parseQaIssuesJson(raw);
      } catch {
        aiIssues = [];
      }
    }
  } catch {
    return NextResponse.json({
      issues: heuristicIssues,
      meta: "Returned heuristic issues only; network or parse error on AI step."
    });
  }

  const merged = [...heuristicIssues, ...aiIssues];
  return NextResponse.json({ issues: merged });
}
