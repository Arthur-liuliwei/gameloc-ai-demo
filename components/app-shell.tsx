"use client";

import { useState, type ReactNode } from "react";
import { DemoModeBanner } from "@/components/demo-mode-banner";
import Sidebar from "@/components/sidebar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen">
      <div
        className={`mx-auto grid w-full max-w-[88rem] grid-cols-1 gap-4 px-3 py-5 sm:gap-5 sm:px-5 sm:py-6 lg:px-8 ${
          sidebarCollapsed ? "lg:grid-cols-[4.25rem_1fr]" : "lg:grid-cols-[15.5rem_1fr]"
        }`}
      >
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapsed={() => setSidebarCollapsed((c) => !c)} />
        <div className="min-w-0 pb-8">
          <DemoModeBanner />
          {children}
        </div>
      </div>
    </div>
  );
}
