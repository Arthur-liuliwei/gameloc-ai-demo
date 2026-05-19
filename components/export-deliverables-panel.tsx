"use client";

import { useCallback, useEffect, useState } from "react";
import { useGlossary } from "@/contexts/glossary-context";
import {
  downloadGlossaryXlsx,
  downloadTranslationWorkspaceXlsx,
  filterRowsForTranslationExport,
  type TranslationExportScope
} from "@/lib/excel-export";
import { loadWorkspaceExportSnapshot } from "@/lib/workspace-export-snapshot";
import { WORKSPACE_INITIAL_ROWS } from "@/lib/workspace-rows";

/**
 * Deliverable buttons for the Export route. Translation uses the latest snapshot from
 * Translation Workspace (localStorage); glossary uses live context state.
 */
export function ExportDeliverablesPanel() {
  const { entries: glossaryEntries } = useGlossary();
  const [translationExportScope, setTranslationExportScope] = useState<TranslationExportScope>("visible");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  const handleTranslationExport = useCallback(() => {
    const snap = loadWorkspaceExportSnapshot();
    const baseRows = snap?.rows ?? WORKSPACE_INITIAL_ROWS;
    const qa = snap?.qaIssuesById ?? {};
    const selected = new Set(snap?.selectedIds ?? []);
    const picked = filterRowsForTranslationExport(baseRows, selected, translationExportScope);
    if (picked.length === 0) {
      setMessage("No rows match this export filter. Open Translation Workspace and adjust filters or selection.");
      return;
    }
    downloadTranslationWorkspaceXlsx(picked, qa);
    setMessage(
      `Downloaded GameLocAI_TranslationWorkspace.xlsx (${picked.length} row${picked.length === 1 ? "" : "s"}).`
    );
  }, [translationExportScope]);

  const handleGlossaryExport = useCallback(() => {
    if (glossaryEntries.length === 0) {
      setMessage("Glossary has no entries to export.");
      return;
    }
    downloadGlossaryXlsx(glossaryEntries);
    setMessage(
      `Downloaded GameLocAI_Glossary.xlsx (${glossaryEntries.length} entr${glossaryEntries.length === 1 ? "y" : "ies"}).`
    );
  }, [glossaryEntries]);

  return (
    <section className="gl-panel">
      <h2 className="gl-heading-section">Excel deliverables</h2>
      <p className="mt-2 text-sm text-slate-300">
        Translation export uses your last Translation Workspace session (including QA results and list selection).
        Visit that page once so the snapshot is saved to this browser.
      </p>

      {message ? (
        <div
          className="gl-toast mt-4"
          role="status"
        >
          {message}
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="gl-subpanel border-emerald-500/25 p-5">
          <p className="text-base font-semibold text-emerald-100">Translation Workspace</p>
          <p className="mt-1 text-sm text-slate-400">GameLocAI_TranslationWorkspace.xlsx</p>
          <label className="mt-4 flex flex-col gap-1.5 text-xs text-slate-300">
            <span className="font-medium text-slate-400">Row scope</span>
            <select
              value={translationExportScope}
              onChange={(e) => setTranslationExportScope(e.target.value as TranslationExportScope)}
              className="gl-select"
            >
              <option value="visible">All strings (snapshot)</option>
              <option value="selected">Selected only (last workspace selection)</option>
              <option value="approved">Approved (review) only</option>
              <option value="final">Final (delivery) only</option>
            </select>
          </label>
          <button
            type="button"
            onClick={handleTranslationExport}
            className="gl-btn-success mt-4 w-full py-3 text-sm"
          >
            Export Translation Excel
          </button>
        </div>

        <div className="gl-subpanel border-cyan-500/25 p-5">
          <p className="text-base font-semibold text-cyan-100">Glossary</p>
          <p className="mt-1 text-sm text-slate-400">GameLocAI_Glossary.xlsx</p>
          <p className="mt-4 text-sm text-slate-400">
            {glossaryEntries.length} entr{glossaryEntries.length === 1 ? "y" : "ies"} in the current glossary.
          </p>
          <button
            type="button"
            onClick={handleGlossaryExport}
            className="gl-btn-primary mt-4 w-full py-3 text-sm"
          >
            Export Glossary Excel
          </button>
        </div>
      </div>
    </section>
  );
}
