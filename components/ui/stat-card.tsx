import type { ReactNode } from "react";

type StatCardTone = "cyan" | "emerald" | "amber" | "violet" | "slate" | "rose";

const toneRing: Record<StatCardTone, string> = {
  cyan: "border-cyan-500/20 bg-cyan-500/[0.06]",
  emerald: "border-emerald-500/20 bg-emerald-500/[0.06]",
  amber: "border-amber-500/20 bg-amber-500/[0.06]",
  violet: "border-violet-500/20 bg-violet-500/[0.06]",
  slate: "border-slate-700/80 bg-slate-900/50",
  rose: "border-rose-500/20 bg-rose-500/[0.06]"
};

const toneValue: Record<StatCardTone, string> = {
  cyan: "text-cyan-200",
  emerald: "text-emerald-200",
  amber: "text-amber-200",
  violet: "text-violet-200",
  slate: "text-slate-100",
  rose: "text-rose-200"
};

type StatCardProps = {
  label: string;
  value: string | number;
  detail?: string;
  tone?: StatCardTone;
  icon?: ReactNode;
};

export function StatCard({ label, value, detail, tone = "slate", icon }: StatCardProps) {
  return (
    <article className={`gl-card flex flex-col p-4 ${toneRing[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
        {icon ? <span className="text-slate-500">{icon}</span> : null}
      </div>
      <p className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight ${toneValue[tone]}`}>{value}</p>
      {detail ? <p className="mt-1 text-xs leading-snug text-slate-500">{detail}</p> : null}
    </article>
  );
}
