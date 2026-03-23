import { get, query } from "../db";
import { getCurrentDay, parseTaskId } from "./common";
import { buildConfusionSignals } from "./confusion";
import { buildDriftSignals } from "./drift";
import { buildMasterySignals } from "./mastery";
import { buildMomentumSignals } from "./momentum";
import { buildProofGapSignals } from "./proof-gap";
import { buildRecommendationOpportunitySignals } from "./recommendation-opportunity";
import { buildPaceSnapshot, buildTopicSnapshots } from "./snapshots";
import type { ActiveSignal, LearningSignal, LearningState, SignalType } from "./types";

function dedupeSignals(signals: LearningSignal[]) {
  const seen = new Set<string>();
  return signals.filter((signal) => {
    const key = `${signal.signal_type}:${signal.topic}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function buildLearningState(): Promise<LearningState> {
  const currentDay = await getCurrentDay();
  const topicSnapshots = await buildTopicSnapshots();
  const pace = await buildPaceSnapshot(currentDay);

  const seedSignals = dedupeSignals([
    ...buildMasterySignals(topicSnapshots),
    ...buildConfusionSignals(topicSnapshots),
    ...(await buildDriftSignals(currentDay, pace)),
    ...(await buildMomentumSignals(pace)),
    ...(await buildProofGapSignals()),
  ]);

  const recommendationSignals = await buildRecommendationOpportunitySignals(seedSignals);
  const signals = dedupeSignals([...seedSignals, ...recommendationSignals]);

  return {
    topicSnapshots,
    signals,
    pace,
  };
}

export async function getActiveSignals(
  signalTypes?: SignalType[],
  limit = 12
): Promise<ActiveSignal[]> {
  const params: Array<string | number> = [];
  const typeClause =
    signalTypes && signalTypes.length > 0
      ? `AND signal_type IN (${signalTypes.map(() => "?").join(", ")})`
      : "";

  if (signalTypes && signalTypes.length > 0) {
    params.push(...signalTypes);
  }
  params.push(limit);

  const rows = await query(
    `SELECT id, signal_type, topic, confidence, evidence, created_at, updated_at
     FROM user_signals
     WHERE is_active = 1 ${typeClause}
     ORDER BY confidence DESC, updated_at DESC
     LIMIT ?`,
    params
  );

  return rows.map((row) => ({
    id: row.id as number,
    signal_type: row.signal_type as SignalType,
    topic: row.topic as string,
    confidence: Number(row.confidence ?? 0.5),
    evidence: row.evidence as string,
    created_at: (row.created_at as string | undefined) ?? undefined,
    updated_at: (row.updated_at as string | undefined) ?? undefined,
  }));
}

export async function getTaskRouteForSignalTopic(topic: string) {
  const taskId = parseTaskId(topic);
  if (!taskId) return null;
  const task = await get("SELECT id, type FROM tasks WHERE id = ?", [taskId]);
  if (!task) return null;
  const route = task.type === "lab" ? "lab" : task.type === "quiz" ? "quiz" : "learn";
  return `/${route}/${taskId}`;
}
