import { NextResponse } from "next/server";
import { checkNudges } from "@/lib/nudges";
import { trackEvent } from "@/lib/observer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const nudge = await checkNudges();

    if (nudge) {
      await trackEvent("nudge_shown", {
        payload: { type: nudge.type },
      });
      return NextResponse.json({ nudge });
    }

    return NextResponse.json({ nudge: null });
  } catch (error) {
    console.error("Nudge check failed:", error);
    return NextResponse.json({ nudge: null });
  }
}
