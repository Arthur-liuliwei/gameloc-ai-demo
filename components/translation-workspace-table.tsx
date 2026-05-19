"use client";

import { useMemo, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { AddToGlossaryModal, type AddToGlossaryFormValues } from "@/components/add-to-glossary-modal";
import { PromptPresetPanel } from "@/components/prompt-preset-panel";
import { getGlossaryMatchesForSource, useGlossary } from "@/contexts/glossary-context";
import type { GlossaryEntry } from "@/lib/glossary-types";
import type { QaIssue } from "@/lib/qa-check-types";
import { DEFAULT_PROMPT_PRESET_ID, type PromptPresetId } from "@/lib/prompt-presets";
import {
  getTextOffsetsInElement,
  suggestTargetFromSourceSelection
} from "@/lib/suggest-target-from-source-selection";
import {
  buildRowConstraintPromptBlock,
  notesSuggestCjkOnly,
  overflowRiskForTranslation
} from "@/lib/localization-constraints";
import type { PeerTranslationPayload, RowConstraintsPayload } from "@/lib/translate-api-types";
import {
  WORKSPACE_INITIAL_ROWS,
  type FinalDeliveryStatus,
  type ReviewDecision,
  type WorkspaceRow
} from "@/lib/workspace-rows";
import {
  downloadGlossaryXlsx,
  downloadTranslationWorkspaceXlsx,
  filterRowsForTranslationExport,
  type TranslationExportScope
} from "@/lib/excel-export";
import { persistWorkspaceExportSnapshot } from "@/lib/workspace-export-snapshot";
import { DEMO_AI_DISABLED_MESSAGE, isDemoViewOnly } from "@/lib/demo-view-only";

type SelectionField = "source" | "ai" | "final";

type RowSnippetDraft = {
  sourceTerm?: string;
  targetTerm?: string;
  /** Character offsets in `row.sourceText` when selection was in Source */
  sourceOffsets?: { start: number; end: number };
};

type SelectionBubbleState = {
  rowId: string;
  field: SelectionField;
  left: number;
  top: number;
};

const FINAL_STATUS_OPTIONS: FinalDeliveryStatus[] = ["Draft", "In Review", "Approved", "Final", "Blocked"];
const REVIEW_DECISION_OPTIONS: ReviewDecision[] = ["Pending", "Approved", "Rejected", "Needs Revision"];

/** Build the API payload slice for row-level constraints (Day 8). */
function rowConstraintsPayload(row: WorkspaceRow): RowConstraintsPayload {
  return {
    pageId: row.pageId,
    stringContext: row.stringContext,
    uiComponent: row.uiComponent,
    characterLimit: row.characterLimit > 0 ? row.characterLimit : undefined,
    constraintNotes: row.constraintNotes
  };
}

/** All rows on a page — used as "peer strings" so the model can stay consistent. */
function peersOnPage(rows: WorkspaceRow[], pageId: string): PeerTranslationPayload[] {
  const p = pageId.trim();
  if (!p) return [];
  return rows
    .filter((r) => r.pageId.trim() === p)
    .map((r) => ({
      id: r.id,
      sourceText: r.sourceText,
      aiTranslation: r.aiTranslation,
      finalTranslation: r.finalTranslation,
      rowConstraints: rowConstraintsPayload(r)
    }));
}

function unionGlossaryHitsForPage(
  pageRows: WorkspaceRow[],
  glossaryEntries: GlossaryEntry[]
): GlossaryEntry[] {
  const map = new Map<string, GlossaryEntry>();
  for (const r of pageRows) {
    for (const h of getGlossaryMatchesForSource(r.sourceText, glossaryEntries)) {
      map.set(h.id, h);
    }
  }
  return [...map.values()];
}

function overflowBadgeForRow(row: WorkspaceRow) {
  const risk = overflowRiskForTranslation(row.aiTranslation, row);
  if (!row.characterLimit || row.characterLimit <= 0) {
    return { risk, show: false as const };
  }
  return { risk, show: true as const };
}

/** Compact metadata chips shown under Source in Card View. */
function LocalizationMetaChips({ row }: { row: WorkspaceRow }) {
  const chips: { key: string; label: string; title?: string }[] = [];
  if (row.pageId.trim()) chips.push({ key: "p", label: row.pageId.trim(), title: "Page ID" });
  if (row.stringContext.trim()) chips.push({ key: "c", label: row.stringContext.trim(), title: "String context" });
  if (row.uiComponent.trim()) chips.push({ key: "u", label: row.uiComponent.trim(), title: "UI component" });
  if (row.characterLimit > 0) {
    const cjk = notesSuggestCjkOnly(row.constraintNotes);
    chips.push({
      key: "l",
      label: cjk ? `Max ${row.characterLimit} CJK` : `Max ${row.characterLimit} chars`,
      title: row.constraintNotes || "Character limit"
    });
  }
  if (!chips.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {chips.map((c) => (
        <span
          key={c.key}
          title={c.title}
          className="inline-flex max-w-full truncate rounded border border-slate-700/90 bg-slate-900/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-300"
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}

/** Collapsible: other strings on the same Page ID + shared glossary + Translate Group. */
function PageConsistencyPanel({
  row,
  allRows,
  glossaryEntries,
  busy,
  onTranslateGroup,
  aiDisabled
}: {
  row: WorkspaceRow;
  allRows: WorkspaceRow[];
  glossaryEntries: GlossaryEntry[];
  busy: boolean;
  onTranslateGroup: (pageId: string) => void;
  aiDisabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pageId = row.pageId.trim();
  if (!pageId) {
    return (
      <p className="mt-2 text-[10px] text-slate-600">
        Set a <span className="text-slate-400">Page ID</span> on rows in mock data to enable grouped translation.
      </p>
    );
  }

  const pageRows = allRows.filter((r) => r.pageId.trim() === pageId && r.sourceText.trim().length > 0);
  const sharedHits = unionGlossaryHitsForPage(pageRows, glossaryEntries);
  const uniqueNotes = [...new Set(pageRows.map((r) => r.constraintNotes.trim()).filter(Boolean))];

  return (
    <div className="mt-2 rounded-lg border border-slate-800/80 bg-slate-950/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400 hover:bg-slate-900/60"
        aria-expanded={open}
      >
        <span>Page &amp; consistency</span>
        <span className="text-slate-600">{open ? "▼" : "▶"}</span>
      </button>
      {open ? (
        <div className="space-y-2 border-t border-slate-800/80 px-2 py-2 text-[11px] text-slate-400">
          <p>
            <span className="text-slate-500">Page ID:</span>{" "}
            <span className="font-mono text-cyan-200/90">{pageId}</span>
          </p>
          <p>
            <span className="text-slate-500">Related strings (with source):</span>{" "}
            <span className="text-slate-200">{pageRows.length}</span>
          </p>
          <div>
            <p className="mb-0.5 text-slate-500">Shared glossary hits (union of sources on this page)</p>
            {sharedHits.length ? (
              <ul className="list-inside list-disc text-slate-300">
                {sharedHits.slice(0, 8).map((h) => (
                  <li key={h.id} className="truncate">
                    {h.sourceTerm} → {h.targetTerm}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-600">None detected</p>
            )}
          </div>
          <div>
            <p className="mb-0.5 text-slate-500">Shared constraint notes</p>
            {uniqueNotes.length ? (
              <ul className="list-inside list-disc text-slate-300">
                {uniqueNotes.slice(0, 6).map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-600">—</p>
            )}
          </div>
          <button
            type="button"
            disabled={aiDisabled || busy || pageRows.length < 2}
            onClick={() => onTranslateGroup(pageId)}
            className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-[11px] font-medium text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            title={pageRows.length < 2 ? "Need at least two strings with source text on this page" : ""}
          >
            {busy ? "Translating group…" : "Translate Group (same Page ID)"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function finalStatusBadgeClass(status: FinalDeliveryStatus): string {
  if (status === "Final") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (status === "Approved") return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
  if (status === "In Review") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  if (status === "Blocked") return "border-rose-500/35 bg-rose-500/15 text-rose-200";
  return "border-slate-600 bg-slate-700/30 text-slate-200";
}

function reviewDecisionBadgeClass(d: ReviewDecision): string {
  if (d === "Approved") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (d === "Rejected") return "border-rose-500/35 bg-rose-500/15 text-rose-200";
  if (d === "Needs Revision") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-slate-600 bg-slate-700/30 text-slate-200";
}

function priorityMiniClass(p: string): string {
  if (p === "Required") return "border-rose-500/30 text-rose-200";
  if (p === "Forbidden") return "border-amber-500/30 text-amber-200";
  return "border-cyan-500/30 text-cyan-200";
}

/** Pass = no findings; Fail = any High severity; Warning = Medium/Low only. */
function aiQaRollup(issues: QaIssue[]): "pass" | "warning" | "fail" {
  if (issues.length === 0) return "pass";
  if (issues.some((i) => i.severity === "High")) return "fail";
  return "warning";
}

function aiQaRollupLabel(roll: "pass" | "warning" | "fail"): string {
  if (roll === "pass") return "Pass";
  if (roll === "fail") return "Fail";
  return "Warning";
}

function aiQaRollupBadgeClass(roll: "pass" | "warning" | "fail"): string {
  if (roll === "pass") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  if (roll === "fail") return "border-rose-500/40 bg-rose-500/15 text-rose-200";
  return "border-amber-500/40 bg-amber-500/10 text-amber-200";
}

function aiQaSeverityChipClass(sev: string): string {
  if (sev === "High") return "border-rose-500/40 bg-rose-500/10 text-rose-200";
  if (sev === "Low") return "border-slate-600 bg-slate-800/80 text-slate-300";
  return "border-amber-500/40 bg-amber-500/10 text-amber-200";
}

/** True if the AI draft string contains this glossary target (substring). */
function targetAppearsInAi(entry: GlossaryEntry, aiText: string): boolean {
  const t = entry.targetTerm.trim();
  if (!t) return false;
  return aiText.includes(t);
}

type GlossaryUiState = "found" | "missing" | "forbidden";

function glossaryUiState(h: GlossaryEntry, aiTranslation: string): GlossaryUiState {
  const hasAi = aiTranslation.trim().length > 0;
  const inAi = targetAppearsInAi(h, aiTranslation);
  if (h.priority === "Forbidden") {
    if (!hasAi) return "missing";
    return inAi ? "forbidden" : "found";
  }
  if (!hasAi) return "missing";
  return inAi ? "found" : "missing";
}

function GlossaryCheckSummary({ hits, aiTranslation }: { hits: GlossaryEntry[]; aiTranslation: string }) {
  let ok = 0;
  let warn = 0;
  let bad = 0;
  for (const h of hits) {
    const s = glossaryUiState(h, aiTranslation);
    if (s === "found") ok += 1;
    else if (s === "forbidden") bad += 1;
    else warn += 1;
  }
  const parts: string[] = [];
  if (ok) parts.push(`✓${ok}`);
  if (warn) parts.push(`⚠${warn}`);
  if (bad) parts.push(`✕${bad}`);
  return <span className="text-slate-500">{parts.length ? parts.join(" ") : "—"}</span>;
}

/** Compact glossary QA strip under AI draft (collapsible details). */
function GlossaryCheckPanel({ hits, aiTranslation }: { hits: GlossaryEntry[]; aiTranslation: string }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  if (hits.length === 0) {
    return (
      <div className="mt-2 border-t border-slate-800/80 pt-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Glossary Check</span>
        </div>
        <p className="text-[11px] text-slate-600">No glossary matches</p>
      </div>
    );
  }

  return (
    <div className="mt-2 border-t border-slate-800/80 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Glossary Check</span>
          <GlossaryCheckSummary hits={hits} aiTranslation={aiTranslation} />
        </div>
        <button
          type="button"
          onClick={toggle}
          className="shrink-0 text-[10px] font-medium text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
          aria-expanded={open}
        >
          {open ? "Hide details" : "Show Glossary Details"}
        </button>
      </div>

      {open ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {hits.map((h) => {
            if (h.priority === "Forbidden") {
              const state = glossaryUiState(h, aiTranslation);
              const end =
                state === "forbidden"
                  ? "✕ Forbidden detected"
                  : state === "missing"
                    ? "⚠ Missing"
                    : "✓ Found";
              const endClass =
                state === "forbidden"
                  ? "text-rose-400/90"
                  : state === "missing"
                    ? "text-amber-400/90"
                    : "text-emerald-400/90";
              return (
                <span
                  key={h.id}
                  className="inline-flex max-w-full items-center gap-1 truncate rounded border border-slate-700/90 bg-slate-900/70 px-1.5 py-0.5 text-[10px] text-slate-300"
                  title={h.notes || `Ban: ${h.targetTerm}`}
                >
                  <span className="text-slate-500">[{h.priority}]</span>
                  <span className="truncate text-slate-400">{h.sourceTerm}</span>
                  <span className="text-slate-600">—</span>
                  <span className="truncate text-slate-400">{h.targetTerm}</span>
                  <span className={`shrink-0 font-medium ${endClass}`}>{end}</span>
                </span>
              );
            }

            const state = glossaryUiState(h, aiTranslation);
            const end = state === "found" ? "✓ Found" : "⚠ Missing";
            const endClass = state === "found" ? "text-emerald-400/90" : "text-amber-400/90";

            return (
              <span
                key={h.id}
                className="inline-flex max-w-full items-center gap-1 truncate rounded border border-slate-700/90 bg-slate-900/70 px-1.5 py-0.5 text-[10px] text-slate-300"
                title={h.notes || h.category}
              >
                <span className="text-slate-500">[{h.priority}]</span>
                <span className="truncate text-slate-400">{h.sourceTerm}</span>
                <span className="text-slate-600">→</span>
                <span className="truncate text-cyan-200/80">{h.targetTerm}</span>
                <span className={`shrink-0 font-medium ${endClass}`}>{end}</span>
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function renderSourceWithHighlights(text: string, matches: ReturnType<typeof getGlossaryMatchesForSource>): ReactNode {
  if (!text.trim()) return <span className="text-slate-500">—</span>;
  if (matches.length === 0) {
    return <p className="whitespace-pre-wrap text-sm text-slate-200">{text}</p>;
  }
  const pattern = matches
    .map((m) => m.sourceTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .filter(Boolean)
    .join("|");
  if (!pattern) {
    return <p className="whitespace-pre-wrap text-sm text-slate-200">{text}</p>;
  }
  const re = new RegExp(`(${pattern})`, "gi");
  const parts = text.split(re);
  return (
    <p className="whitespace-pre-wrap text-sm text-slate-200">
      {parts.map((part, i) => {
        const hit = matches.find((m) => m.sourceTerm.toLowerCase() === part.toLowerCase());
        if (hit) {
          return (
            <mark
              key={`${i}-${part}`}
              className="rounded bg-cyan-500/15 px-0.5 text-cyan-100 ring-1 ring-cyan-500/25"
              title={`Glossary: ${hit.targetTerm}`}
            >
              {part}
            </mark>
          );
        }
        return <span key={`${i}-t`}>{part}</span>;
      })}
    </p>
  );
}

type WorkspaceView = "card" | "list";

export default function TranslationWorkspaceTable() {
  const demoViewOnly = isDemoViewOnly();
  const { entries: glossaryEntries, addEntry } = useGlossary();
  const [rows, setRows] = useState<WorkspaceRow[]>(WORKSPACE_INITIAL_ROWS);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("card");
  const [listSelectedIds, setListSelectedIds] = useState<Set<string>>(() => new Set());

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | FinalDeliveryStatus>("All");
  const [translatingById, setTranslatingById] = useState<Record<string, boolean>>({});
  const [translateErrorById, setTranslateErrorById] = useState<Record<string, string | undefined>>({});
  const [translateHintById, setTranslateHintById] = useState<Record<string, string | undefined>>({});
  const [promptPresetId, setPromptPresetId] = useState<PromptPresetId>(DEFAULT_PROMPT_PRESET_ID);
  /** Optional max character count for AI QA length heuristic (empty = disabled). */
  const [qaCharLimit, setQaCharLimit] = useState("");
  /** Which list bulk translate path is running (for clearer button labels). */
  const [listBulkTranslateMode, setListBulkTranslateMode] = useState<null | "sequential" | "shared">(null);
  /** When set, “Translate group” is running for every row on this Page ID. */
  const [groupTranslatingPageId, setGroupTranslatingPageId] = useState<string | null>(null);
  /** Last proactive constraint hints from /api/translate (warnings + shorter alternatives). */
  const [constraintExtrasById, setConstraintExtrasById] = useState<
    Record<string, { warnings: string[]; shorterAlternatives: string[] }>
  >({});
  /** Per-row AI QA findings from /api/qa-check (advisory; never auto-applied). */
  const [qaIssuesById, setQaIssuesById] = useState<Record<string, QaIssue[]>>({});
  const [qaLoadingById, setQaLoadingById] = useState<Record<string, boolean>>({});
  const [qaErrorById, setQaErrorById] = useState<Record<string, string | undefined>>({});

  /** Per string row: remembered terms from recent selections (source vs target columns). */
  const [snippetByRow, setSnippetByRow] = useState<Record<string, RowSnippetDraft>>({});
  const [selectionBubble, setSelectionBubble] = useState<SelectionBubbleState | null>(null);
  const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
  const [glossaryModalRowId, setGlossaryModalRowId] = useState<string | null>(null);
  const [glossaryFormVersion, setGlossaryFormVersion] = useState(0);
  const [translationExportScope, setTranslationExportScope] = useState<TranslationExportScope>("visible");
  const [exportToast, setExportToast] = useState<string | null>(null);

  const selectionRootsRef = useRef<
    Record<
      string,
      {
        source: HTMLElement | null;
        sourceTextarea: HTMLTextAreaElement | null;
        ai: HTMLElement | null;
        final: HTMLTextAreaElement | null;
      }
    >
  >({});

  function bindSelectionRoot(rowId: string) {
    if (!selectionRootsRef.current[rowId]) {
      selectionRootsRef.current[rowId] = {
        source: null,
        sourceTextarea: null,
        ai: null,
        final: null
      };
    }
    return selectionRootsRef.current[rowId];
  }

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch =
        row.id.toLowerCase().includes(searchText.toLowerCase()) ||
        row.sourceText.toLowerCase().includes(searchText.toLowerCase()) ||
        row.aiTranslation.toLowerCase().includes(searchText.toLowerCase()) ||
        row.finalTranslation.toLowerCase().includes(searchText.toLowerCase()) ||
        row.pageId.toLowerCase().includes(searchText.toLowerCase()) ||
        row.stringContext.toLowerCase().includes(searchText.toLowerCase()) ||
        row.uiComponent.toLowerCase().includes(searchText.toLowerCase());

      const matchesStatus = statusFilter === "All" || row.finalStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, searchText, statusFilter]);

  const filteredRowsRef = useRef(filteredRows);
  filteredRowsRef.current = filteredRows;

  useEffect(() => {
    persistWorkspaceExportSnapshot({
      rows,
      qaIssuesById,
      selectedIds: [...listSelectedIds]
    });
  }, [rows, qaIssuesById, listSelectedIds]);

  useEffect(() => {
    if (!exportToast) return;
    const t = setTimeout(() => setExportToast(null), 3500);
    return () => clearTimeout(t);
  }, [exportToast]);

  const promptSampleSource = useMemo(() => {
    const hit = rows.find((r) => r.sourceText.trim().length > 0);
    return hit?.sourceText.trim().slice(0, 280);
  }, [rows]);

  /** Optional: show how row constraints appear inside the preset preview panel. */
  const promptPreviewConstraintBlock = useMemo(() => {
    const hit = rows.find((r) => r.pageId.trim() || r.characterLimit > 0 || r.constraintNotes.trim());
    if (!hit) return undefined;
    return buildRowConstraintPromptBlock(hit);
  }, [rows]);

  const listSelectAllRef = useRef<HTMLInputElement>(null);

  const allFilteredSelected =
    filteredRows.length > 0 && filteredRows.every((r) => listSelectedIds.has(r.id));
  const someFilteredSelected = filteredRows.some((r) => listSelectedIds.has(r.id));

  useEffect(() => {
    const el = listSelectAllRef.current;
    if (!el) return;
    el.indeterminate = someFilteredSelected && !allFilteredSelected;
  }, [someFilteredSelected, allFilteredSelected]);

  function toggleListRowSelected(id: string) {
    setListSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setListSelectedIds(new Set(filteredRows.map((r) => r.id)));
  }

  function clearListSelection() {
    setListSelectedIds(new Set());
  }

  function toggleSelectAllFiltered() {
    setListSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredRows.forEach((r) => next.delete(r.id));
      } else {
        filteredRows.forEach((r) => next.add(r.id));
      }
      return next;
    });
  }

  function updateFinalTranslation(id: string, value: string) {
    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.id !== id) return row;
        if (row.finalTranslation === value) return row;
        const deliveryWasLocked =
          row.finalStatus === "Final" || row.finalStatus === "Approved" || row.finalStatus === "Blocked";
        return {
          ...row,
          finalTranslation: value,
          reviewDecision: "Needs Revision",
          finalStatus: deliveryWasLocked ? "In Review" : row.finalStatus
        };
      })
    );
  }

  function updateReviewerNotes(id: string, value: string) {
    setRows((prevRows) =>
      prevRows.map((row) => (row.id === id ? { ...row, reviewerNotes: value } : row))
    );
  }

  function applyReviewDecision(id: string, decision: ReviewDecision) {
    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.id !== id) return row;
        if (decision === "Approved") {
          return { ...row, reviewDecision: "Approved", finalStatus: "Approved" };
        }
        if (decision === "Rejected") {
          return { ...row, reviewDecision: "Rejected", finalStatus: "Blocked" };
        }
        if (decision === "Needs Revision") {
          return { ...row, reviewDecision: "Needs Revision", finalStatus: "In Review" };
        }
        return { ...row, reviewDecision: "Pending" };
      })
    );
  }

  function applyFinalStatusOnly(id: string, status: FinalDeliveryStatus) {
    setRows((prevRows) =>
      prevRows.map((row) => (row.id === id ? { ...row, finalStatus: status } : row))
    );
  }

  function updateSourceText(id: string, value: string) {
    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.id !== id) return row;
        return { ...row, sourceText: value };
      })
    );
  }

  const translatingByIdRef = useRef(translatingById);
  translatingByIdRef.current = translatingById;

  const qaLoadingRef = useRef(qaLoadingById);
  qaLoadingRef.current = qaLoadingById;

  const handleAiTranslate = useCallback(
    async (row: WorkspaceRow) => {
      if (demoViewOnly) {
        setTranslateErrorById((prev) => ({ ...prev, [row.id]: DEMO_AI_DISABLED_MESSAGE }));
        return;
      }
      if (translatingByIdRef.current[row.id]) return;
      if (!row.sourceText.trim()) {
        setTranslateErrorById((prev) => ({
          ...prev,
          [row.id]: "Please paste source text first, then click AI Translate."
        }));
        setTranslateHintById((prev) => ({ ...prev, [row.id]: undefined }));
        return;
      }

      setTranslatingById((prev) => ({ ...prev, [row.id]: true }));
      setTranslateErrorById((prev) => ({ ...prev, [row.id]: undefined }));
      setTranslateHintById((prev) => ({ ...prev, [row.id]: undefined }));
      setConstraintExtrasById((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });

      try {
        const peers = peersOnPage(rowsRef.current, row.pageId).filter((p) => p.id !== row.id);

        const response = await fetch("/api/translate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            sourceText: row.sourceText,
            sourceLanguage: "en-US",
            targetLanguage: "zh-CN",
            promptPresetId,
            rowConstraints: rowConstraintsPayload(row),
            sharedLocalizationPeers: peers,
            glossaryTerms: glossaryEntries.map((item) => ({
              source: item.sourceTerm,
              target: item.targetTerm,
              priority: item.priority,
              category: item.category
            }))
          })
        });

        const data = (await response.json()) as {
          translatedText?: string;
          error?: string;
          constraintWarnings?: string[];
          shorterAlternatives?: string[];
        };

        if (!response.ok || !data.translatedText) {
          setTranslateErrorById((prev) => ({
            ...prev,
            [row.id]:
              data.error ||
              "Unable to translate this row right now. Please check API key and try again."
          }));
          return;
        }

        const hadHumanFinalBeforeTranslate = row.finalTranslation.trim().length > 0;

        setRows((prevRows) =>
          prevRows.map((item) => {
            if (item.id !== row.id) return item;

            const hasHumanFinal = item.finalTranslation.trim().length > 0;
            const nextFinalTranslation = hasHumanFinal ? item.finalTranslation : (data.translatedText as string);

            return {
              ...item,
              aiTranslation: data.translatedText as string,
              finalTranslation: nextFinalTranslation,
              finalStatus: "In Review",
              reviewDecision: "Pending"
            };
          })
        );

        setConstraintExtrasById((prev) => ({
          ...prev,
          [row.id]: {
            warnings: Array.isArray(data.constraintWarnings) ? data.constraintWarnings : [],
            shorterAlternatives: Array.isArray(data.shorterAlternatives) ? data.shorterAlternatives : []
          }
        }));

        setTranslateHintById((prev) => ({
          ...prev,
          [row.id]: hadHumanFinalBeforeTranslate
            ? "Final translation already contains reviewer edits. Apply manually if needed."
            : "AI draft auto-filled into final translation for review."
        }));
      } catch {
        setTranslateErrorById((prev) => ({
          ...prev,
          [row.id]: "Request failed. Please check your network and try again."
        }));
        setTranslateHintById((prev) => ({ ...prev, [row.id]: undefined }));
      } finally {
        setTranslatingById((prev) => ({ ...prev, [row.id]: false }));
      }
    },
    [demoViewOnly, glossaryEntries, promptPresetId]
  );

  type BatchTranslateResponse = {
    translations?: { id: string; translatedText: string }[];
    segmentFeedback?: {
      id: string;
      constraintWarnings?: string[];
      shorterAlternatives?: string[];
    }[];
    error?: string;
  };

  /** One OpenAI call with multiple segments + shared page peers (consistency-aware). */
  const runBatchTranslateForRows = useCallback(
    async (segmentRows: WorkspaceRow[]): Promise<BatchTranslateResponse | null> => {
      if (demoViewOnly) {
        return { error: DEMO_AI_DISABLED_MESSAGE };
      }
      const clean = segmentRows.filter((r) => r.sourceText.trim().length > 0);
      if (clean.length === 0) return null;

      const pageIds = [...new Set(clean.map((r) => r.pageId.trim()).filter(Boolean))];
      const peerRows =
        pageIds.length > 0
          ? rowsRef.current.filter((r) => pageIds.includes(r.pageId.trim()) && r.pageId.trim().length > 0)
          : clean;

      const peersPayload: PeerTranslationPayload[] = peerRows.map((r) => ({
        id: r.id,
        sourceText: r.sourceText,
        aiTranslation: r.aiTranslation,
        finalTranslation: r.finalTranslation,
        rowConstraints: rowConstraintsPayload(r)
      }));

      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segments: clean.map((r) => ({
            id: r.id,
            sourceText: r.sourceText,
            rowConstraints: rowConstraintsPayload(r)
          })),
          sharedLocalizationPeers: peersPayload,
          sourceLanguage: "en-US",
          targetLanguage: "zh-CN",
          promptPresetId,
          glossaryTerms: glossaryEntries.map((item) => ({
            source: item.sourceTerm,
            target: item.targetTerm,
            priority: item.priority,
            category: item.category
          }))
        })
      });

      const data = (await response.json()) as BatchTranslateResponse;
      if (!response.ok) {
        return { error: data.error || "Batch translate failed." };
      }
      return data;
    },
    [demoViewOnly, glossaryEntries, promptPresetId]
  );

  const handleTranslateGroupForPage = useCallback(
    async (pageId: string) => {
      const pageRows = rowsRef.current.filter((r) => r.pageId.trim() === pageId && r.sourceText.trim());
      if (pageRows.length < 2) return;

      setGroupTranslatingPageId(pageId);
      setTranslateErrorById((prev) => {
        const next = { ...prev };
        pageRows.forEach((r) => {
          next[r.id] = undefined;
        });
        return next;
      });

      setTranslatingById((prev) => {
        const n = { ...prev };
        pageRows.forEach((r) => {
          n[r.id] = true;
        });
        return n;
      });

      try {
        const data = await runBatchTranslateForRows(pageRows);
        if (!data || data.error || !data.translations?.length) {
          const msg = data?.error || "Group translate failed.";
          setTranslateErrorById((prev) => {
            const next = { ...prev };
            pageRows.forEach((r) => {
              next[r.id] = msg;
            });
            return next;
          });
          return;
        }

        const byId = new Map(data.translations.map((t) => [t.id, t.translatedText]));
        setRows((prev) =>
          prev.map((row) => {
            if (!byId.has(row.id)) return row;
            const text = byId.get(row.id) as string;
            const hasHumanFinal = row.finalTranslation.trim().length > 0;
            return {
              ...row,
              aiTranslation: text,
              finalTranslation: hasHumanFinal ? row.finalTranslation : text,
              finalStatus: "In Review",
              reviewDecision: "Pending"
            };
          })
        );

        setConstraintExtrasById((prev) => {
          const next = { ...prev };
          for (const fb of data.segmentFeedback ?? []) {
            next[fb.id] = {
              warnings: fb.constraintWarnings ?? [],
              shorterAlternatives: fb.shorterAlternatives ?? []
            };
          }
          return next;
        });
      } catch {
        setTranslateErrorById((prev) => {
          const next = { ...prev };
          pageRows.forEach((r) => {
            next[r.id] = "Network error during group translate.";
          });
          return next;
        });
      } finally {
        setGroupTranslatingPageId(null);
        setTranslatingById((prev) => {
          const n = { ...prev };
          pageRows.forEach((r) => {
            n[r.id] = false;
          });
          return n;
        });
      }
    },
    [runBatchTranslateForRows]
  );

  const handleTranslateSelectedSharedContext = useCallback(async () => {
    const selected = [...listSelectedIds]
      .map((id) => rowsRef.current.find((r) => r.id === id))
      .filter((r): r is WorkspaceRow => Boolean(r && r.sourceText.trim()));
    if (selected.length === 0) return;

    setTranslatingById((prev) => {
      const n = { ...prev };
      selected.forEach((r) => {
        n[r.id] = true;
      });
      return n;
    });

    setListBulkTranslateMode("shared");
    try {
      const data = await runBatchTranslateForRows(selected);
      if (!data || data.error || !data.translations?.length) {
        const msg = data?.error || "Shared-context batch failed.";
        setTranslateErrorById((prev) => {
          const next = { ...prev };
          selected.forEach((r) => {
            next[r.id] = msg;
          });
          return next;
        });
        return;
      }

      const byId = new Map(data.translations.map((t) => [t.id, t.translatedText]));
      setRows((prev) =>
        prev.map((row) => {
          if (!byId.has(row.id)) return row;
          const text = byId.get(row.id) as string;
          const hasHumanFinal = row.finalTranslation.trim().length > 0;
          return {
            ...row,
            aiTranslation: text,
            finalTranslation: hasHumanFinal ? row.finalTranslation : text,
            finalStatus: "In Review",
            reviewDecision: "Pending"
          };
        })
      );

      setConstraintExtrasById((prev) => {
        const next = { ...prev };
        for (const fb of data.segmentFeedback ?? []) {
          next[fb.id] = {
            warnings: fb.constraintWarnings ?? [],
            shorterAlternatives: fb.shorterAlternatives ?? []
          };
        }
        return next;
      });
    } catch {
      setTranslateErrorById((prev) => {
        const next = { ...prev };
        selected.forEach((r) => {
          next[r.id] = "Network error during shared-context translate.";
        });
        return next;
      });
    } finally {
      setListBulkTranslateMode(null);
      setTranslatingById((prev) => {
        const n = { ...prev };
        selected.forEach((r) => {
          n[r.id] = false;
        });
        return n;
      });
    }
  }, [listSelectedIds, runBatchTranslateForRows]);

  const handleBatchAiTranslateSelected = useCallback(async () => {
    const ids = [...listSelectedIds].filter((id) => {
      const r = rowsRef.current.find((x) => x.id === id);
      return r && r.sourceText.trim().length > 0;
    });
    setListBulkTranslateMode("sequential");
    try {
      for (const id of ids) {
        const r = rowsRef.current.find((x) => x.id === id);
        if (r) await handleAiTranslate(r);
      }
    } finally {
      setListBulkTranslateMode(null);
    }
  }, [listSelectedIds, handleAiTranslate]);

  const handleApplyAiDraftToEmptyFinalsSelected = useCallback(() => {
    setRows((prev) =>
      prev.map((row) => {
        if (!listSelectedIds.has(row.id)) return row;
        if (row.finalTranslation.trim().length > 0) return row;
        if (!row.aiTranslation.trim()) return row;
        return {
          ...row,
          finalTranslation: row.aiTranslation,
          finalStatus: "In Review",
          reviewDecision: "Pending"
        };
      })
    );
  }, [listSelectedIds]);

  const handleMarkSelectedApproved = useCallback(() => {
    setRows((prev) =>
      prev.map((row) =>
        listSelectedIds.has(row.id)
          ? { ...row, reviewDecision: "Approved" as const, finalStatus: "Approved" as const }
          : row
      )
    );
  }, [listSelectedIds]);

  const handleMarkSelectedNeedsRevision = useCallback(() => {
    setRows((prev) =>
      prev.map((row) =>
        listSelectedIds.has(row.id)
          ? { ...row, reviewDecision: "Needs Revision" as const, finalStatus: "In Review" as const }
          : row
      )
    );
  }, [listSelectedIds]);

  const handleMarkSelectedFinal = useCallback(() => {
    setRows((prev) =>
      prev.map((row) =>
        listSelectedIds.has(row.id)
          ? { ...row, reviewDecision: "Approved" as const, finalStatus: "Final" as const }
          : row
      )
    );
  }, [listSelectedIds]);

  /** Calls /api/qa-check for one row; results are advisory only (translations are not modified). */
  const runSingleRowQa = useCallback(
    async (row: WorkspaceRow) => {
      if (demoViewOnly) {
        setQaErrorById((prev) => ({ ...prev, [row.id]: DEMO_AI_DISABLED_MESSAGE }));
        return;
      }
      if (qaLoadingRef.current[row.id]) return;
      setQaLoadingById((prev) => ({ ...prev, [row.id]: true }));
      setQaErrorById((prev) => ({ ...prev, [row.id]: undefined }));
      const hits = getGlossaryMatchesForSource(row.sourceText, glossaryEntries);
      const parsedGlobal = qaCharLimit.trim() === "" ? NaN : Number(qaCharLimit);
      const globalLimit =
        typeof parsedGlobal === "number" && Number.isFinite(parsedGlobal) && parsedGlobal > 0
          ? Math.floor(parsedGlobal)
          : undefined;
      const lengthLimit =
        row.characterLimit > 0 ? row.characterLimit : globalLimit;
      try {
        const res = await fetch("/api/qa-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceText: row.sourceText,
            aiDraft: row.aiTranslation,
            finalTranslation: row.finalTranslation,
            targetLanguage: "zh-CN",
            promptPresetId,
            glossaryMatches: hits.map((h) => ({
              id: h.id,
              sourceTerm: h.sourceTerm,
              targetTerm: h.targetTerm,
              priority: h.priority,
              category: h.category
            })),
            lengthLimit
          })
        });
        const data = (await res.json()) as { issues?: QaIssue[]; error?: string };
        if (!res.ok) {
          setQaErrorById((prev) => ({ ...prev, [row.id]: data.error || "QA check failed." }));
          setQaIssuesById((prev) => ({ ...prev, [row.id]: [] }));
          return;
        }
        setQaIssuesById((prev) => ({ ...prev, [row.id]: data.issues ?? [] }));
      } catch {
        setQaErrorById((prev) => ({ ...prev, [row.id]: "Network error during QA check." }));
        setQaIssuesById((prev) => ({ ...prev, [row.id]: [] }));
      } finally {
        setQaLoadingById((prev) => ({ ...prev, [row.id]: false }));
      }
    },
    [demoViewOnly, glossaryEntries, promptPresetId, qaCharLimit]
  );

  const handleRunQaSelected = useCallback(async () => {
    const ids = [...listSelectedIds];
    for (const id of ids) {
      const row = rowsRef.current.find((r) => r.id === id);
      if (row) await runSingleRowQa(row);
    }
  }, [listSelectedIds, runSingleRowQa]);

  useEffect(() => {
    function resolveElement(node: Node | null): Element | null {
      if (!node) return null;
      return node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
    }

    function onMouseUp(ev: MouseEvent) {
      const target = ev.target as HTMLElement | null;
      if (target?.closest?.("[data-glossary-action]")) return;
      if (target?.closest?.("[data-glossary-modal]")) return;

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setSelectionBubble(null);
        return;
      }

      const text = sel.toString().replace(/\u00a0/g, " ").trim();
      if (!text) {
        setSelectionBubble(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const anchorEl = resolveElement(range.commonAncestorContainer);
      if (!anchorEl) return;

      for (const row of filteredRowsRef.current) {
        const roots = selectionRootsRef.current[row.id];
        if (!roots) continue;

        let field: SelectionField | null = null;
        if (roots.source && (roots.source === anchorEl || roots.source.contains(anchorEl))) {
          field = "source";
        } else if (roots.ai && (roots.ai === anchorEl || roots.ai.contains(anchorEl))) {
          field = "ai";
        } else if (roots.final && anchorEl.closest("textarea") === roots.final) {
          field = "final";
        }

        if (!field) continue;

        const rect = range.getBoundingClientRect();
        const edge = 8;
        const left = Math.max(edge, Math.min(rect.left, window.innerWidth - 200));
        const top = Math.min(rect.bottom + edge, window.innerHeight - 44);

        setSnippetByRow((prev) => {
          const cur = prev[row.id] ?? {};
          if (field === "source") {
            const roots = selectionRootsRef.current[row.id];
            let sourceOffsets: { start: number; end: number } | undefined;
            if (roots?.sourceTextarea && (roots.sourceTextarea === anchorEl || roots.sourceTextarea.contains(anchorEl))) {
              const a = roots.sourceTextarea.selectionStart;
              const b = roots.sourceTextarea.selectionEnd;
              if (b > a) sourceOffsets = { start: a, end: b };
            } else if (roots?.source) {
              const domOff = getTextOffsetsInElement(roots.source, range);
              if (domOff && domOff.end > domOff.start) sourceOffsets = domOff;
            }
            const next: RowSnippetDraft = { ...cur, sourceTerm: text };
            if (sourceOffsets) next.sourceOffsets = sourceOffsets;
            return { ...prev, [row.id]: next };
          }
          return { ...prev, [row.id]: { ...cur, targetTerm: text } };
        });

        setSelectionBubble({ rowId: row.id, field, left, top });
        return;
      }

      setSelectionBubble(null);
    }

    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, []);

  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelectionBubble(null);
      }
    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  const openGlossaryModal = useCallback((rowId: string) => {
    setGlossaryModalRowId(rowId);
    setGlossaryFormVersion((v) => v + 1);
    setGlossaryModalOpen(true);
    setSelectionBubble(null);
  }, []);

  const handleSaveGlossaryEntry = useCallback(
    (values: AddToGlossaryFormValues) => {
      addEntry({
        sourceTerm: values.sourceTerm,
        targetTerm: values.targetTerm,
        category: values.category,
        notes: values.notes,
        priority: values.priority
      });
      const id = glossaryModalRowId;
      if (id) {
        setSnippetByRow((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
      setGlossaryModalOpen(false);
      setGlossaryModalRowId(null);
    },
    [addEntry, glossaryModalRowId]
  );

  const closeGlossaryModal = useCallback(() => {
    setGlossaryModalOpen(false);
    setGlossaryModalRowId(null);
  }, []);

  const applyShorterAlternativeToAiDraft = useCallback((rowId: string, text: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              aiTranslation: text,
              finalStatus: "In Review",
              reviewDecision: "Needs Revision"
            }
          : r
      )
    );
  }, []);

  const modalRow = glossaryModalRowId
    ? rows.find((r) => r.id === glossaryModalRowId) ?? null
    : null;

  const modalTargetPrefill = useMemo(() => {
    const empty = {
      initialSourceTerm: "",
      initialTargetTerm: "",
      targetTermHint: null as "auto" | "no-match" | null
    };
    if (!glossaryModalOpen || !modalRow) return empty;

    const snippet = snippetByRow[modalRow.id];
    const manualTarget = snippet?.targetTerm?.trim() ?? "";
    if (manualTarget) {
      return {
        initialSourceTerm: snippet?.sourceTerm?.trim() ?? "",
        initialTargetTerm: manualTarget,
        targetTermHint: null
      };
    }
    const sourcePick = snippet?.sourceTerm?.trim() ?? "";
    if (!sourcePick) {
      return empty;
    }

    const src = modalRow.sourceText;
    let selStart = snippet?.sourceOffsets?.start;
    let selEnd = snippet?.sourceOffsets?.end;
    if (
      (typeof selStart !== "number" || typeof selEnd !== "number" || selEnd <= selStart) &&
      src.length > 0
    ) {
      const idx = src.indexOf(sourcePick);
      if (idx >= 0) {
        selStart = idx;
        selEnd = idx + sourcePick.length;
      }
    }

    if (typeof selStart !== "number" || typeof selEnd !== "number" || selEnd <= selStart || !src.length) {
      return {
        initialSourceTerm: sourcePick,
        initialTargetTerm: "",
        targetTermHint: "no-match" as const
      };
    }

    const sug = suggestTargetFromSourceSelection(
      src,
      selStart,
      selEnd,
      modalRow.finalTranslation,
      modalRow.aiTranslation
    );
    if (sug) {
      return {
        initialSourceTerm: sourcePick,
        initialTargetTerm: sug.text,
        targetTermHint: "auto" as const
      };
    }
    return {
      initialSourceTerm: sourcePick,
      initialTargetTerm: "",
      targetTermHint: "no-match" as const
    };
  }, [glossaryModalOpen, modalRow, snippetByRow, glossaryFormVersion]);

  const listSelectedTranslatingBusy = useMemo(
    () => [...listSelectedIds].some((id) => translatingById[id]),
    [listSelectedIds, translatingById]
  );

  const listQaBusy = useMemo(
    () => [...listSelectedIds].some((id) => qaLoadingById[id]),
    [listSelectedIds, qaLoadingById]
  );

  const selectedRowsCanTranslate = useMemo(
    () =>
      [...listSelectedIds].some((id) => {
        const r = rows.find((x) => x.id === id);
        return Boolean(r?.sourceText.trim());
      }),
    [listSelectedIds, rows]
  );

  const selectedRowsCanApplyAiEmpty = useMemo(
    () =>
      [...listSelectedIds].some((id) => {
        const r = rows.find((x) => x.id === id);
        return Boolean(r && !r.finalTranslation.trim() && r.aiTranslation.trim());
      }),
    [listSelectedIds, rows]
  );

  const handleExportTranslationExcel = useCallback(() => {
    const picked = filterRowsForTranslationExport(
      filteredRows,
      listSelectedIds,
      translationExportScope
    );
    if (picked.length === 0) {
      setExportToast("No rows match this export filter.");
      return;
    }
    downloadTranslationWorkspaceXlsx(picked, qaIssuesById);
    setExportToast(
      `Downloaded GameLocAI_TranslationWorkspace.xlsx (${picked.length} row${picked.length === 1 ? "" : "s"}).`
    );
  }, [filteredRows, listSelectedIds, translationExportScope, qaIssuesById]);

  const handleExportGlossaryExcel = useCallback(() => {
    if (glossaryEntries.length === 0) {
      setExportToast("Glossary has no entries to export.");
      return;
    }
    downloadGlossaryXlsx(glossaryEntries);
    setExportToast(
      `Downloaded GameLocAI_Glossary.xlsx (${glossaryEntries.length} entr${glossaryEntries.length === 1 ? "y" : "ies"}).`
    );
  }, [glossaryEntries]);

  return (
    <section className="gl-panel">
      {exportToast ? (
        <div className="gl-toast mb-4" role="status">
          {exportToast}
        </div>
      ) : null}
      <div className="mb-4 grid w-full grid-cols-1 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-x-4">
        <h2 className="gl-heading-section leading-tight sm:justify-self-start">Localized Strings</h2>
        <div className="flex justify-center sm:justify-self-center">
          <div className="gl-segmented" role="group" aria-label="Workspace layout">
            <button
              type="button"
              onClick={() => setWorkspaceView("card")}
              className={`gl-segmented-item ${workspaceView === "card" ? "gl-segmented-item-active" : ""}`}
            >
              Card View
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceView("list")}
              className={`gl-segmented-item ${workspaceView === "list" ? "gl-segmented-item-active" : ""}`}
            >
              List View
            </button>
          </div>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:justify-self-end sm:justify-end">
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search by ID or text..."
            className="gl-input min-w-0 flex-1 sm:max-w-[min(100%,240px)] sm:flex-initial"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "All" | FinalDeliveryStatus)}
            className="gl-select w-full shrink-0 sm:w-auto"
          >
            <option value="All">All delivery statuses</option>
            {FINAL_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="gl-mini-stat">
          <p className="gl-mini-stat-label">Visible strings</p>
          <p className="gl-mini-stat-value text-slate-100">{filteredRows.length}</p>
        </div>
        <div className="gl-mini-stat">
          <p className="gl-mini-stat-label">In review (delivery)</p>
          <p className="gl-mini-stat-value text-amber-200">
            {filteredRows.filter((row) => row.finalStatus === "In Review").length}
          </p>
        </div>
        <div className="gl-mini-stat">
          <p className="gl-mini-stat-label">Shipped (Final)</p>
          <p className="gl-mini-stat-value text-emerald-200">
            {filteredRows.filter((row) => row.finalStatus === "Final").length}
          </p>
        </div>
        <div className="gl-mini-stat">
          <p className="gl-mini-stat-label">Glossary entries</p>
          <p className="gl-mini-stat-value text-cyan-200">{glossaryEntries.length}</p>
        </div>
      </div>

      <div className="gl-subpanel mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Excel export
          </span>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <span className="text-slate-500">Rows</span>
            <select
              value={translationExportScope}
              onChange={(e) => setTranslationExportScope(e.target.value as TranslationExportScope)}
              className="gl-select max-w-[11rem] py-1.5 text-xs"
            >
              <option value="visible">All visible</option>
              <option value="selected">Selected only</option>
              <option value="approved">Approved (review) only</option>
              <option value="final">Final (delivery) only</option>
            </select>
          </label>
          <button
            type="button"
            onClick={handleExportTranslationExcel}
            className="gl-btn-success gl-btn-sm"
          >
            Export Translation Excel
          </button>
          <button
            type="button"
            onClick={handleExportGlossaryExcel}
            className="gl-btn-primary gl-btn-sm"
          >
            Export Glossary Excel
          </button>
        </div>
        <p className="text-[10px] leading-snug text-slate-500 sm:max-w-md">
          SheetJS builds the workbook in the browser; your download starts immediately. Headers use a taller row,
          readable column widths, and a frozen first row. Chinese and other Unicode text are stored correctly in the
          .xlsx format.
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-4 rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
            Optional QA length limit (chars)
          </span>
          <input
            type="number"
            min={0}
            placeholder="e.g. 80"
            value={qaCharLimit}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") setQaCharLimit("");
              else setQaCharLimit(v.replace(/\D/g, ""));
            }}
            className="w-28 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-violet-500/40"
          />
        </label>
        <p className="max-w-md pb-0.5 text-[10px] leading-snug text-slate-500">
          When set, QA flags finals longer than this count. Leave empty to skip length-only checks.
        </p>
      </div>

      <PromptPresetPanel
        presetId={promptPresetId}
        onPresetChange={setPromptPresetId}
        glossaryEntries={glossaryEntries}
        sampleSourceText={promptSampleSource}
        extraPreviewBlocks={promptPreviewConstraintBlock ? [promptPreviewConstraintBlock] : undefined}
      />

      {workspaceView === "list" ? (
        <div className="mb-4 space-y-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
              <span>
                <span className="font-semibold text-slate-200">{listSelectedIds.size}</span> selected
              </span>
              <span className="hidden text-slate-600 sm:inline">·</span>
              <span>
                Showing <span className="font-medium text-slate-300">{filteredRows.length}</span> rows
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Batch</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-500/35 hover:text-cyan-100 disabled:opacity-50"
                disabled={filteredRows.length === 0}
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleBatchAiTranslateSelected}
                className="rounded-md border border-cyan-500/35 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-medium text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={demoViewOnly || !selectedRowsCanTranslate || listSelectedTranslatingBusy}
              >
                {listSelectedTranslatingBusy && listBulkTranslateMode === "sequential"
                  ? "Translating…"
                  : "AI Translate Selected"}
              </button>
              <button
                type="button"
                onClick={handleTranslateSelectedSharedContext}
                className="rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={demoViewOnly || !selectedRowsCanTranslate || listSelectedTranslatingBusy}
                title="One API call: glossary + per-row constraints + peers on the same Page ID for terminology consistency"
              >
                {listSelectedTranslatingBusy && listBulkTranslateMode === "shared"
                  ? "Shared batch…"
                  : "Translate Selected (shared context)"}
              </button>
              <button
                type="button"
                onClick={handleApplyAiDraftToEmptyFinalsSelected}
                className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-500/35 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!selectedRowsCanApplyAiEmpty}
              >
                Apply AI Draft to Empty Finals
              </button>
              <button
                type="button"
                onClick={handleMarkSelectedApproved}
                className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={listSelectedIds.size === 0}
              >
                Mark Selected Approved
              </button>
              <button
                type="button"
                onClick={handleMarkSelectedNeedsRevision}
                className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={listSelectedIds.size === 0}
              >
                Mark Selected Needs Revision
              </button>
              <button
                type="button"
                onClick={handleMarkSelectedFinal}
                className="rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={listSelectedIds.size === 0}
              >
                Mark Selected Final
              </button>
              <button
                type="button"
                onClick={clearListSelection}
                className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:text-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={listSelectedIds.size === 0}
              >
                Clear Selection
              </button>
              <button
                type="button"
                onClick={handleRunQaSelected}
                className="rounded-md border border-violet-500/35 bg-violet-500/10 px-2.5 py-1.5 text-xs font-medium text-violet-200 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={demoViewOnly || listSelectedIds.size === 0 || listQaBusy}
              >
                {listQaBusy ? "Running QA…" : "Run QA Selected"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-0 table-fixed border-collapse text-left text-xs">
              <colgroup>
                <col className="w-9" />
                <col className="w-[5.75rem]" />
                <col className="w-[4.5rem]" />
                <col style={{ width: "36%" }} />
                <col style={{ width: "36%" }} />
                <col className="w-[6.75rem]" />
                <col className="w-[6.75rem]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/90 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-1 py-1.5">
                    <input
                      ref={listSelectAllRef}
                      type="checkbox"
                      checked={allFilteredSelected && filteredRows.length > 0}
                      onChange={toggleSelectAllFiltered}
                      className="rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500/40"
                      aria-label="Select all visible rows"
                    />
                  </th>
                  <th className="px-1.5 py-1.5">ID</th>
                  <th className="px-1.5 py-1.5">Page</th>
                  <th className="px-1.5 py-1.5">Source</th>
                  <th className="px-1.5 py-1.5">Final</th>
                  <th className="px-1.5 py-1.5">Decision</th>
                  <th className="px-1.5 py-1.5">Delivery</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const checked = listSelectedIds.has(row.id);
                  const rowQaIssues = qaIssuesById[row.id] ?? [];
                  const qaHasRun = qaIssuesById[row.id] !== undefined;
                  const ob = overflowBadgeForRow(row);
                  const overflowTip = ob.show ? `Overflow: ${ob.risk}` : "";
                  const qaTip = qaHasRun
                    ? `AI QA: ${aiQaRollupLabel(aiQaRollup(rowQaIssues))}`
                    : "AI QA: not run";
                  const notesTip = row.reviewerNotes.trim()
                    ? `Notes: ${row.reviewerNotes.trim().slice(0, 180)}${row.reviewerNotes.trim().length > 180 ? "…" : ""}`
                    : "";
                  const syncTip = translatingById[row.id]
                    ? "Translating…"
                    : translateErrorById[row.id]
                      ? `Translate: ${translateErrorById[row.id]}`
                      : "";
                  const qaErrTip = qaErrorById[row.id] ? `QA: ${qaErrorById[row.id]}` : "";
                  const rowMetaTitle = [overflowTip, qaTip, notesTip, syncTip, qaErrTip].filter(Boolean).join(" · ");

                  return (
                    <tr
                      key={row.id}
                      title={rowMetaTitle || undefined}
                      className={`border-b border-slate-800/90 last:border-0 ${
                        checked ? "bg-cyan-500/5" : "bg-slate-900/40 hover:bg-slate-900/70"
                      }`}
                    >
                      <td className="px-1 py-1 align-top">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleListRowSelected(row.id)}
                          className="rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500/40"
                          aria-label={`Select ${row.id}`}
                        />
                      </td>
                      <td className="px-1.5 py-1 align-top font-mono text-[11px] text-cyan-200/90">{row.id}</td>
                      <td
                        className="truncate px-1.5 py-1 align-top font-mono text-[10px] text-slate-400"
                        title={row.pageId.trim() || undefined}
                      >
                        {row.pageId.trim() || "—"}
                      </td>
                      <td className="min-w-0 px-1.5 py-1 align-top">
                        <textarea
                          value={row.sourceText}
                          onChange={(e) => updateSourceText(row.id, e.target.value)}
                          rows={2}
                          className="w-full min-w-0 resize-y rounded border border-slate-700/80 bg-slate-950 px-1.5 py-1 text-[11px] leading-snug text-slate-200 outline-none focus:border-cyan-500/40"
                          placeholder="Source…"
                        />
                      </td>
                      <td className="min-w-0 px-1.5 py-1 align-top">
                        <textarea
                          value={row.finalTranslation}
                          onChange={(e) => updateFinalTranslation(row.id, e.target.value)}
                          rows={2}
                          className="w-full min-w-0 resize-y rounded border border-cyan-500/15 bg-slate-950 px-1.5 py-1 text-[11px] leading-snug text-slate-100 outline-none focus:border-cyan-500/40"
                          placeholder="Final…"
                        />
                      </td>
                      <td className="px-1.5 py-1 align-top">
                        <select
                          value={row.reviewDecision}
                          onChange={(e) => applyReviewDecision(row.id, e.target.value as ReviewDecision)}
                          className="w-full max-w-full rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[10px] text-slate-100 outline-none focus:border-cyan-500/40"
                          aria-label={`Review decision for ${row.id}`}
                        >
                          {REVIEW_DECISION_OPTIONS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1.5 py-1 align-top">
                        <select
                          value={row.finalStatus}
                          onChange={(e) => applyFinalStatusOnly(row.id, e.target.value as FinalDeliveryStatus)}
                          className="w-full max-w-full rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[10px] text-slate-100 outline-none focus:border-cyan-500/40"
                          aria-label={`Final delivery status for ${row.id}`}
                        >
                          {FINAL_STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {workspaceView === "card" ? (
      <div className="space-y-4">
        {filteredRows.map((row) => {
          const glossaryHits = getGlossaryMatchesForSource(row.sourceText, glossaryEntries);
          const rowQaIssues = qaIssuesById[row.id] ?? [];
          const qaHasRun = qaIssuesById[row.id] !== undefined;

          return (
          <article
            key={row.id}
            className={`rounded-2xl border p-4 md:p-5 ${
              row.id === "DEMO-001"
                ? "border-cyan-500/35 bg-cyan-500/5"
                : "border-slate-800 bg-slate-900/65"
            }`}
          >
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-medium text-cyan-200">
                  {row.id}
                </span>
                {row.id === "DEMO-001" ? (
                  <span className="inline-flex rounded-full border border-cyan-500/35 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-cyan-200">
                    Live Demo Row
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${finalStatusBadgeClass(
                    row.finalStatus
                  )}`}
                  title="Final delivery status (export pipeline)"
                >
                  {row.finalStatus}
                </span>
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${reviewDecisionBadgeClass(
                    row.reviewDecision
                  )}`}
                  title="Human review decision"
                >
                  {row.reviewDecision}
                </span>
                <button
                  type="button"
                  onClick={() => handleAiTranslate(row)}
                  disabled={
                    demoViewOnly ||
                    Boolean(translatingById[row.id]) ||
                    (Boolean(groupTranslatingPageId) && groupTranslatingPageId === row.pageId?.trim())
                  }
                  className="rounded-md border border-cyan-500/35 bg-cyan-500/10 px-2.5 py-2 text-xs font-medium text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {translatingById[row.id] ||
                  (Boolean(groupTranslatingPageId) && groupTranslatingPageId === row.pageId?.trim())
                    ? "Translating..."
                    : "AI Translate"}
                </button>
                <button
                  type="button"
                  onClick={() => runSingleRowQa(row)}
                  disabled={demoViewOnly || Boolean(qaLoadingById[row.id])}
                  className="rounded-md border border-violet-500/35 bg-violet-500/10 px-2.5 py-2 text-xs font-medium text-violet-200 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {qaLoadingById[row.id] ? "Running QA…" : "Run QA"}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">Source</p>
                {row.id === "DEMO-001" ? (
                  <>
                    <div
                      ref={(el) => {
                        bindSelectionRoot(row.id).source = el;
                      }}
                      className="select-text"
                    >
                      <textarea
                        ref={(el) => {
                          bindSelectionRoot(row.id).sourceTextarea = el;
                        }}
                        value={row.sourceText}
                        onChange={(event) => updateSourceText(row.id, event.target.value)}
                        rows={3}
                        placeholder="Paste a game string here to test AI translation..."
                        className="w-full rounded-lg border border-cyan-500/25 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-500/10"
                      />
                    </div>
                    {glossaryHits.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {glossaryHits.map((hit) => (
                          <span
                            key={hit.id}
                            className={`inline-flex max-w-full items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[10px] font-medium ${priorityMiniClass(hit.priority)}`}
                            title={`${hit.sourceTerm} → ${hit.targetTerm}`}
                          >
                            <span className="text-slate-400">{hit.sourceTerm}</span>
                            <span className="text-slate-500">→</span>
                            <span className="text-cyan-100">{hit.targetTerm}</span>
                            <span className="text-slate-500">({hit.priority})</span>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <LocalizationMetaChips row={row} />
                    <PageConsistencyPanel
                      row={row}
                      allRows={rows}
                      glossaryEntries={glossaryEntries}
                      busy={
                        Boolean(groupTranslatingPageId) && groupTranslatingPageId === row.pageId?.trim()
                      }
                      onTranslateGroup={handleTranslateGroupForPage}
                      aiDisabled={demoViewOnly}
                    />
                  </>
                ) : (
                  <>
                    <div
                      ref={(el) => {
                        bindSelectionRoot(row.id).source = el;
                      }}
                      className="select-text"
                    >
                      {renderSourceWithHighlights(row.sourceText, glossaryHits)}
                    </div>
                    {glossaryHits.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {glossaryHits.map((hit) => (
                          <span
                            key={hit.id}
                            className={`inline-flex max-w-full items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[10px] font-medium ${priorityMiniClass(hit.priority)}`}
                            title={hit.notes || `${hit.sourceTerm} → ${hit.targetTerm}`}
                          >
                            <span className="truncate text-slate-300">{hit.sourceTerm}</span>
                            <span className="shrink-0 text-slate-500">→</span>
                            <span className="truncate text-cyan-100">{hit.targetTerm}</span>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <LocalizationMetaChips row={row} />
                    <PageConsistencyPanel
                      row={row}
                      allRows={rows}
                      glossaryEntries={glossaryEntries}
                      busy={
                        Boolean(groupTranslatingPageId) && groupTranslatingPageId === row.pageId?.trim()
                      }
                      onTranslateGroup={handleTranslateGroupForPage}
                      aiDisabled={demoViewOnly}
                    />
                  </>
                )}
              </section>

              <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">AI Draft</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {(() => {
                      const ob = overflowBadgeForRow(row);
                      if (!ob.show) {
                        return (
                          <span className="text-[10px] text-slate-600" title="No numeric character cap on this row">
                            Overflow: —
                          </span>
                        );
                      }
                      const label =
                        ob.risk === "safe" ? "Safe" : ob.risk === "warning" ? "Warning" : "High Risk";
                      const cls =
                        ob.risk === "safe"
                          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
                          : ob.risk === "warning"
                            ? "border-amber-500/35 bg-amber-500/10 text-amber-100"
                            : "border-rose-500/40 bg-rose-500/15 text-rose-100";
                      return (
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${cls}`}
                          title="Live check: AI draft length vs this row’s character budget (before QA)"
                        >
                          {label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div
                  ref={(el) => {
                    bindSelectionRoot(row.id).ai = el;
                  }}
                  className="select-text"
                >
                  <p className="whitespace-pre-wrap text-sm text-slate-300">
                    {row.aiTranslation || "No AI draft yet. Click AI Translate to generate."}
                  </p>
                </div>
                <GlossaryCheckPanel hits={glossaryHits} aiTranslation={row.aiTranslation} />
                {constraintExtrasById[row.id]?.warnings?.length ? (
                  <ul className="mt-2 space-y-1 rounded border border-amber-500/25 bg-amber-500/5 px-2 py-1.5 text-[11px] text-amber-100/95">
                    {constraintExtrasById[row.id]!.warnings.map((w, i) => (
                      <li key={`${row.id}-cw-${i}`}>{w}</li>
                    ))}
                  </ul>
                ) : null}
                {constraintExtrasById[row.id]?.shorterAlternatives?.length ? (
                  <div className="mt-2 rounded border border-cyan-500/20 bg-slate-950/60 px-2 py-1.5">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-200/90">
                      Shorter alternatives (tap to replace AI draft only)
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {constraintExtrasById[row.id]!.shorterAlternatives.map((alt, i) => (
                        <button
                          key={`${row.id}-alt-${i}`}
                          type="button"
                          onClick={() => applyShorterAlternativeToAiDraft(row.id, alt)}
                          className="max-w-full truncate rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-left text-[11px] text-cyan-50 transition hover:bg-cyan-500/20"
                        >
                          {alt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {translateErrorById[row.id] ? (
                  <p className="mt-2 text-xs text-rose-300">{translateErrorById[row.id]}</p>
                ) : null}
              </section>

              <section className="rounded-xl border border-cyan-500/20 bg-slate-950/70 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-cyan-300">
                    Human Review / Final
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (!row.aiTranslation.trim()) return;
                      updateFinalTranslation(row.id, row.aiTranslation);
                    }}
                    disabled={row.finalTranslation === row.aiTranslation || row.aiTranslation.trim().length === 0}
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-200 transition hover:border-cyan-500/40 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Apply AI Draft to Final
                  </button>
                </div>
                <textarea
                  ref={(el) => {
                    bindSelectionRoot(row.id).final = el;
                  }}
                  value={row.finalTranslation}
                  onChange={(event) => updateFinalTranslation(row.id, event.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-cyan-500/25 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-500/10"
                  placeholder="Edit final translation…"
                />
                {translateHintById[row.id] ? (
                  <p className="mt-2 text-[11px] text-cyan-300">{translateHintById[row.id]}</p>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-500">Final translation is the human-owned review field.</p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-800/70 pt-2">
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Decision</span>
                  <select
                    value={row.reviewDecision}
                    onChange={(e) => applyReviewDecision(row.id, e.target.value as ReviewDecision)}
                    className="h-7 max-w-[9.5rem] rounded border border-slate-700 bg-slate-950 px-1.5 text-[11px] text-slate-100 outline-none focus:border-cyan-500/40"
                    aria-label={`Review decision for ${row.id}`}
                  >
                    {REVIEW_DECISION_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Delivery</span>
                  <select
                    value={row.finalStatus}
                    onChange={(e) => applyFinalStatusOnly(row.id, e.target.value as FinalDeliveryStatus)}
                    className="h-7 max-w-[9.5rem] rounded border border-slate-700 bg-slate-950 px-1.5 text-[11px] text-slate-100 outline-none focus:border-cyan-500/40"
                    aria-label={`Final status for ${row.id}`}
                  >
                    {FINAL_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="mt-2 block">
                  <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Reviewer notes
                  </span>
                  <input
                    type="text"
                    value={row.reviewerNotes}
                    onChange={(e) => updateReviewerNotes(row.id, e.target.value)}
                    placeholder="Short note for PM / VO / LQA…"
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[12px] text-slate-200 outline-none focus:border-cyan-500/35"
                  />
                </label>

                {/* Day 7: AI QA layer — suggestions only; does not edit your final string. */}
                <div className="mt-3 rounded-lg border border-violet-500/20 bg-slate-950/50 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300/90">
                      AI localization QA
                    </p>
                    {qaHasRun ? (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${aiQaRollupBadgeClass(
                          aiQaRollup(rowQaIssues)
                        )}`}
                      >
                        {aiQaRollupLabel(aiQaRollup(rowQaIssues))}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-600">Not run</span>
                    )}
                  </div>
                  {qaErrorById[row.id] ? (
                    <p className="mb-2 text-[11px] text-rose-300">{qaErrorById[row.id]}</p>
                  ) : null}
                  {qaHasRun && rowQaIssues.length > 0 ? (
                    <ul className="space-y-2">
                      {rowQaIssues.map((issue, idx) => (
                        <li
                          key={`${row.id}-qa-${idx}-${issue.type}`}
                          className="rounded-md border border-slate-800/90 bg-slate-900/60 p-2 text-[11px]"
                        >
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${aiQaSeverityChipClass(
                                issue.severity
                              )}`}
                            >
                              {issue.severity}
                            </span>
                            <span className="font-medium text-slate-200">{issue.type}</span>
                          </div>
                          <p className="text-slate-400">{issue.issue}</p>
                          <p className="mt-1 text-slate-500">
                            <span className="text-slate-500">Suggested fix: </span>
                            {issue.suggestedFix}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : qaHasRun && rowQaIssues.length === 0 ? (
                    <p className="text-[11px] text-emerald-400/90">No issues reported — looks good from this check.</p>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Click <span className="text-violet-300">Run QA</span> for a deeper AI review (placeholders,
                      glossary, tone, and more).
                    </p>
                  )}
                </div>
              </section>
            </div>
          </article>
          );
        })}
      </div>
      ) : null}

      {selectionBubble && !glossaryModalOpen && workspaceView === "card" ? (
        <div className="pointer-events-none fixed inset-0 z-[85]" aria-hidden>
          <div
            className="pointer-events-auto fixed z-[86]"
            style={{ left: selectionBubble.left, top: selectionBubble.top }}
            data-glossary-action="toolbar"
          >
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => openGlossaryModal(selectionBubble.rowId)}
              title={
                selectionBubble.field === "source"
                  ? "Prefill source term from selection"
                  : selectionBubble.field === "final"
                    ? "Prefill target term from selection"
                    : "Prefill target term from AI draft selection"
              }
              className="rounded-lg border border-cyan-500/40 bg-slate-950/95 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-cyan-100 shadow-lg shadow-black/40 ring-1 ring-cyan-500/20 backdrop-blur-sm transition hover:bg-cyan-500/15"
            >
              Add to Glossary
            </button>
          </div>
        </div>
      ) : null}

      <AddToGlossaryModal
        open={glossaryModalOpen}
        onClose={closeGlossaryModal}
        formVersion={glossaryFormVersion}
        initialSourceTerm={modalTargetPrefill.initialSourceTerm}
        initialTargetTerm={modalTargetPrefill.initialTargetTerm}
        targetTermHint={modalTargetPrefill.targetTermHint}
        contextLabel={modalRow ? `String ${modalRow.id}` : ""}
        onSave={handleSaveGlossaryEntry}
      />
    </section>
  );
}
