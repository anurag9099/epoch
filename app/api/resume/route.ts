import { NextResponse } from "next/server";
import { getProofSignals, getProofSummary, listProofArtifacts } from "@/lib/artifacts";

export const dynamic = "force-dynamic";

export async function GET() {
  const [artifacts, signals, summary] = await Promise.all([
    listProofArtifacts(),
    getProofSignals(),
    getProofSummary(),
  ]);

  return NextResponse.json({
    artifacts,
    signals,
    summary,
  });
}
