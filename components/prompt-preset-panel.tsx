"use client";

import { useMemo, useState } from "react";
import type { GlossaryEntry } from "@/lib/glossary-types";
import { glossaryEntriesToNormalized } from "@/lib/glossary-prompt-block";
import {
  buildTranslationPromptPreview,
  getPresetList,
  GLOSSARY_RULES_SUMMARY,
  PLACEHOLDER_RULES_SUMMARY,
  PROMPT_PRESETS,
  type PromptPresetId
} from "@/lib/prompt-presets";

type PromptPresetPanelProps = {
  presetId: PromptPresetId;
  onPresetChange: (id: PromptPresetId) => void;
  glossaryEntries: GlossaryEntry[];
  /** Optional first line of real source for a more realistic preview */
  sampleSourceText?: string;
  /** Optional extra blocks (e.g. row constraints) appended in the preview prompt */
  extraPreviewBlocks?: string[];
};

export function PromptPresetPanel({
  presetId,
  onPresetChange,
  glossaryEntries,
  sampleSourceText,
  extraPreviewBlocks
}: PromptPresetPanelProps) {
  /** false = collapsed (default): prompt UI stays out of the way during translation work */
  const [expanded, setExpanded] = useState(false);

  const preset = PROMPT_PRESETS[presetId];
  const normalized = useMemo(() => glossaryEntriesToNormalized(glossaryEntries), [glossaryEntries]);

  const fullPromptPreview = useMemo(
    () =>
      buildTranslationPromptPreview({
        sourceLanguage: "en-US",
        targetLanguage: "zh-CN",
        presetId,
        glossaryTerms: normalized,
        sampleSourceText,
        extraInstructionBlocks: extraPreviewBlocks
      }),
    [presetId, normalized, sampleSourceText, extraPreviewBlocks]
  );

  return (
    <div
      className={`mb-4 rounded-xl border border-slate-800/90 bg-slate-900/35 transition-[padding] duration-200 ease-out ${
        expanded ? "p-3 shadow-sm shadow-black/20" : "p-2"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-transparent px-1 py-0.5 text-left transition-colors hover:border-slate-700/60 hover:bg-slate-950/40"
        aria-expanded={expanded}
      >
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Prompt Preset Settings
          </span>
          <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-200">
            [{preset.label}]
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="hidden text-[10px] text-slate-500 sm:inline">
            {expanded ? "Hide details" : "View prompt details"}
          </span>
          <svg
            className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ease-out ${
              expanded ? "rotate-180" : ""
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
          expanded ? "max-h-[2200px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        }`}
        aria-hidden={!expanded}
      >
        <div className="space-y-3 border-t border-slate-800/70 pt-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Preset</span>
            <select
              value={presetId}
              onChange={(e) => onPresetChange(e.target.value as PromptPresetId)}
              className="max-w-md rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-400/60"
            >
              {getPresetList().map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-500">
              Used for every AI Translate in this workspace (en-US → zh-CN).
            </span>
          </label>

          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 text-[10px] text-slate-400">
            <p className="font-medium text-slate-300">Glossary rules (summary)</p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed">{GLOSSARY_RULES_SUMMARY}</p>
            <p className="mt-2 font-medium text-slate-300">Placeholder preservation</p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed">{PLACEHOLDER_RULES_SUMMARY}</p>
          </div>

          <div className="space-y-1.5 rounded-lg border border-slate-800/90 bg-slate-950/40 p-2.5 text-[10px] leading-relaxed text-slate-400">
            <p>
              <span className="font-semibold text-slate-300">Translation philosophy:</span>{" "}
              {preset.translationPhilosophy}
            </p>
            <p>
              <span className="font-semibold text-slate-300">Intended game genre:</span> {preset.intendedGenre}
            </p>
            <p>
              <span className="font-semibold text-slate-300">Why wording style differs:</span>{" "}
              {preset.whyWordingDiffers}
            </p>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Generated prompt (API input)
            </p>
            <pre className="max-h-[min(380px,50vh)] overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-[10px] leading-relaxed text-slate-300 whitespace-pre-wrap">
              {fullPromptPreview}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
