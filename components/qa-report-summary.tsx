"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { useGlossary } from "@/contexts/glossary-context";
import { DEFAULT_GLOSSARY_ENTRIES } from "@/lib/glossary-initial-data";
import { computeProjectStats } from "@/lib/project-stats";
import { WORKSPACE_INITIAL_ROWS } from "@/lib/workspace-rows";
import { loadWorkspaceExportSnapshot } from "@/lib/workspace-export-snapshot";

export function QaReportSummary() {
  const { entries } = useGlossary();
  const [qaWarnings, setQaWarnings] = useState(0);
  const [qaPassPct, setQaPassPct] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const snap = loadWorkspaceExportSnapshot();
    const rows = snap?.rows ?? WORKSPACE_INITIAL_ROWS;
    const glossary = entries.length > 0 ? entries : DEFAULT_GLOSSARY_ENTRIES;
    const stats = computeProjectStats(rows, snap?.qaIssuesById ?? {}, glossary);
    setQaWarnings(stats.qaWarnings);
    setQaPassPct(stats.progress.qaPassPct);
    setTotal(stats.totalStrings);
  }, [entries]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <StatCard label="Strings in batch" value={total} tone="slate" />
      <StatCard label="QA pass rate" value={`${qaPassPct}%`} detail="Among rows where QA ran" tone="emerald" />
      <StatCard label="Open QA warnings" value={qaWarnings} detail="Warning or fail rollup" tone="amber" />
    </div>
  );
}
