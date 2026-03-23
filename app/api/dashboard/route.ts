import { NextResponse } from "next/server";
import { get, query } from "@/lib/db";
import { getLearnerProfile } from "@/lib/profile";
import {
  epochBrand,
  flagshipPath,
  missionRouteForTask,
  specializationForPhase,
  stageLabelForPhase,
} from "@/lib/path";
import {
  getLastTrackedEvent,
  getTrackedSecondsForDate,
  getTrackedSecondsSince,
} from "@/lib/session-analytics";
import { getStreak } from "@/lib/streak";
import { buildRecoveryState } from "@/lib/recovery";
import { getProofSummary } from "@/lib/artifacts";
import { getMissionProof, getRecentProofCapture } from "@/lib/proof";
import { peekNudge } from "@/lib/nudges";
import { buildDashboardBriefing } from "@/lib/intelligence/presenter";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getLearnerProfile();
  const streak = await getStreak();

  const startDateRow = await get("SELECT MIN(date) as start_date FROM daily_log");
  const startDate = startDateRow?.start_date as string | null;
  let currentDay = 1;
  if (startDate) {
    const diff = Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000);
    currentDay = Math.min(diff + 1, 42);
  }

  const todayTasks = await query(
    "SELECT * FROM tasks WHERE scheduled_day = ? ORDER BY order_num",
    [currentDay]
  );

  const nextActionTask = await get(
    `SELECT *
     FROM tasks
     WHERE status != 'complete' AND scheduled_day IS NOT NULL
     ORDER BY scheduled_day ASC, order_num ASC
     LIMIT 1`
  );

  const phases = await query(`
    SELECT p.*,
      (SELECT COUNT(*) FROM tasks WHERE phase_id = p.id AND status = 'complete') as completed,
      (SELECT COUNT(*) FROM tasks WHERE phase_id = p.id) as total
    FROM phases p ORDER BY order_num
  `);

  const totalDone = await get("SELECT COUNT(*) as c FROM tasks WHERE status = 'complete'");
  const totalTasks = await get("SELECT COUNT(*) as c FROM tasks");
  const quizzesPassed = await get("SELECT COUNT(*) as c FROM quiz_results WHERE passed = 1");

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split("T")[0];
  const [hoursThisWeek, trackedSecondsThisWeek] = await Promise.all([
    get(
      "SELECT COALESCE(SUM(minutes_spent), 0) as total_minutes FROM daily_log WHERE date >= ?",
      [weekStartStr]
    ),
    getTrackedSecondsSince(weekStartStr),
  ]);
  const today = new Date().toISOString().split("T")[0];

  const goals = await query(
    "SELECT * FROM goals WHERE status = 'active' ORDER BY created_at DESC LIMIT 3"
  );

  const focusTask =
    todayTasks.find((task) => task.status !== "complete") ??
    nextActionTask ??
    todayTasks[0] ??
    null;

  const currentPhase =
    phases.find((phase) => phase.id === focusTask?.phase_id) ??
    phases.find((phase) => phase.status === "active") ??
    phases.find((phase) => phase.status === "locked") ??
    null;

  const supportTasks = focusTask
    ? await query(
        `SELECT id, title, type, status, estimated_minutes
         FROM tasks
         WHERE status != 'complete'
           AND scheduled_day IS NOT NULL
           AND id != ?
         ORDER BY scheduled_day ASC, order_num ASC
         LIMIT 3`,
        [focusTask.id]
      )
    : [];

  const overdueTask = await get(
    `SELECT id, title, type, scheduled_day
     FROM tasks
     WHERE status != 'complete' AND scheduled_day IS NOT NULL AND scheduled_day < ?
     ORDER BY scheduled_day ASC
     LIMIT 1`,
    [currentDay]
  );

  const backlogDays = overdueTask?.scheduled_day
    ? Math.max(1, currentDay - (overdueTask.scheduled_day as number))
    : 0;

  const currentPhaseId = (currentPhase?.id as number | undefined) ?? 1;
  const weeklyOutcomeTitle = currentPhase
    ? `${currentPhase.name} in motion`
    : "Keep the path moving";
  const weeklyOutcomeSummary = focusTask
    ? `This week is about finishing ${focusTask.title} and keeping your evidence trail current.`
    : currentPhase
      ? (currentPhase.description as string)
      : "Keep learning momentum high and turn completed work into proof.";

  const [proofSummary, inlineNudge] = await Promise.all([
    getProofSummary(),
    peekNudge({ includeUrgencies: ["medium", "low"] }),
  ]);

  const [trackedSecondsToday, missionTrackedSecondsToday, lastTrackedEvent] = await Promise.all([
    getTrackedSecondsForDate(today),
    focusTask ? getTrackedSecondsForDate(today, focusTask.id as number) : Promise.resolve(0),
    getLastTrackedEvent(),
  ]);
  const missionProof = await getMissionProof(
    focusTask
      ? {
          id: focusTask.id as number,
          title: focusTask.title as string,
          type: focusTask.type as string,
          scheduled_day: (focusTask.scheduled_day as number | null) ?? null,
          phase_id: (focusTask.phase_id as number | null) ?? null,
        }
      : null
  );
  const recentProofCapture = await getRecentProofCapture();

  const trackedMinutesToday = Math.round(trackedSecondsToday / 60);
  const missionTrackedMinutesToday = Math.round(missionTrackedSecondsToday / 60);
  const recoveryState = buildRecoveryState({
    trackedMinutesToday,
    currentMission: focusTask
      ? {
          id: focusTask.id as number,
          title: focusTask.title as string,
          type: focusTask.type as string,
          estimated_minutes: (focusTask.estimated_minutes as number | null) ?? null,
        }
      : null,
    overdueTask: overdueTask
      ? {
          id: overdueTask.id as number,
          title: overdueTask.title as string,
          type: overdueTask.type as string,
        }
      : null,
    lastActiveDate: (streak.last_active_date as string | null) ?? null,
  });
  const briefing = await buildDashboardBriefing({
    currentDay,
    missionTitle: (focusTask?.title as string | undefined) ?? null,
    activePhaseName: (currentPhase?.name as string | undefined) ?? null,
    brandPromise: epochBrand.promise,
  });

  return NextResponse.json({
    brand: epochBrand,
    profile,
    activePath: {
      id: flagshipPath.id,
      name: profile.active_path_name,
      descriptor: epochBrand.descriptor,
      audience: flagshipPath.audience,
      targetRole: profile.target_role,
      primarySpecialization: profile.primary_specialization,
      stageLabel: stageLabelForPhase(currentPhaseId),
      specializationLabel: specializationForPhase(currentPhaseId),
      promise: epochBrand.promise,
    },
    streak,
    currentDay,
    todayTasks,
    phases,
    currentMission: focusTask
      ? {
          id: focusTask.id,
          title: focusTask.title,
          type: focusTask.type,
          status: focusTask.status,
          estimatedMinutes: focusTask.estimated_minutes,
          scheduledDay: focusTask.scheduled_day,
          route: missionRouteForTask({
            id: focusTask.id as number,
            type: focusTask.type as string,
          }),
          phaseName: currentPhase?.name,
          stageLabel: stageLabelForPhase(currentPhaseId),
          specializationLabel: specializationForPhase(currentPhaseId),
          supportingTasks: supportTasks,
        }
      : null,
    weeklyOutcome: {
      title: weeklyOutcomeTitle,
      summary: weeklyOutcomeSummary,
      stageLabel: stageLabelForPhase(currentPhaseId),
      specializationLabel: specializationForPhase(currentPhaseId),
    },
    briefing,
    recoveryState: overdueTask
      ? {
          ...recoveryState,
          message: `${recoveryState.message} Backlog currently spans ${backlogDays} day${backlogDays === 1 ? "" : "s"}.`,
        }
      : recoveryState,
    telemetry: {
      trackedMinutesToday,
      trackedMinutesThisWeek: Math.round(trackedSecondsThisWeek / 60),
      missionTrackedMinutesToday,
      focusState:
        trackedMinutesToday >= 45 ? "locked_in" : trackedMinutesToday > 0 ? "warming_up" : "cold_start",
      lastActiveAt: lastTrackedEvent?.created_at ?? null,
    },
    missionProof,
    recentProofCapture,
    stats: {
      tasksDone: totalDone?.c ?? 0,
      totalTasks: totalTasks?.c ?? 0,
      quizzesPassed: quizzesPassed?.c ?? 0,
      hoursThisWeek: trackedSecondsThisWeek > 0
        ? Math.round((trackedSecondsThisWeek / 3600) * 10) / 10
        : Math.round((((hoursThisWeek?.total_minutes as number) ?? 0) / 60) * 10) / 10,
    },
    proof: {
      readyCount: proofSummary.readyCount,
      draftCount: proofSummary.draftCount,
      totalCount: proofSummary.totalCount,
      capturedSignals: proofSummary.capturedSignals,
      totalSignals: proofSummary.totalSignals,
      headline: proofSummary.headline,
    },
    inlineNudge,
    goals,
  });
}
