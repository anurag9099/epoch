import { NextResponse } from "next/server";
import { get } from "@/lib/db";
import { analyzeUserState, AnalysisResult } from "@/lib/analyzer";

let cachedResult: AnalysisResult | null = null;
let cachedAt = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  const now = Date.now();

  // Check cache
  if (cachedResult && now - cachedAt < CACHE_TTL) {
    return NextResponse.json({ ...cachedResult, cached: true });
  }

  // Also check DB for recent analysis timestamp
  const lastSignal = await get(
    "SELECT MAX(created_at) as ts FROM user_signals WHERE is_active = 1"
  );
  if (lastSignal?.ts && cachedResult) {
    const lastTs = new Date(lastSignal.ts as string).getTime();
    if (now - lastTs < CACHE_TTL) {
      return NextResponse.json({ ...cachedResult, cached: true });
    }
  }

  const result = await analyzeUserState();
  cachedResult = result;
  cachedAt = now;

  return NextResponse.json(result);
}
