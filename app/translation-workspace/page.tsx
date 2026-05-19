import PageHeader from "@/components/page-header";
import TranslationWorkspaceTable from "@/components/translation-workspace-table";

export default function TranslationWorkspacePage() {
  return (
    <main className="space-y-6">
      <PageHeader
        title="Translation Workspace"
        subtitle="Producer workspace for AI drafts, human finals, glossary enforcement, and QA — switch Card or List view anytime."
        badge="Production"
      />
      <TranslationWorkspaceTable />
    </main>
  );
}
