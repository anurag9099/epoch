"use client";

import { Clock } from "lucide-react";
import { DashboardCard } from "./DashboardCard";

interface TelemetryCardProps {
  trackedMinutesToday: number;
  trackedMinutesThisWeek: number;
  missionTrackedMinutesToday: number;
  focusState: "cold_start" | "warming_up" | "locked_in";
  lastActiveAt: string | null;
}

function formatRelativeTime(dateString: string | null) {
  if (!dateString) return "No tracked session yet";

  const diffMs = Date.now() - new Date(dateString).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "Just now";

  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function TelemetryCard({
  trackedMinutesToday,
  trackedMinutesThisWeek,
  missionTrackedMinutesToday,
  focusState,
  lastActiveAt,
}: TelemetryCardProps) {
  const accent =
    focusState === "locked_in"
      ? "var(--teal)"
      : focusState === "warming_up"
        ? "var(--gold)"
        : "var(--rust)";
  const title =
    focusState === "locked_in"
      ? "Locked in"
      : focusState === "warming_up"
        ? "Warming up"
        : "Cold start";

  return (
    <DashboardCard
      eyebrow="Session telemetry"
      icon={Clock}
      accent={accent}
      title={title}
      action={
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-hint)" }}>
          {formatRelativeTime(lastActiveAt)}
        </span>
      }
      style={{ height: "100%" }}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          <TelemetryMetric label="Today" value={`${trackedMinutesToday} min`} />
          <TelemetryMetric label="This mission" value={`${missionTrackedMinutesToday} min`} />
          <TelemetryMetric label="This week" value={`${trackedMinutesThisWeek} min`} />
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-muted)" }}>
          {focusState === "locked_in"
            ? "You already have real focus time logged. Stay with the same task long enough to produce proof."
            : focusState === "warming_up"
              ? "Momentum exists, but the session is still shallow. Extend the same block before context resets."
              : "No real focused time is visible yet today. Start one bounded mission block instead of browsing around."}
        </div>
      </div>
    </DashboardCard>
  );
}

function TelemetryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--bg-page)",
        padding: "12px 13px",
      }}
    >
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--text-hint)" }}>
        {label}
      </div>
      <div style={{ marginTop: 6, fontFamily: "var(--font-display)", fontSize: 22 }}>{value}</div>
    </div>
  );
}
