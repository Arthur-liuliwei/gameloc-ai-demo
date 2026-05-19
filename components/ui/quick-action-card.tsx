import Link from "next/link";

type QuickActionCardProps = {
  href: string;
  label: string;
  description: string;
  primary?: boolean;
};

export function QuickActionCard({ href, label, description, primary }: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className={`gl-quick-action ${primary ? "border-cyan-500/30 bg-cyan-500/[0.06] ring-1 ring-cyan-500/15" : ""}`}
    >
      <span className={`text-sm font-semibold ${primary ? "text-cyan-100" : "text-slate-100"}`}>{label}</span>
      <span className="text-xs leading-snug text-slate-500">{description}</span>
    </Link>
  );
}
