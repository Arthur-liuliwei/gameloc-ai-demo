"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconDashboard({ className, ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden {...p}>
      <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconFolderPlus({ className, ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden {...p}>
      <path d="M12 11v6M9 14h6" strokeLinecap="round" />
      <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5H9l1.5 2h8A1.5 1.5 0 0 1 20 8.5V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function IconTranslate({ className, ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden {...p}>
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" strokeLinejoin="round" />
      <path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" strokeLinecap="round" />
    </svg>
  );
}

function IconBook({ className, ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden {...p}>
      <path d="M6 4h5a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H6V4Z" strokeLinejoin="round" />
      <path d="M18 4h-5a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h6V4Z" strokeLinejoin="round" />
    </svg>
  );
}

function IconClipboard({ className, ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden {...p}>
      <path d="M9 4h6l1 2h3a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a1 1 0 0 1 1-1h3l1-2Z" strokeLinejoin="round" />
      <path d="M9 12h6M9 16h4" strokeLinecap="round" />
    </svg>
  );
}

function IconExport({ className, ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden {...p}>
      <path d="M12 4v10M8 8l4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBrandMark({ className, ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden {...p}>
      <path d="M12 3 4 7v5c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V7l-8-4Z" strokeLinejoin="round" />
      <path d="M9 11.5 11 13.5l4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const navItems: { href: string; label: string; short: string; Icon: ComponentType<IconProps> }[] = [
  { href: "/", label: "Dashboard", short: "Home", Icon: IconDashboard },
  { href: "/create-project", label: "Create Project", short: "New", Icon: IconFolderPlus },
  { href: "/translation-workspace", label: "Translation Workspace", short: "Translate", Icon: IconTranslate },
  { href: "/glossary-manager", label: "Glossary Manager", short: "Glossary", Icon: IconBook },
  { href: "/qa-report", label: "QA Report", short: "QA", Icon: IconClipboard },
  { href: "/export", label: "Export", short: "Export", Icon: IconExport }
];

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export default function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const iconClass = "h-4 w-4 shrink-0";

  return (
    <aside
      className={`gl-panel sticky top-5 z-10 h-fit w-full p-3 transition-[padding] duration-200 ${
        collapsed ? "lg:p-2" : ""
      }`}
    >
      <div className={`mb-4 ${collapsed ? "flex flex-col items-center gap-2" : "flex items-start gap-2"}`}>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="gl-btn-secondary flex h-8 w-8 shrink-0 items-center justify-center !p-0"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {!collapsed ? (
          <div className="min-w-0 flex-1 rounded-lg border border-cyan-500/25 bg-cyan-500/[0.08] px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-200">GameLoc AI</p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500">Localization SaaS demo</p>
          </div>
        ) : (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/[0.08]"
            title="GameLoc AI"
            aria-label="GameLoc AI"
          >
            <IconBrandMark className="h-5 w-5 text-cyan-200" />
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-0.5" role="navigation" aria-label="Main">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.Icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center rounded-lg text-xs font-medium transition ${
                collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-2.5 py-2"
              } ${
                active
                  ? "border border-cyan-500/35 bg-cyan-500/12 text-cyan-50 shadow-sm shadow-cyan-500/5"
                  : "border border-transparent text-slate-400 hover:border-slate-700/80 hover:bg-slate-800/50 hover:text-slate-100"
              }`}
            >
              <Icon className={iconClass} />
              {!collapsed ? <span className="min-w-0 truncate">{item.label}</span> : null}
              {collapsed ? <span className="sr-only">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      {!collapsed ? (
        <p className="mt-4 border-t border-slate-800/80 pt-3 text-[10px] leading-snug text-slate-500">
          Demo build · UI-only metrics from workspace snapshot
        </p>
      ) : null}
    </aside>
  );
}
