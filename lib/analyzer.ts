import { execute, get } from "./db";
import { createGapLab } from "./lab-generator";
import { buildLearningState } from "./intelligence/signals";

export interface AnalysisResult {
  topicScores: Array<{ topic: string; score: number; phase_id: number }>;
  signals: Array<{ signal_type: string; topic: string; confidence: number; evidence: string }>;
  pace: { currentDay: number; expectedProgress: number; actualProgress: number; prediction: string };
}

export async function analyzeUserState(): Promise<AnalysisResult> {
  const state = await buildLearningState();

  for (const snapshot of state.topicSnapshots) {
    await execute(
      `UPDATE topic_scores
       SET score = ?, quiz_score = ?, lab_completed = ?, time_spent_minutes = ?, updated_at = datetime('now')
       WHERE topic = ?`,
      [
        snapshot.score,
        snapshot.quizAccuracy,
        snapshot.labCompleted,
        snapshot.trackedMinutes,
        snapshot.topic,
      ]
    );
  }

  await execute("UPDATE user_signals SET is_active = 0");
  for (const signal of state.signals) {
    await execute(
      "INSERT INTO user_signals (signal_type, topic, confidence, evidence) VALUES (?, ?, ?, ?)",
      [signal.signal_type, signal.topic, signal.confidence, signal.evidence]
    );
  }

  try {
    const weakestTopics = state.topicSnapshots
      .filter((snapshot) => snapshot.score < 40)
      .sort((a, b) => a.score - b.score)
      .slice(0, 2);

    for (const topic of weakestTopics) {
      const existingLab = await get(
        "SELECT id FROM tasks WHERE type = 'lab' AND phase_id = ? AND title LIKE ?",
        [topic.phase_id, `%${topic.topic.replace(/_/g, " ")}%`]
      );
      if (!existingLab) {
        await createGapLab(
          topic.topic.replace(/_/g, " "),
          topic.phase_id,
          `Confusion signal active with score ${topic.score}/100 — targeted practice recommended`
        );
      }
    }
  } catch {
    // Non-critical: analysis should still succeed if gap-lab generation fails.
  }

  return {
    topicScores: state.topicSnapshots.map((snapshot) => ({
      topic: snapshot.topic,
      score: snapshot.score,
      phase_id: snapshot.phase_id,
    })),
    signals: state.signals,
    pace: state.pace,
  };
}
