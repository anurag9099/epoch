import { NextResponse } from "next/server";
import { get } from "@/lib/db";
import { buildUnitySignalContext, getPresentedSignals } from "@/lib/intelligence/presenter";
import { missionRouteForTask, specializationForPhase, stageLabelForPhase } from "@/lib/path";
import { peekNudge } from "@/lib/nudges";

export const dynamic = "force-dynamic";

export async function GET() {
  const firstLog = await get("SELECT MIN(date) as d FROM daily_log");
  let currentDay = 1;
  if (firstLog?.d) {
    currentDay = Math.min(
      Math.floor((Date.now() - new Date(firstLog.d as string).getTime()) / 86400000) + 1,
      42
    );
  }

  const focusTask = await get(
    `SELECT *
     FROM tasks
     WHERE status != 'complete' AND scheduled_day IS NOT NULL
     ORDER BY scheduled_day ASC, order_num ASC
     LIMIT 1`
  );

  const currentPhase = focusTask?.phase_id
    ? await get("SELECT id, name FROM phases WHERE id = ?", [focusTask.phase_id])
    : await get("SELECT id, name FROM phases WHERE status = 'active' ORDER BY order_num ASC LIMIT 1");

  const [unityFocus, signals, nudge] = await Promise.all([
    buildUnitySignalContext(),
    getPresentedSignals(["proof_gap", "drift", "confusion", "momentum"], 4),
    peekNudge({ includeUrgencies: ["medium", "low", "high"] }),
  ]);

  const phaseId = (currentPhase?.id as number | undefined) ?? 1;

  return NextResponse.json({
    currentDay,
    mission: focusTask
      ? {
          id: focusTask.id as number,
          title: focusTask.title as string,
          type: focusTask.type as string,
          route: missionRouteForTask({
            id: focusTask.id as number,
            type: focusTask.type as string,
          }),
          stageLabel: stageLabelForPhase(phaseId),
          specializationLabel: specializationForPhase(phaseId),
          phaseName: (currentPhase?.name as string | undefined) ?? null,
        }
      : null,
    focus: unityFocus,
    signals,
    nudge,
    tools: {
      webSearchEnabled: true,
    },
  });
}
