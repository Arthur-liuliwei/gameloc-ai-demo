import type { NextConfig } from "next";

/** Vercel sets VERCEL=1 at build time; expose a client flag so UI can disable AI actions. */
const demoViewOnly = process.env.VERCEL === "1";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_DEMO_VIEW_ONLY: demoViewOnly ? "true" : "false"
  }
};

export default nextConfig;
