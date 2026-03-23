import { get } from "../db";
import { getActiveSignals, getTaskRouteForSignalTopic } from "./signals";
import type { ActiveSignal, SignalType } from "./types";

export interface PresentedSignal {
  signalType: SignalType;
  topic: string;
  label: string;
  topicLabel: string;
  evidence: string;
  confidence: number;
  href: string | null;
}

export interface DashboardBriefing {
  title: string;
  summary: string;
  bullets: string[];
  signals: PresentedSignal[];
}

export interface RecommendationContext {
  headline: string;
  summary: string;
  signals: PresentedSignal[];
}

export interface UnitySignalContext {
  focus: string;
  summary: string;
  signalLines: string[];
}

const SIGNAL_LABELS: Record<SignalType, string> = {
  mastery: "Mastery",
  confusion: "Confusion",
  drift: "Drift",
  momentum: "Momentum",
  proof_gap: "Proof gap",
  recommendation_opportunity: "Recommendation opportunity",
};

function humanizeTopic(topic: string) {
  if (topic === "overall") return "overall path health";
  return topic.replace(/^task_/, "task ").replace(/_/g, " ");
}

async function resolveTopicLabel(topic: string) {
  if (!topic.startsWith("task_")) return humanizeTopic(topic);
  const taskId = Number(topic.slice(5));
  if (!Number.isFinite(taskId)) return humanizeTopic(topic);
  const task = await get("SELECT title FROM tasks WHERE id = ?", [taskId]);
  return (task?.title as string | undefined) ?? humanizeTopic(topic);
}

function signalFocusLabel(signal: ActiveSignal, topicLabel: string) {
  switch (signal.signal_type) {
    case "proof_gap":
      return `Finalize proof for ${topicLabel}`;
    case "drift":
      return signal.topic === "overall" ? "Recover path momentum" : `Recover ${topicLabel}`;
    case "confusion":
      return `Focus on ${topicLabel}`;
    case "momentum":
      return "Keep the block alive";
    case "mastery":
      return `Build on ${topicLabel}`;
    case "recommendation_opportunity":
      return `Use a focused resource for ${topicLabel}`;
    default:
      return topicLabel;
  }
}

function pickVariant(options: string[]) {
  return options[Math.floor(Math.random() * options.length)] ?? options[0] ?? "";
}

function buildUnityFocusLabel(signal: ActiveSignal) {
  switch (signal.signal_type) {
    case "confusion":
      return pickVariant(["Focus now", "Next up", "Needs attention", "Coming up"]);
    case "proof_gap":
      return pickVariant(["Next up", "Needs attention", "Coming up", "Focus now"]);
    case "drift":
      return pickVariant(["Focus now", "Next up", "Needs attention"]);
    case "momentum":
      return pickVariant(["Keep going", "Stay with it", "Keep this moving"]);
    case "mastery":
      return pickVariant(["Build on this", "Keep pushing", "Level this up"]);
    case "recommendation_opportunity":
      return pickVariant(["Worth a look", "Coming up", "Next up"]);
    default:
      return "Focus now";
  }
}

function buildUnityActionSummary(signal: PresentedSignal) {
  switch (signal.signalType) {
    case "confusion":
      return `Review ${signal.topicLabel} next and keep the explanation tied to the current mission until it feels clear again.`;
    case "proof_gap":
      return `Turn your recent work on ${signal.topicLabel} into visible proof before you open something new.`;
    case "drift":
      return signal.topic === "overall"
        ? "Return to the active path and finish one bounded step before browsing wider."
        : `Return to ${signal.topicLabel} and finish one bounded step before switching context.`;
    case "momentum":
      return `Stay with ${signal.topicLabel} and turn this block into visible output before you leave it.`;
    case "mastery":
      return `Build on ${signal.topicLabel} with one harder step while the concept is still warm.`;
    case "recommendation_opportunity":
      return `Use the recommended help for ${signal.topicLabel} only if it directly moves the current mission forward.`;
    default:
      return "Stay on the current mission and make the next step concrete.";
  }
}

function toActiveSignal(signal: PresentedSignal): ActiveSignal {
  return {
    signal_type: signal.signalType,
    topic: signal.topic,
    evidence: signal.evidence,
    confidence: signal.confidence,
  };
}

async function presentSignal(signal: ActiveSignal): Promise<PresentedSignal> {
  const topicLabel = await resolveTopicLabel(signal.topic);
  const href = signal.topic.startsWith("task_")
    ? await getTaskRouteForSignalTopic(signal.topic)
    : `/lens?tab=foryou&highlight=${encodeURIComponent(signal.topic)}`;

  return {
    signalType: signal.signal_type,
    topic: signal.topic,
    label: SIGNAL_LABELS[signal.signal_type],
    topicLabel,
    evidence: signal.evidence,
    confidence: signal.confidence,
    href,
  };
}

function sortSignals(signals: ActiveSignal[]) {
  const order: Record<SignalType, number> = {
    proof_gap: 0,
    drift: 1,
    confusion: 2,
    recommendation_opportunity: 3,
    momentum: 4,
    mastery: 5,
  };

  return [...signals].sort((a, b) => {
    const orderDelta = order[a.signal_type] - order[b.signal_type];
    if (orderDelta !== 0) return orderDelta;
    return b.confidence - a.confidence;
  });
}

export async function getPresentedSignals(signalTypes?: SignalType[], limit = 4) {
  const activeSignals = await getActiveSignals(signalTypes, 12);
  const sorted = sortSignals(activeSignals).slice(0, limit);
  return Promise.all(sorted.map((signal) => presentSignal(signal)));
}

export async function buildDashboardBriefing(input: {
  currentDay: number;
  missionTitle?: string | null;
  activePhaseName?: string | null;
  brandPromise: string;
}): Promise<DashboardBriefing> {
  const signals = await getPresentedSignals(["proof_gap", "drift", "confusion", "momentum"], 3);
  const primary = signals[0] ?? null;

  let title = `Day ${input.currentDay} briefing`;
  let summary = `${input.brandPromise}. Keep the path narrow, the block bounded, and the output visible.`;

  if (primary) {
    title = signalFocusLabel(
      {
        signal_type: primary.signalType,
        topic: primary.topic,
        evidence: primary.evidence,
        confidence: primary.confidence,
      },
      primary.topicLabel
    );

    if (primary.signalType === "proof_gap") {
      summary = `You already have measurable evidence. The next valuable move is converting it into portable proof before context decays.`;
    } else if (primary.signalType === "drift") {
      summary = `Momentum is leaking. Recover the active path before opening broader material or starting a fresh thread.`;
    } else if (primary.signalType === "confusion") {
      summary = `A weak concept is visible in the signal layer. Tighten this topic now so the rest of the path stops compounding confusion.`;
    } else if (primary.signalType === "momentum") {
      summary = `The current block is working. Protect it and turn today’s work into visible output before switching contexts.`;
    }
  }

  const bullets = [
    input.missionTitle
      ? `Stay with "${input.missionTitle}" until you finish one bounded step and can show evidence from it.`
      : "Re-open the next mission and keep the work bounded to one visible step.",
    input.activePhaseName
      ? `${input.activePhaseName} is still the main context window. Avoid opening adjacent topics until this phase moves.`
      : "Keep the current phase moving before broadening out.",
    ...(signals.length > 0
      ? signals.map((signal) => `${signal.label}: ${signal.evidence}`)
      : ["No urgent learning signals are active right now. Use the next block to build momentum and capture proof."]),
  ].slice(0, 3);

  return { title, summary, bullets, signals };
}

export async function buildRecommendationContext(): Promise<RecommendationContext> {
  const signals = await getPresentedSignals(
    ["proof_gap", "drift", "confusion", "recommendation_opportunity", "momentum"],
    4
  );

  if (signals.length === 0) {
    return {
      headline: "No active signals yet",
      summary: "Complete a few tasks, quizzes, or labs and Epoch will start shaping For You around actual evidence instead of generic browsing.",
      signals: [],
    };
  }

  const primary = signals[0];
  const headline = signalFocusLabel(
    {
      signal_type: primary.signalType,
      topic: primary.topic,
      evidence: primary.evidence,
      confidence: primary.confidence,
    },
    primary.topicLabel
  );

  const summary =
    primary.signalType === "proof_gap"
      ? "For You is prioritizing workflow help that turns captured evidence into shareable capability."
      : primary.signalType === "drift"
        ? "For You is prioritizing the path areas where momentum is slipping."
        : primary.signalType === "confusion"
          ? "For You is prioritizing the weakest concepts showing up in quiz, chat, and task signals."
          : "For You is prioritizing the highest-signal next help based on your recent work.";

  return { headline, summary, signals };
}

export async function buildUnitySignalContext(): Promise<UnitySignalContext> {
  const signals = await getPresentedSignals(["proof_gap", "drift", "confusion", "momentum"], 4);

  if (signals.length === 0) {
    return {
      focus: pickVariant(["Focused", "On track", "Path is clear"]),
      summary: "Keep the learner on the current mission, help them turn work into proof, and avoid broadening the path unnecessarily.",
      signalLines: [],
    };
  }

  const primary = signals[0];
  return {
    focus: buildUnityFocusLabel(toActiveSignal(primary)),
    summary: buildUnityActionSummary(primary),
    signalLines: signals.map((signal) => `${signal.label} — ${signal.topicLabel}: ${signal.evidence}`),
  };
}
