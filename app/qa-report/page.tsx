import PageHeader from "@/components/page-header";
import { QaReportSummary } from "@/components/qa-report-summary";
import { qaIssues } from "@/lib/mock-data";

function severityClass(severity: string): string {
  if (severity === "High") return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  if (severity === "Medium") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
}

export default function QaReportPage() {
  return (
    <main className="space-y-6">
      <PageHeader
        title="QA Report"
        subtitle="Review terminology, placeholder, UI, and tone issues before human sign-off and export."
        badge="Advisory"
      />

      <QaReportSummary />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {qaIssues.map((issue) => (
          <article key={issue.id} className="gl-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-400">{issue.id}</p>
              <span className={`gl-badge ${severityClass(issue.severity)}`}>
                {issue.severity}
              </span>
            </div>
            <h2 className="text-base font-semibold text-white">{issue.category}</h2>
            <p className="mt-3 text-sm text-slate-300">
              <span className="text-slate-400">Source:</span> {issue.source}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              <span className="text-slate-400">AI Draft:</span> {issue.aiDraft}
            </p>
            <p className="mt-2 rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm text-cyan-100">
              <span className="text-cyan-300">Suggested fix:</span> {issue.suggestedFix}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
