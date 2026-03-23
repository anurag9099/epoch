import { query, get } from "./db";
import { getPresentedSignals } from "./intelligence/presenter";

export type NudgeUrgency = "low" | "medium" | "high";

export interface NudgeCTA {
  label: string;
  href: string;
}

export interface Nudge {
  type: string;
  message: string;
  priority: number;
  urgency: NudgeUrgency;
  cta: NudgeCTA;
}

interface NudgeOptions {
  includeUrgencies?: NudgeUrgency[];
}

const TYPE_ROUTES: Record<string, string> = { video: "learn", reading: "learn", lab: "lab", quiz: "quiz" };

function taskHref(task: { id: number; type: string }): string {
  const route = TYPE_ROUTES[task.type] ?? "learn";
  return `/${route}/${task.id}`;
}

async function resolveNudge(): Promise<Nudge | null> {
  const today = new Date().toISOString().split("T")[0];
  const nudgesToday = await query(
    "SELECT COUNT(*) as c FROM user_events WHERE event_type = 'nudge_shown' AND created_at >= ?",
    [today + "T00:00:00"]
  );
  if (((nudgesToday[0]?.c as number) ?? 0) >= 3) return null;

  const hour = new Date().getHours();

  // Helper: get next incomplete task for streak nudges
  const getNextTask = async () => {
    return await get(
      "SELECT id, type FROM tasks WHERE status != 'complete' ORDER BY scheduled_day ASC LIMIT 1"
    );
  };

  // ─── HIGH: Streak about to break (after 8 PM, no activity) ───
  const streak = await get("SELECT * FROM streaks WHERE id = 1");
  const lastActive = streak?.last_active_date as string | null;
  if (
    hour >= 20 &&
    lastActive !== today &&
    (streak?.current_streak as number) > 2
  ) {
    const nextTask = await getNextTask();
    const href = nextTask ? taskHref(nextTask as { id: number; type: string }) : "/learn/1";
    return {
      type: "streak_risk",
      message: `Your ${streak?.current_streak}-day streak breaks at midnight. Even 15 minutes saves it.`,
      priority: 0.95,
      urgency: "high",
      cta: { label: "Start now \u2192", href },
    };
  }

  const [driftSignals, confusionSignals, proofGapSignals, opportunitySignals] = await Promise.all([
    getPresentedSignals(["drift"], 3),
    getPresentedSignals(["confusion"], 2),
    getPresentedSignals(["proof_gap"], 2),
    getPresentedSignals(["recommendation_opportunity"], 2),
  ]);

  const taskDrift = driftSignals.find((signal) => signal.topic.startsWith("task_"));
  if (taskDrift) {
    const href = taskDrift.href ?? "/phases";
    return {
      type: "task_drift",
      message: taskDrift.evidence,
      priority: taskDrift.confidence,
      urgency: taskDrift.confidence >= 0.75 ? "high" : "medium",
      cta: { label: "Recover task \u2192", href },
    };
  }

  const proofGap = proofGapSignals[0];
  if (proofGap) {
    const href = proofGap.href ?? "/resume";
    return {
      type: "proof_gap",
      message: proofGap.evidence,
      priority: proofGap.confidence,
      urgency: "medium",
      cta: { label: "Finalize proof \u2192", href },
    };
  }

  const confusion = confusionSignals[0];
  if (confusion) {
    return {
      type: "confusion",
      message: confusion.evidence,
      priority: confusion.confidence,
      urgency: "medium",
      cta: { label: "Review resources \u2192", href: confusion.href ?? "/lens?tab=foryou" },
    };
  }

  // ─── MEDIUM: Streak at risk (6-8 PM, early warning) ───
  if (
    hour >= 18 &&
    hour < 20 &&
    lastActive !== today &&
    (streak?.current_streak as number) > 0
  ) {
    const nextTask = await getNextTask();
    const href = nextTask ? taskHref(nextTask as { id: number; type: string }) : "/learn/1";
    return {
      type: "streak_warning",
      message: `Your ${streak?.current_streak}-day streak needs activity today. Even a quick task keeps it alive.`,
      priority: 0.65,
      urgency: "medium",
      cta: { label: "Start now \u2192", href },
    };
  }

  const recommendationOpportunity = opportunitySignals[0];
  if (recommendationOpportunity) {
    return {
      type: "recommendation_opportunity",
      message: recommendationOpportunity.evidence,
      priority: recommendationOpportunity.confidence,
      urgency: "low",
      cta: {
        label: recommendationOpportunity.topic.startsWith("task_")
          ? "Close proof gap \u2192"
          : "Open in Lens \u2192",
        href: recommendationOpportunity.href ?? "/lens?tab=foryou",
      },
    };
  }

  // ─── LOW: Recommendation waiting ───
  const unreadRec = await get(
    "SELECT title FROM recommendations WHERE status = 'active' ORDER BY priority DESC LIMIT 1"
  );
  if (unreadRec) {
    return {
      type: "recommendation_waiting",
      message: `You have a personalized recommendation waiting: "${unreadRec.title}"`,
      priority: 0.4,
      urgency: "low",
      cta: { label: "See recommendation \u2192", href: "/lens?tab=foryou" },
    };
  }

  return null;
}

function includeUrgency(nudge: Nudge | null, options?: NudgeOptions) {
  if (!nudge) return null;
  if (!options?.includeUrgencies?.length) return nudge;
  return options.includeUrgencies.includes(nudge.urgency) ? nudge : null;
}

// Check and return at most 1 nudge
export async function checkNudges(): Promise<Nudge | null> {
  return resolveNudge();
}

export async function peekNudge(options?: NudgeOptions): Promise<Nudge | null> {
  const nudge = await resolveNudge();
  return includeUrgency(nudge, options);
}
