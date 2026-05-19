"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/page-header";
import { useGlossary } from "@/contexts/glossary-context";
import {
  GLOSSARY_CATEGORIES,
  GLOSSARY_PRIORITIES,
  PRIORITY_SORT_ORDER,
  type GlossaryCategory,
  type GlossaryEntry,
  type GlossaryPriority
} from "@/lib/glossary-types";

function priorityBadgeClass(p: GlossaryPriority): string {
  if (p === "Required") return "border-rose-500/35 bg-rose-500/10 text-rose-200";
  if (p === "Preferred") return "border-cyan-500/35 bg-cyan-500/10 text-cyan-200";
  return "border-amber-500/35 bg-amber-500/10 text-amber-200";
}

function categoryBadgeClass(): string {
  return "border-slate-600 bg-slate-800/80 text-slate-300";
}

const emptyForm = {
  sourceTerm: "",
  targetTerm: "",
  category: "UI" as GlossaryCategory,
  notes: "",
  priority: "Preferred" as GlossaryPriority
};

export default function GlossaryManagerClient() {
  const { entries, addEntry, updateEntry, deleteEntry, resetToDefaults } = useGlossary();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<GlossaryCategory | "All">("All");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<GlossaryEntry>>({});

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = entries.filter((e) => {
      const catOk = categoryFilter === "All" || e.category === categoryFilter;
      if (!q) return catOk;
      const text =
        `${e.sourceTerm} ${e.targetTerm} ${e.notes} ${e.category} ${e.priority}`.toLowerCase();
      return catOk && text.includes(q);
    });
    list = [...list].sort((a, b) => {
      const pr = PRIORITY_SORT_ORDER[a.priority] - PRIORITY_SORT_ORDER[b.priority];
      if (pr !== 0) return pr;
      return a.sourceTerm.localeCompare(b.sourceTerm);
    });
    return list;
  }, [entries, search, categoryFilter]);

  function startEdit(row: GlossaryEntry) {
    setEditingId(row.id);
    setEditDraft({ ...row });
  }

  function saveEdit() {
    if (!editingId || !editDraft.sourceTerm?.trim() || !editDraft.targetTerm?.trim()) return;
    updateEntry(editingId, {
      sourceTerm: editDraft.sourceTerm.trim(),
      targetTerm: editDraft.targetTerm.trim(),
      category: editDraft.category,
      notes: editDraft.notes ?? "",
      priority: editDraft.priority
    });
    setEditingId(null);
    setEditDraft({});
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft({});
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sourceTerm.trim() || !form.targetTerm.trim()) return;
    addEntry({
      sourceTerm: form.sourceTerm.trim(),
      targetTerm: form.targetTerm.trim(),
      category: form.category,
      notes: form.notes.trim(),
      priority: form.priority
    });
    setForm(emptyForm);
  }

  return (
    <main className="space-y-6">
      <PageHeader
        title="Glossary Manager"
        subtitle="Define and enforce terminology for AI-assisted translation. Entries sync to Translation Workspace and the /api/translate prompt."
      />

      <section className="gl-panel">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="gl-heading-section">Glossary library</h2>
            <p className="mt-1 text-sm text-slate-400">
              {entries.length} entries • {filteredSorted.length} shown
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm("Reset glossary to default AAA demo data?")) resetToDefaults();
            }}
            className="gl-btn-secondary"
          >
            Reset to defaults
          </button>
        </div>

        <div className="mb-6 flex flex-col gap-3 lg:flex-row">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search source, target, notes…"
            className="gl-input flex-1"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as GlossaryCategory | "All")}
            className="gl-select"
          >
            <option value="All">All categories</option>
            {GLOSSARY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <form
          onSubmit={handleAdd}
          className="gl-subpanel mb-8"
        >
          <h3 className="mb-3 text-sm font-semibold text-slate-200">Add new entry</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <input
              required
              value={form.sourceTerm}
              onChange={(e) => setForm((f) => ({ ...f, sourceTerm: e.target.value }))}
              placeholder="Source term"
              className="gl-select"
            />
            <input
              required
              value={form.targetTerm}
              onChange={(e) => setForm((f) => ({ ...f, targetTerm: e.target.value }))}
              placeholder="Target term (zh-CN)"
              className="gl-select"
            />
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as GlossaryCategory }))}
              className="gl-select"
            >
              {GLOSSARY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as GlossaryPriority }))}
              className="gl-select"
            >
              {GLOSSARY_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes (style, context, bans…)"
              className="md:col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400/60 lg:col-span-2"
            />
            <button
              type="submit"
              className="gl-btn-primary"
            >
              Add entry
            </button>
          </div>
        </form>

        <div className="space-y-3">
          {filteredSorted.map((row) => (
            <article
              key={row.id}
              className="gl-card p-4"
            >
              {editingId === row.id ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input
                    value={editDraft.sourceTerm ?? ""}
                    onChange={(e) => setEditDraft((d) => ({ ...d, sourceTerm: e.target.value }))}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  />
                  <input
                    value={editDraft.targetTerm ?? ""}
                    onChange={(e) => setEditDraft((d) => ({ ...d, targetTerm: e.target.value }))}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  />
                  <select
                    value={editDraft.category}
                    onChange={(e) =>
                      setEditDraft((d) => ({ ...d, category: e.target.value as GlossaryCategory }))
                    }
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  >
                    {GLOSSARY_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    value={editDraft.priority}
                    onChange={(e) =>
                      setEditDraft((d) => ({ ...d, priority: e.target.value as GlossaryPriority }))
                    }
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  >
                    {GLOSSARY_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={editDraft.notes ?? ""}
                    onChange={(e) => setEditDraft((d) => ({ ...d, notes: e.target.value }))}
                    rows={2}
                    className="md:col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2 md:col-span-2">
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-100"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`gl-badge ${priorityBadgeClass(row.priority)}`}>
                        {row.priority}
                      </span>
                      <span className={`gl-badge ${categoryBadgeClass()}`}>
                        {row.category}
                      </span>
                    </div>
                    <p className="text-sm text-slate-100">
                      <span className="text-slate-400">EN</span> {row.sourceTerm}
                    </p>
                    <p className="text-sm text-cyan-200">
                      <span className="text-slate-400">zh-CN</span> {row.targetTerm}
                    </p>
                    {row.notes ? <p className="text-xs text-slate-500">{row.notes}</p> : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:border-cyan-500/40"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete “${row.sourceTerm}”?`)) deleteEntry(row.id);
                      }}
                      className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
