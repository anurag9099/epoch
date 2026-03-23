import { query, execute, get } from "./db";
import { getActiveSignals, getTaskRouteForSignalTopic } from "./intelligence/signals";
import type { ActiveSignal, SignalType } from "./intelligence/types";
import fs from "fs";
import path from "path";

interface CuratedResource {
  topic: string;
  title: string;
  url: string;
  type: string;
}

const curatedResources: CuratedResource[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data", "curated-resources.json"), "utf-8")
);

function resourceReason(signalType: SignalType, topic: string, evidence: string) {
  const readableTopic = topic.replace(/_/g, " ");
  if (signalType === "confusion") {
    return `You are showing confusion on "${readableTopic}". ${evidence}`;
  }
  if (signalType === "proof_gap") {
    return `You already captured evidence for "${readableTopic}" but have not converted it into portable proof. ${evidence}`;
  }
  if (signalType === "drift") {
    return `Momentum is slipping on "${readableTopic}". ${evidence}`;
  }
  return evidence;
}

const SIGNAL_PRIORITY: Record<SignalType, number> = {
  proof_gap: 0,
  drift: 1,
  confusion: 2,
  recommendation_opportunity: 3,
  momentum: 4,
  mastery: 5,
};

function pickActionableSignals(signals: ActiveSignal[]) {
  const sorted = [...signals].sort((a, b) => {
    const priorityDelta = SIGNAL_PRIORITY[a.signal_type] - SIGNAL_PRIORITY[b.signal_type];
    if (priorityDelta !== 0) return priorityDelta;
    return b.confidence - a.confidence;
  });

  const chosen = new Map<string, ActiveSignal>();
  for (const signal of sorted) {
    if (!signal.topic || chosen.has(signal.topic)) continue;
    chosen.set(signal.topic, signal);
  }

  return Array.from(chosen.values()).slice(0, 5);
}

async function insertRecommendation(input: {
  source: string;
  title: string;
  url: string | null;
  contentType: string;
  reason: string;
  topic: string;
  priority: number;
}) {
  await execute(
    `INSERT INTO recommendations (source, title, url, content_type, reason, topic, priority, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
    [
      input.source,
      input.title,
      input.url,
      input.contentType,
      input.reason,
      input.topic,
      input.priority,
    ]
  );
}

export async function generateRecommendations(): Promise<void> {
  const rawSignals = await getActiveSignals(
    ["confusion", "proof_gap", "recommendation_opportunity", "drift"],
    12
  );
  const signals = pickActionableSignals(rawSignals);
  await execute("UPDATE recommendations SET status = 'archived' WHERE status = 'active'");

  if (signals.length === 0) return;

  const usedUrls = new Set<string>();

  for (const signal of signals) {
    const priority = Math.max(0.25, Math.min(0.99, signal.confidence));

    if (signal.topic.startsWith("task_")) {
      const route = await getTaskRouteForSignalTopic(signal.topic);
      if (!route || usedUrls.has(route)) continue;

      const taskId = Number(signal.topic.slice(5));
      const task = await get("SELECT title FROM tasks WHERE id = ?", [taskId]);
      const title =
        signal.signal_type === "proof_gap"
          ? `Finalize proof for ${task?.title ?? "this lab"}`
          : `Recover momentum on ${task?.title ?? "this task"}`;
      const contentType = signal.signal_type === "proof_gap" ? "workflow" : "task";

      await insertRecommendation({
        source: "system",
        title,
        url: route,
        contentType,
        reason: signal.evidence,
        topic: signal.topic,
        priority,
      });
      usedUrls.add(route);
      continue;
    }

    const curated = curatedResources.find(
      (resource) => resource.topic === signal.topic && !usedUrls.has(resource.url)
    );
    if (curated) {
      await insertRecommendation({
        source: "curated",
        title: curated.title,
        url: curated.url,
        contentType: curated.type,
        reason: resourceReason(signal.signal_type, signal.topic, signal.evidence),
        topic: signal.topic,
        priority,
      });
      usedUrls.add(curated.url);
      continue;
    }

    const feedMatches = await query(
      `SELECT title, url
       FROM feed_items
       WHERE (LOWER(title) LIKE ? OR LOWER(summary) LIKE ?)
       ORDER BY published_at DESC
       LIMIT 5`,
      [`%${signal.topic.replace(/_/g, "%")}%`, `%${signal.topic.replace(/_/g, "%")}%`]
    );
    const feedMatch = feedMatches.find((row) => {
      const url = row.url as string | null;
      if (!url) return false;
      return !usedUrls.has(url);
    });

    if (feedMatch?.url && !usedUrls.has(feedMatch.url as string)) {
      await insertRecommendation({
        source: "feed",
        title: feedMatch.title as string,
        url: feedMatch.url as string,
        contentType: "article",
        reason: resourceReason(signal.signal_type, signal.topic, signal.evidence),
        topic: signal.topic,
        priority,
      });
      usedUrls.add(feedMatch.url as string);
    }
  }
}
