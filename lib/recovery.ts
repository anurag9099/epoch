import { missionRouteForTask } from "./path";

type RecoverableTask = {
  id: number;
  title: string;
  type: string;
  estimated_minutes?: number | null;
};

export type RecoveryStatus = "needs_recovery" | "restart_ready" | "on_track";

export interface RecoveryState {
  status: RecoveryStatus;
  title: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
  microSessionMinutes: number;
  plan: string[];
}

function restartPlan(task: RecoverableTask | null): string[] {
  if (!task) {
    return [
      "Pick one incomplete task and commit to a single uninterrupted block.",
      "Do the smallest step that creates forward motion.",
      "Leave one note behind so tomorrow starts with context.",
    ];
  }

  if (task.type === "lab") {
    return [
      "Reopen the lab and run the current code path before changing anything.",
      "Make one measurable improvement or fix one blocking error.",
      "Record one metric, output, or design note as proof before leaving.",
    ];
  }

  if (task.type === "quiz") {
    return [
      "Review the missed concept only, not the whole phase.",
      "Retry one focused question set while the concept is fresh.",
      "Capture the concept that was confusing so Unity can help next time.",
    ];
  }

  return [
    "Spend 3 minutes skimming your last notes or the previous section.",
    "Finish one section or one focused block of the task.",
    "Write one takeaway that can convert into proof later.",
  ];
}

function daysSince(date: string | null): number | null {
  if (!date) return null;
  const diffMs = Date.now() - new Date(date).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return 0;
  return Math.floor(diffMs / 86400000);
}

export function buildRecoveryState(opts: {
  trackedMinutesToday: number;
  currentMission: RecoverableTask | null;
  overdueTask: RecoverableTask | null;
  lastActiveDate: string | null;
}): RecoveryState {
  const { trackedMinutesToday, currentMission, overdueTask, lastActiveDate } = opts;
  const daysAway = daysSince(lastActiveDate);

  if (overdueTask) {
    const backlogDays = Math.max(1, daysAway ?? 1);
    const minutes = Math.min(Math.max(overdueTask.estimated_minutes ?? 20, 20), 35);
    return {
      status: "needs_recovery",
      title: "Recovery mode",
      message: `You have drift around ${overdueTask.title}. Take a ${minutes}-minute restart block, clear the first blocker, and get the path moving again.`,
      ctaLabel: `Start ${minutes}-minute restart`,
      ctaHref: `${missionRouteForTask(overdueTask)}?focus=restart`,
      microSessionMinutes: minutes,
      plan: [
        `Re-enter the overdue task and ignore the rest of the backlog for ${minutes} minutes.`,
        ...restartPlan(overdueTask).slice(1),
        backlogDays > 1
          ? `You have been away from this track for ${backlogDays} days. End with one note so the next session starts clean.`
          : "End the block by leaving one clear note for the next session.",
      ],
    };
  }

  if (trackedMinutesToday === 0 && currentMission) {
    const minutes = Math.min(Math.max(currentMission.estimated_minutes ?? 20, 20), 30);
    return {
      status: "restart_ready",
      title: "Start window open",
      message: `No focused time has been captured yet today. Start with a ${minutes}-minute block on ${currentMission.title} before context decays.`,
      ctaLabel: `Start ${minutes}-minute mission`,
      ctaHref: `${missionRouteForTask(currentMission)}?focus=warmup`,
      microSessionMinutes: minutes,
      plan: restartPlan(currentMission),
    };
  }

  if ((daysAway ?? 0) >= 2 && currentMission) {
    return {
      status: "needs_recovery",
      title: "Return to flow",
      message: `You have been away for ${daysAway} days. Do not resume the whole roadmap. Restart from the current mission and finish one bounded block.`,
      ctaLabel: "Resume current mission",
      ctaHref: `${missionRouteForTask(currentMission)}?focus=return`,
      microSessionMinutes: 20,
      plan: restartPlan(currentMission),
    };
  }

  return {
    status: "on_track",
    title: "On track",
    message:
      trackedMinutesToday >= 45
        ? "You already have meaningful deep-work time logged today. Keep the block tight and convert the output into proof."
        : "Momentum is live. Keep compounding depth and leave a clear artifact behind.",
    ctaLabel: currentMission ? "Continue current mission" : "Review proof",
    ctaHref: currentMission ? missionRouteForTask(currentMission) : "/resume",
    microSessionMinutes: currentMission?.estimated_minutes ?? 25,
    plan: currentMission
      ? [
          "Finish the current mission before opening new material.",
          "Use Unity only when the task is blocked, not as ambient chat.",
          "End the session by recording one proof-worthy result.",
        ]
      : restartPlan(null),
  };
}
