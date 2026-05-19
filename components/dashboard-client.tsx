"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { QuickActionCard } from "@/components/ui/quick-action-card";
import { SectionPanel } from "@/components/ui/section-panel";
import { StatCard } from "@/components/ui/stat-card";
import { useGlossary } from "@/contexts/glossary-context";
import { DEFAULT_GLOSSARY_ENTRIES } from "@/lib/glossary-initial-data";
import {
  buildRecentActivity,
  computeProjectStats,
  defaultProjectStats,
  type ProjectStats
} from "@/lib/project-stats";
import { recentProjects } from "@/lib/mock-data";
import { WORKSPACE_INITIAL_ROWS } from "@/lib/workspace-rows";
import { loadWorkspaceExportSnapshot } from "@/lib/workspace-export-snapshot";

const DEMO_PROJECT = {
  name: "Mythic Frontier — zh-CN Season 4",
  id: "PRJ-1024",
  source: "en-US",
  target: "zh-CN",
  status: "In Progress" as const
};

const activityDot: Record<string, string> = {
  cyan: "bg-cyan-400",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  violet: "bg-violet-400"
};

const quickActions = [
  { href: "/translation-workspace", label: "Open workspace", description: "Edit AI & final strings", primary: true },
  { href: "/glossary-manager", label: "Glossary", description: "Terms & priorities", primary: false },
  { href: "/qa-report", label: "QA report", description: "Review findings", primary: false },
  { href: "/export", label: "Export", description: "Excel deliverables", primary: false }
];

const workflowSteps = [
  { key: "translate", label: "Translate", pctKey: "translationPct" as const },
  { key: "review", label: "Review", pctKey: "reviewPct" as const },
  { key: "qa", label: "QA", pctKey: "qaPassPct" as const },
  { key: "ship", label: "Ship", pctKey: "deliveryPct" as const }
];

export function DashboardClient() {
  const { entries: glossaryEntries } = useGlossary();
  const [stats, setStats] = useState<ProjectStats>(() =>
    defaultProjectStats(DEFAULT_GLOSSARY_ENTRIES)
  );

  useEffect(() => {
    const snap = loadWorkspaceExportSnapshot();
    const rows = snap?.rows ?? WORKSPACE_INITIAL_ROWS;
    const qa = snap?.qaIssuesById ?? {};
    const glossary = glossaryEntries.length > 0 ? glossaryEntries : DEFAULT_GLOSSARY_ENTRIES;
    setStats(computeProjectStats(rows, qa, glossary));
  }, [glossaryEntries]);

  const activity = useMemo(() => {
    const snap = loadWorkspaceExportSnapshot();
    const rows = snap?.rows ?? WORKSPACE_INITIAL_ROWS;
    return buildRecentActivity(rows);
  }, [stats]);

  const { progress } = stats;

  return (
    <div className="space-y-6">
      <header className="gl-panel overflow-hidden border-cyan-500/15 bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-slate-950/95">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-300/90">
              Localization command center
            </p>
            <h1 className="gl-heading-page mt-1">GameLoc AI</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
              AI-assisted game localization for producers — translate, enforce glossary, run QA, and ship
              review-ready packages.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:max-w-xl lg:flex-1">
            {quickActions.map((a) => (
              <QuickActionCard
                key={a.href}
                href={a.href}
                label={a.label}
                description={a.description}
                primary={a.primary}
              />
            ))}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-800/80 pt-4 text-xs text-slate-400">
          <span>
            <span className="text-slate-500">Project</span>{" "}
            <span className="font-medium text-slate-200">{DEMO_PROJECT.name}</span>
          </span>
          <span className="hidden text-slate-700 sm:inline">|</span>
          <span>
            {DEMO_PROJECT.source} → <span className="text-cyan-200/90">{DEMO_PROJECT.target}</span>
          </span>
          <span className="hidden text-slate-700 sm:inline">|</span>
          <span className="gl-badge border-amber-500/30 bg-amber-500/10 text-amber-200">{DEMO_PROJECT.status}</span>
        </div>
        <div className="mt-5 border-t border-slate-800/80 pt-4">
          <p className="text-sm font-semibold text-slate-100">Arthur LIU</p>
          <p className="mt-0.5 text-xs text-slate-400">
            Freelance Game Localization Producer | Localization Production Consultant
          </p>
          <p className="mt-2 text-sm text-slate-300">
            Contact:{" "}
            <a
              href="mailto:liuliwei@outlook.com"
              className="font-medium text-cyan-300 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-200"
            >
              liuliwei@outlook.com
            </a>
          </p>
        </div>
      </header>

      <SectionPanel title="Project overview" subtitle="Active batch KPIs — synced from Translation Workspace in this browser">
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {workflowSteps.map((step, i) => {
            const pct = progress[step.pctKey];
            const active = pct >= (i === 0 ? 1 : 25);
            return (
              <div
                key={step.key}
                className={`gl-workflow-step ${active ? "gl-workflow-step-active" : "text-slate-400"}`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider">{step.label}</span>
                <span className="text-lg font-semibold tabular-nums">{pct}%</span>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
          <StatCard label="Total strings" value={stats.totalStrings} detail="Active workspace batch" tone="slate" />
          <StatCard
            label="Translated"
            value={stats.translatedStrings}
            detail={`${progress.translationPct}% AI draft coverage`}
            tone="cyan"
          />
          <StatCard
            label="Reviewed"
            value={stats.reviewedStrings}
            detail="Human decision recorded"
            tone="violet"
          />
          <StatCard label="Finalized" value={stats.finalizedStrings} detail="Delivery = Final" tone="emerald" />
          <StatCard label="QA warnings" value={stats.qaWarnings} detail="Rows with QA findings" tone="amber" />
          <StatCard label="Glossary" value={stats.glossaryEntries} detail="Managed terms" tone="cyan" />
          <StatCard
            label="Export-ready"
            value={stats.exportReadyRows}
            detail="Approved or Final"
            tone="emerald"
          />
        </div>
      </SectionPanel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionPanel
          title="Pipeline progress"
          subtitle="Translation, review, QA, glossary, and delivery readiness"
          className="xl:col-span-2"
        >
          <div className="space-y-4">
            <ProgressBar
              label="Translation completed"
              value={progress.translationPct}
              hint={`${stats.translatedStrings} / ${stats.totalStrings} with AI draft`}
              tone="cyan"
            />
            <ProgressBar
              label="Human review completed"
              value={progress.reviewPct}
              hint={`${stats.reviewedStrings} decisions logged`}
              tone="violet"
            />
            <ProgressBar
              label="QA pass rate"
              value={progress.qaPassPct}
              hint="Among rows where QA was run"
              tone="emerald"
            />
            <ProgressBar
              label="Glossary coverage"
              value={progress.glossaryCompliancePct}
              hint="Source strings with term hits"
              tone="indigo"
            />
            <ProgressBar
              label="Delivery readiness"
              value={progress.deliveryPct}
              hint={`${stats.exportReadyRows} export-ready rows`}
              tone="amber"
            />
          </div>
        </SectionPanel>

        <SectionPanel title="QA & glossary health" subtitle="Automated checks and terminology">
          <div className="space-y-3">
            <div className="gl-card border-emerald-500/20 bg-emerald-500/[0.05] p-3">
              <p className="text-xs text-slate-400">QA pass rate (ran QA)</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-200">{progress.qaPassPct}%</p>
            </div>
            <div className="gl-card border-amber-500/20 bg-amber-500/[0.05] p-3">
              <p className="text-xs text-slate-400">Open warnings</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-200">{stats.qaWarnings}</p>
            </div>
            <div className="gl-card border-violet-500/20 bg-violet-500/[0.05] p-3">
              <p className="text-xs text-slate-400">Glossary coverage</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-violet-200">
                {progress.glossaryCompliancePct}%
              </p>
              <p className="mt-1 text-[11px] text-slate-500">{stats.glossaryEntries} managed entries</p>
            </div>
            <Link href="/translation-workspace" className="gl-btn-primary block w-full text-center text-sm">
              Continue in workspace →
            </Link>
          </div>
        </SectionPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionPanel title="Recent activity" subtitle="Latest workflow events">
          <ul className="space-y-3">
            {activity.map((item) => (
              <li
                key={item.id}
                className="flex gap-3 rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2.5"
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${activityDot[item.tone]}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-slate-200">{item.label}</p>
                    <time className="text-[11px] text-slate-500">{item.time}</time>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-400">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionPanel>

        <SectionPanel title="Other projects" subtitle="Portfolio snapshot (demo)">
          <ul className="divide-y divide-slate-800/80">
            {recentProjects.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-200">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    {p.sourceLocale} → {p.targetLocales.join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24">
                    <ProgressBar label="" value={p.completion} tone="cyan" />
                  </div>
                  <span className="text-xs text-slate-400">{p.status}</span>
                </div>
              </li>
            ))}
          </ul>
        </SectionPanel>
      </div>
    </div>
  );
}
