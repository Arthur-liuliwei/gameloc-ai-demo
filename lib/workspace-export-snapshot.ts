import type { QaIssue } from "@/lib/qa-check-types";
import type { WorkspaceRow } from "@/lib/workspace-rows";

/** Lets the Export page read the latest workspace without lifting all state to context. */
export const WORKSPACE_EXPORT_STORAGE_KEY = "gameloc-workspace-export-v1";

export type WorkspaceExportSnapshot = {
  rows: WorkspaceRow[];
  qaIssuesById: Record<string, QaIssue[]>;
  /** Last list selection from Translation Workspace (for “selected only” export on the Export page). */
  selectedIds?: string[];
};

export function persistWorkspaceExportSnapshot(data: WorkspaceExportSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WORKSPACE_EXPORT_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadWorkspaceExportSnapshot(): WorkspaceExportSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WORKSPACE_EXPORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkspaceExportSnapshot>;
    if (!parsed || !Array.isArray(parsed.rows)) return null;
    return {
      rows: parsed.rows as WorkspaceRow[],
      qaIssuesById: (parsed.qaIssuesById ?? {}) as Record<string, QaIssue[]>,
      selectedIds: Array.isArray(parsed.selectedIds)
        ? (parsed.selectedIds as string[])
        : undefined
    };
  } catch {
    return null;
  }
}
