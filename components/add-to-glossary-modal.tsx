"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import type { GlossaryCategory, GlossaryPriority } from "@/lib/glossary-types";
import { GLOSSARY_CATEGORIES, GLOSSARY_PRIORITIES } from "@/lib/glossary-types";

export type AddToGlossaryFormValues = {
  sourceTerm: string;
  targetTerm: string;
  category: GlossaryCategory;
  notes: string;
  priority: GlossaryPriority;
};

type AddToGlossaryModalProps = {
  open: boolean;
  onClose: () => void;
  /** Bump when opening so form re-syncs from latest selections */
  formVersion: number;
  initialSourceTerm: string;
  initialTargetTerm: string;
  /** Shown under Target term when suggestion came from translation context */
  targetTermHint: "auto" | "no-match" | null;
  contextLabel: string;
  onSave: (values: AddToGlossaryFormValues) => void;
};

export function AddToGlossaryModal({
  open,
  onClose,
  formVersion,
  initialSourceTerm,
  initialTargetTerm,
  targetTermHint,
  contextLabel,
  onSave
}: AddToGlossaryModalProps) {
  const titleId = useId();
  const [sourceTerm, setSourceTerm] = useState("");
  const [targetTerm, setTargetTerm] = useState("");
  const [category, setCategory] = useState<GlossaryCategory>("UI");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<GlossaryPriority>("Preferred");

  const [targetHint, setTargetHint] = useState<"auto" | "no-match" | null>(null);

  useEffect(() => {
    if (!open) return;
    setSourceTerm(initialSourceTerm);
    setTargetTerm(initialTargetTerm);
    setTargetHint(targetTermHint);
    setCategory("UI");
    setPriority("Preferred");
    setNotes("");
  }, [open, formVersion, initialSourceTerm, initialTargetTerm, targetTermHint]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const s = sourceTerm.trim();
    const t = targetTerm.trim();
    if (!s && !t) return;
    onSave({
      sourceTerm: s,
      targetTerm: t,
      category,
      notes: notes.trim(),
      priority
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
      role="presentation"
      data-glossary-modal="root"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-slate-700/90 bg-slate-950 p-5 shadow-2xl shadow-black/50 ring-1 ring-cyan-500/10"
        data-glossary-modal="panel"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-slate-100">
              Add to Glossary
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">{contextLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
          >
            Esc
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Source term
            </span>
            <input
              value={sourceTerm}
              onChange={(e) => setSourceTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/15"
              placeholder="English / source string"
              autoComplete="off"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Target term
            </span>
            <input
              value={targetTerm}
              onChange={(e) => setTargetTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/15"
              placeholder="Localized term"
              autoComplete="off"
            />
            {targetHint === "auto" ? (
              <p className="mt-1 text-[11px] text-cyan-500/80">Auto-suggested from current translation</p>
            ) : targetHint === "no-match" ? (
              <p className="mt-1 text-[11px] text-slate-500">No target match detected</p>
            ) : null}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Category
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GlossaryCategory)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500/50"
              >
                {GLOSSARY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Priority
              </span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as GlossaryPriority)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500/50"
              >
                {GLOSSARY_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/15"
              placeholder="Style notes, banned variants, context…"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!sourceTerm.trim() && !targetTerm.trim()}
              className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
