import { query } from "../db";
import { confidenceFromScore } from "./common";
import type { LearningSignal } from "./types";

export async function buildRecommendationOpportunitySignals(
  signals: LearningSignal[]
): Promise<LearningSignal[]> {
  const actionableSignals = signals.filter((signal) =>
    signal.signal_type === "confusion" || signal.signal_type === "proof_gap"
  );
  if (actionableSignals.length === 0) return [];

  const activeRecommendations = await query(
    "SELECT topic FROM recommendations WHERE status = 'active' AND topic IS NOT NULL"
  );
  const activeTopics = new Set(activeRecommendations.map((row) => row.topic as string));

  return actionableSignals
    .filter((signal) => !activeTopics.has(signal.topic))
    .slice(0, 4)
    .map((signal) => ({
      signal_type: "recommendation_opportunity",
      topic: signal.topic,
      confidence: confidenceFromScore(Math.max(0.4, signal.confidence - 0.05)),
      evidence:
        signal.signal_type === "proof_gap"
          ? `A workflow recommendation can help close the proof gap for ${signal.topic.replace(/_/g, " ")}.`
          : `A focused resource recommendation is available for ${signal.topic.replace(/_/g, " ")}.`,
    }));
}
