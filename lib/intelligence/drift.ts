import { get, query } from "../db";
import { getTrackedSecondsSince } from "../session-analytics";
import { confidenceFromScore, daysBetween, toDateOnly } from "./common";
import type { LearningSignal, PaceSnapshot } from "./types";

export async function buildDriftSignals(currentDay: number, pace: PaceSnapshot): Promise<LearningSignal[]> {
  const [overdueTasks, streak, trackedSeconds7d] = await Promise.all([
    query(
      `SELECT id, title, scheduled_day, type
       FROM tasks
       WHERE status != 'complete'
         AND scheduled_day IS NOT NULL
         AND scheduled_day < ?
       ORDER BY scheduled_day ASC
       LIMIT 3`,
      [currentDay]
    ),
    get("SELECT current_streak, last_active_date FROM streaks WHERE id = 1"),
    getTrackedSecondsSince(toDateOnly(7)),
  ]);

  const signals: LearningSignal[] = overdueTasks.map((task) => {
    const overdueBy = Math.max(1, currentDay - ((task.scheduled_day as number) ?? currentDay));
    return {
      signal_type: "drift",
      topic: `task_${task.id as number}`,
      confidence: confidenceFromScore(0.52 + overdueBy * 0.06),
      evidence: `"${task.title}" is overdue by ${overdueBy} day${overdueBy === 1 ? "" : "s"}.`,
    };
  });

  const lastActiveDays = daysBetween((streak?.last_active_date as string | null) ?? null);
  if (pace.expectedProgress - pace.actualProgress >= 10) {
    const gap = pace.expectedProgress - pace.actualProgress;
    signals.push({
      signal_type: "drift",
      topic: "overall",
      confidence: confidenceFromScore(0.45 + gap / 40),
      evidence: `Expected ${pace.expectedProgress}% progress but actual progress is ${pace.actualProgress}% (gap ${gap}%).`,
    });
  }

  if ((lastActiveDays ?? 0) >= 2 && trackedSeconds7d < 90 * 60) {
    signals.push({
      signal_type: "drift",
      topic: "overall",
      confidence: confidenceFromScore(0.5 + ((lastActiveDays ?? 0) - 1) * 0.08),
      evidence: `No meaningful session has been recorded for ${lastActiveDays} days.`,
    });
  }

  return signals;
}
