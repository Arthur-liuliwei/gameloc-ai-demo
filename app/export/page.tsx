import PageHeader from "@/components/page-header";
import { ExportDeliverablesPanel } from "@/components/export-deliverables-panel";

export default function ExportPage() {
  return (
    <main className="space-y-6">
      <PageHeader
        title="Export"
        subtitle="Generate localization deliverables after QA and human review sign-off."
      />

      <ExportDeliverablesPanel />

      <section className="gl-panel">
        <h2 className="text-lg font-semibold">Other formats (demo)</h2>
        <p className="mt-2 text-sm text-slate-300">
          Placeholder actions for future pipeline wiring. Excel exports above use SheetJS (via{" "}
          <code className="rounded bg-slate-800 px-1 py-0.5 font-mono text-xs">xlsx-js-style</code>, the same{" "}
          <code className="rounded bg-slate-800 px-1 py-0.5 font-mono text-xs">xlsx</code> API with styles preserved on
          write).
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            { label: "Export CSV", detail: ".csv for pipeline import and automation" },
            { label: "Export PO", detail: ".po for gettext-compatible localization tools" },
            { label: "Export Demo Report", detail: "Visual report with KPI and QA summary" }
          ].map((button) => (
            <button
              key={button.label}
              type="button"
              className="gl-quick-action"
            >
              <p className="text-base font-semibold text-white">{button.label}</p>
              <p className="mt-1 text-sm text-slate-300">{button.detail}</p>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
