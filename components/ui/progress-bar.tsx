type ProgressBarTone = "cyan" | "emerald" | "amber" | "violet" | "indigo";

const toneFill: Record<ProgressBarTone, string> = {
  cyan: "from-cyan-400 to-cyan-600",
  emerald: "from-emerald-400 to-emerald-600",
  amber: "from-amber-400 to-amber-600",
  violet: "from-violet-400 to-violet-600",
  indigo: "from-indigo-400 to-indigo-600"
};

type ProgressBarProps = {
  label: string;
  value: number;
  hint?: string;
  tone?: ProgressBarTone;
};

export function ProgressBar({ label, value, hint, tone = "cyan" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  if (!label.trim()) {
    return (
      <div className="h-2 overflow-hidden rounded-full bg-slate-800/90 ring-1 ring-slate-700/50">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${toneFill[tone]}`}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-slate-200">{label}</span>
        <span className="tabular-nums text-slate-400">
          {clamped}%
          {hint ? <span className="ml-1.5 hidden text-xs text-slate-500 sm:inline">· {hint}</span> : null}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800/90 ring-1 ring-slate-700/50">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${toneFill[tone]} transition-[width] duration-500 ease-out`}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        />
      </div>
    </div>
  );
}
