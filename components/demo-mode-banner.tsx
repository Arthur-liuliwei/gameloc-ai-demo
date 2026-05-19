"use client";

import { DEMO_BANNER_MESSAGE, isDemoViewOnly } from "@/lib/demo-view-only";

export function DemoModeBanner() {
  if (!isDemoViewOnly()) return null;

  return (
    <div
      className="mb-4 rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-100"
      role="status"
    >
      {DEMO_BANNER_MESSAGE}
    </div>
  );
}
