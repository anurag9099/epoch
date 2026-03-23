import { confidenceFromScore } from "./common";
import type { LearningSignal, TopicSnapshot } from "./types";

export function buildMasterySignals(topicSnapshots: TopicSnapshot[]): LearningSignal[] {
  return topicSnapshots
    .filter(
      (snapshot) =>
        snapshot.score >= 72 &&
        snapshot.quizAttempts >= 2 &&
        snapshot.quizAccuracy >= 75 &&
        (snapshot.labCompleted > 0 || snapshot.trackedMinutes >= 45)
    )
    .slice(0, 4)
    .map((snapshot) => ({
      signal_type: "mastery",
      topic: snapshot.topic,
      confidence: confidenceFromScore(0.4 + snapshot.score / 200 + snapshot.trackedMinutes / 500),
      evidence: `${snapshot.topic.replace(/_/g, " ")} is stable: score ${snapshot.score}, quiz accuracy ${snapshot.quizAccuracy}%, ${snapshot.trackedMinutes} tracked minutes.`,
    }));
}
