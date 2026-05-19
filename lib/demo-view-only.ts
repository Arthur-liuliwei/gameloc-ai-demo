import { DEMO_AI_DISABLED_MESSAGE, DEMO_BANNER_MESSAGE } from "@/lib/ai-messages";

/**
 * Client-safe flag (set at build time in next.config from VERCEL).
 * True on the public Vercel deployment; false on localhost.
 */
export function isDemoViewOnly(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_VIEW_ONLY === "true";
}

export { DEMO_AI_DISABLED_MESSAGE, DEMO_BANNER_MESSAGE };
