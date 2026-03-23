import { confidenceFromScore } from "./common";
import type { LearningSignal, TopicSnapshot } from "./types";

export function buildConfusionSignals(topicSnapshots: TopicSnapshot[]): LearningSignal[] {
  return topicSnapshots
    .filter(
      (snapshot) =>
        (snapshot.quizAttempts >= 2 && snapshot.quizAccuracy < 65) ||
        snapshot.chatQuestions >= 3 ||
        (snapshot.score < 55 && snapshot.recentEvents > 0)
    )
    .sort((a, b) => a.score - b.score || b.chatQuestions - a.chatQuestions)
    .slice(0, 6)
    .map((snapshot) => ({
      signal_type: "confusion",
      topic: snapshot.topic,
      confidence: confidenceFromScore(
        0.4 +
          Math.max(0, (60 - snapshot.quizAccuracy) / 100) +
          Math.min(0.2, snapshot.chatQuestions * 0.04)
      ),
      evidence: `${snapshot.topic.replace(/_/g, " ")} is unstable: score ${snapshot.score}, quiz accuracy ${snapshot.quizAccuracy}%, ${snapshot.chatQuestions} Unity questions in 7 days.`,
    }));
}
