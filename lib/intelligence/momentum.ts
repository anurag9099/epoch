import { get, query } from "../db";
import { getTrackedSecondsSince } from "../session-analytics";
import { confidenceFromScore, toDateOnly } from "./common";
import type { LearningSignal, PaceSnapshot } from "./types";

export async function buildMomentumSignals(pace: PaceSnapshot): Promise<LearningSignal[]> {
  const [studyRows, streak, trackedSeconds7d] = await Promise.all([
    query("SELECT date, tasks_completed, minutes_spent FROM daily_log ORDER BY date DESC LIMIT 7"),
    get("SELECT current_streak FROM streaks WHERE id = 1"),
    getTrackedSecondsSince(toDateOnly(7)),
  ]);

  const activeDays = studyRows.filter(
    (row) => ((row.tasks_completed as number) ?? 0) > 0 || ((row.minutes_spent as number) ?? 0) > 0
  ).length;
  const trackedMinutes7d = Math.round(trackedSeconds7d / 60);
  const streakDays = (streak?.current_streak as number) ?? 0;
  const onTrack = pace.expectedProgress - pace.actualProgress <= 8;

  if (activeDays < 3 && trackedMinutes7d < 90 && streakDays < 2) {
    return [];
  }

  return [
    {
      signal_type: "momentum",
      topic: "overall",
      confidence: confidenceFromScore(
        0.45 +
          Math.min(0.15, trackedMinutes7d / 600) +
          Math.min(0.15, activeDays / 10) +
          (onTrack ? 0.08 : 0)
      ),
      evidence: `${activeDays}/7 active days, ${trackedMinutes7d} tracked minutes this week, streak ${streakDays} day${streakDays === 1 ? "" : "s"}.`,
    },
  ];
}
