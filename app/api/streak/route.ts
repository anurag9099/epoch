import { NextResponse } from "next/server";
import { getStreak } from "@/lib/streak";

export const dynamic = "force-dynamic";

export async function GET() {
  const streak = await getStreak();
  return NextResponse.json(streak);
}
