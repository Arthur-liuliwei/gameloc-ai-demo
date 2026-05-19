import { NextResponse } from "next/server";
import { DEMO_AI_DISABLED_MESSAGE } from "@/lib/ai-messages";

export { DEMO_AI_DISABLED_MESSAGE } from "@/lib/ai-messages";

/**
 * Server-only: OpenAI is allowed when not running on Vercel.
 * Local `next dev` / `next start` keep AI enabled (VERCEL is unset).
 */
export function isAiEnabledOnServer(): boolean {
  return process.env.VERCEL !== "1";
}

/** JSON response for blocked AI API routes (never calls OpenAI). */
export function aiDisabledApiResponse(extra?: Record<string, unknown>) {
  return NextResponse.json(
    {
      error: DEMO_AI_DISABLED_MESSAGE,
      demoViewOnly: true,
      ...extra
    },
    { status: 403 }
  );
}
