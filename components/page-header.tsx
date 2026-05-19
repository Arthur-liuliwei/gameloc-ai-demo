type PageHeaderProps = {
  title: string;
  subtitle: string;
  badge?: string;
};

export default function PageHeader({ title, subtitle, badge }: PageHeaderProps) {
  return (
    <header className="gl-panel border-slate-800/90 bg-gradient-to-br from-slate-900/90 to-slate-950/95">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="gl-heading-page">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{subtitle}</p>
        </div>
        {badge ? (
          <span className="gl-badge border-cyan-500/30 bg-cyan-500/10 text-cyan-200">{badge}</span>
        ) : null}
      </div>
    </header>
  );
}
