import * as XLSX from "xlsx-js-style";
import type { GlossaryEntry } from "@/lib/glossary-types";
import type { QaIssue } from "@/lib/qa-check-types";
import type { WorkspaceRow } from "@/lib/workspace-rows";

export type TranslationExportScope = "visible" | "selected" | "approved" | "final";

const TRANSLATION_HEADERS = [
  "ID",
  "Page ID",
  "String Context",
  "Source Text",
  "AI Translation",
  "Final Translation",
  "Review Decision",
  "Delivery Status",
  "QA Status",
  "Reviewer Notes",
  "Character Limit",
  "Constraint Notes"
] as const;

const GLOSSARY_HEADERS = ["Source Term", "Target Term", "Category", "Priority", "Notes"] as const;

/** SheetJS-compatible writer; `cellStyles` keeps header `cell.s` font/fill in the .xlsx. */
const WRITE_OPTS = { bookType: "xlsx" as const, cellStyles: true };

function applyHeaderRowStyles(ws: XLSX.WorkSheet, columnCount: number): void {
  for (let c = 0; c < columnCount; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    const cell = ws[addr];
    if (!cell) continue;
    cell.s = {
      font: { bold: true, sz: 11, color: { rgb: "FFF1F5F9" } },
      fill: { patternType: "solid", fgColor: { rgb: "FF334155" } },
      alignment: { vertical: "center", horizontal: "center", wrapText: true }
    };
  }
}

/** Same rules as the workspace AI QA badge: Not run until QA has been executed for that row. */
export function qaStatusForExcel(issues: QaIssue[] | undefined): string {
  if (issues === undefined) return "Not run";
  if (issues.length === 0) return "Pass";
  if (issues.some((i) => i.severity === "High")) return "Fail";
  return "Warning";
}

/**
 * Applies export scope on top of the rows the user already sees (search + delivery filter).
 * Order is preserved from the input array.
 */
export function filterRowsForTranslationExport(
  filteredRows: WorkspaceRow[],
  selectedIds: Set<string>,
  scope: TranslationExportScope
): WorkspaceRow[] {
  switch (scope) {
    case "visible":
      return filteredRows;
    case "selected":
      return filteredRows.filter((r) => selectedIds.has(r.id));
    case "approved":
      return filteredRows.filter((r) => r.reviewDecision === "Approved");
    case "final":
      return filteredRows.filter((r) => r.finalStatus === "Final");
    default:
      return filteredRows;
  }
}

function translationRowToArray(row: WorkspaceRow, qaIssuesById: Record<string, QaIssue[]>): (string | number)[] {
  return [
    row.id,
    row.pageId,
    row.stringContext,
    row.sourceText,
    row.aiTranslation,
    row.finalTranslation,
    row.reviewDecision,
    row.finalStatus,
    qaStatusForExcel(qaIssuesById[row.id]),
    row.reviewerNotes,
    row.characterLimit > 0 ? row.characterLimit : "",
    row.constraintNotes
  ];
}

const TRANSLATION_COL_WIDTHS: XLSX.ColInfo[] = [
  { wch: 12 },
  { wch: 14 },
  { wch: 16 },
  { wch: 42 },
  { wch: 42 },
  { wch: 42 },
  { wch: 16 },
  { wch: 14 },
  { wch: 12 },
  { wch: 28 },
  { wch: 12 },
  { wch: 36 }
];

const GLOSSARY_COL_WIDTHS: XLSX.ColInfo[] = [
  { wch: 28 },
  { wch: 28 },
  { wch: 12 },
  { wch: 12 },
  { wch: 40 }
];

function decorateTranslationSheet(ws: XLSX.WorkSheet, dataRowCount: number): void {
  applyHeaderRowStyles(ws, TRANSLATION_HEADERS.length);
  ws["!cols"] = TRANSLATION_COL_WIDTHS;
  ws["!rows"] = [{ hpt: 26 }];
  ws["!views"] = [{ ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" }];
  const lastCol = XLSX.utils.encode_col(TRANSLATION_HEADERS.length - 1);
  const lastRow = Math.max(1, dataRowCount + 1);
  ws["!autofilter"] = { ref: `A1:${lastCol}${lastRow}` };
}

function decorateGlossarySheet(ws: XLSX.WorkSheet, dataRowCount: number): void {
  applyHeaderRowStyles(ws, GLOSSARY_HEADERS.length);
  ws["!cols"] = GLOSSARY_COL_WIDTHS;
  ws["!rows"] = [{ hpt: 26 }];
  ws["!views"] = [{ ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" }];
  const lastCol = XLSX.utils.encode_col(GLOSSARY_HEADERS.length - 1);
  const lastRow = Math.max(1, dataRowCount + 1);
  ws["!autofilter"] = { ref: `A1:${lastCol}${lastRow}` };
}

/** Builds a workbook and triggers a browser download (.xlsx). UTF-8 text is preserved in OOXML. */
export function downloadTranslationWorkspaceXlsx(
  rows: WorkspaceRow[],
  qaIssuesById: Record<string, QaIssue[]>,
  filename = "GameLocAI_TranslationWorkspace.xlsx"
): void {
  const aoa: (string | number)[][] = [
    [...TRANSLATION_HEADERS],
    ...rows.map((row) => translationRowToArray(row, qaIssuesById))
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  decorateTranslationSheet(ws, rows.length);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Translation");
  XLSX.writeFile(wb, filename, WRITE_OPTS);
}

export function downloadGlossaryXlsx(
  entries: GlossaryEntry[],
  filename = "GameLocAI_Glossary.xlsx"
): void {
  const aoa: (string | number)[][] = [
    [...GLOSSARY_HEADERS],
    ...entries.map((e) => [e.sourceTerm, e.targetTerm, e.category, e.priority, e.notes])
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  decorateGlossarySheet(ws, entries.length);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Glossary");
  XLSX.writeFile(wb, filename, WRITE_OPTS);
}
