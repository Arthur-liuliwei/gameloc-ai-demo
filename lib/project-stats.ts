import { getGlossaryMatchesForSource } from "@/lib/glossary-match";
import type { GlossaryEntry } from "@/lib/glossary-types";
import type { QaIssue } from "@/lib/qa-check-types";
import { WORKSPACE_INITIAL_ROWS, type WorkspaceRow } from "@/lib/workspace-rows";

export type ProjectProgressMetrics = {
  translationPct: number;
  reviewPct: number;
  qaPassPct: number;
  glossaryCompliancePct: number;
  deliveryPct: number;
};

export type ProjectStatCounts = {
  totalStrings: number;
  translatedStrings: number;
  reviewedStrings: number;
  finalizedStrings: number;
  qaWarnings: number;
  glossaryEntries: number;
  exportReadyRows: number;
};

export type ProjectStats = ProjectStatCounts & {
  progress: ProjectProgressMetrics;
};

function qaRollup(issues: QaIssue[] | undefined): "not_run" | "pass" | "warning" | "fail" {
  if (issues === undefined) return "not_run";
  if (issues.length === 0) return "pass";
  if (issues.some((i) => i.severity === "High")) return "fail";
  return "warning";
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

/**
 * Derives dashboard KPIs from workspace rows, optional QA snapshot, and glossary entries.
 * Uses the same QA rollup rules as the Translation Workspace UI.
 */
export function computeProjectStats(
  rows: WorkspaceRow[],
  qaIssuesById: Record<string, QaIssue[]>,
  glossaryEntries: GlossaryEntry[]
): ProjectStats {
  const total = rows.length;

  const translatedStrings = rows.filter((r) => r.aiTranslation.trim().length > 0).length;

  const reviewedStrings = rows.filter(
    (r) => r.reviewDecision !== "Pending"
  ).length;

  const finalizedStrings = rows.filter((r) => r.finalStatus === "Final").length;

  const exportReadyRows = rows.filter(
    (r) => r.finalStatus === "Final" || r.finalStatus === "Approved"
  ).length;

  let qaWarnings = 0;
  let qaRan = 0;
  let qaPass = 0;
  for (const row of rows) {
    const roll = qaRollup(qaIssuesById[row.id]);
    if (roll === "not_run") continue;
    qaRan += 1;
    if (roll === "pass") qaPass += 1;
    if (roll === "warning" || roll === "fail") qaWarnings += 1;
  }

  let glossaryHits = 0;
  for (const row of rows) {
    if (getGlossaryMatchesForSource(row.sourceText, glossaryEntries).length > 0) {
      glossaryHits += 1;
    }
  }

  return {
    totalStrings: total,
    translatedStrings,
    reviewedStrings,
    finalizedStrings,
    qaWarnings,
    glossaryEntries: glossaryEntries.length,
    exportReadyRows,
    progress: {
      translationPct: pct(translatedStrings, total),
      reviewPct: pct(reviewedStrings, total),
      qaPassPct: pct(qaPass, qaRan),
      glossaryCompliancePct: pct(glossaryHits, total),
      deliveryPct: pct(exportReadyRows, total)
    }
  };
}

/** Default stats when no workspace snapshot exists in the browser yet. */
export function defaultProjectStats(
  glossaryEntries: GlossaryEntry[]
): ProjectStats {
  return computeProjectStats(WORKSPACE_INITIAL_ROWS, {}, glossaryEntries);
}

export type ActivityItem = {
  id: string;
  time: string;
  label: string;
  detail: string;
  tone: "cyan" | "emerald" | "amber" | "violet";
};

/** Demo activity feed derived from row state (no backend). */
export function buildRecentActivity(rows: WorkspaceRow[]): ActivityItem[] {
  const items: ActivityItem[] = [];

  const finalized = rows.filter((r) => r.finalStatus === "Final").slice(0, 2);
  finalized.forEach((r, i) => {
    items.push({
      id: `act-final-${r.id}`,
      time: i === 0 ? "Just now" : "12 min ago",
      label: "String finalized",
      detail: `${r.id} · ${r.pageId || "General"}`,
      tone: "emerald"
    });
  });

  const approved = rows.filter((r) => r.reviewDecision === "Approved" && r.finalStatus !== "Final").slice(0, 2);
  approved.forEach((r, i) => {
    items.push({
      id: `act-appr-${r.id}`,
      time: i === 0 ? "28 min ago" : "45 min ago",
      label: "Review approved",
      detail: `${r.id} · ${r.stringContext || "String"}`,
      tone: "cyan"
    });
  });

  const inReview = rows.filter((r) => r.finalStatus === "In Review").slice(0, 1);
  inReview.forEach((r) => {
    items.push({
      id: `act-rev-${r.id}`,
      time: "1 hr ago",
      label: "Moved to In Review",
      detail: r.sourceText.slice(0, 48) + (r.sourceText.length > 48 ? "…" : ""),
      tone: "amber"
    });
  });

  const blocked = rows.filter((r) => r.finalStatus === "Blocked").slice(0, 1);
  blocked.forEach((r) => {
    items.push({
      id: `act-block-${r.id}`,
      time: "2 hr ago",
      label: "Delivery blocked",
      detail: `${r.id} · reviewer flagged`,
      tone: "violet"
    });
  });

  if (items.length < 4) {
    items.push({
      id: "act-batch",
      time: "Today",
      label: "AI batch translate",
      detail: "BattleHUD page group · 3 strings",
      tone: "cyan"
    });
  }

  return items.slice(0, 6);
}
