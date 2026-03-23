"use client";

import Link from "next/link";
import { Clock3 } from "lucide-react";
import { DashboardCard } from "./DashboardCard";

interface MissionTask {
  id: number;
  title: string;
  type: string;
}

interface Mission {
  estimatedMinutes?: number;
  supportingTasks: MissionTask[];
}

interface MissionStateCardProps {
  mission: Mission | null;
  trackedMinutesToday: number;
  missionTrackedMinutesToday: number;
  paneWidth: number;
}

export function MissionStateCard({
  mission,
  trackedMinutesToday,
  missionTrackedMinutesToday,
  paneWidth,
}: MissionStateCardProps) {
  const supportingTasks = mission?.supportingTasks ?? [];
  const metricColumns =
    paneWidth >= 1220 ? "repeat(3, minmax(0, 1fr))" : paneWidth >= 860 ? "repeat(2, minmax(0, 1fr))" : "1fr";
  const queueColumns = paneWidth >= 1120 ? "repeat(2, minmax(0, 1fr))" : "1fr";

  return (
    <DashboardCard eyebrow="Mission state" icon={Clock3} style={{ height: "100%" }}>
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: metricColumns }}>
          <MetricStat
            label="Expected time"
            value={mission?.estimatedMinutes ? `${mission.estimatedMinutes} min` : "Open block"}
          />
          <MetricStat label="Tracked today" value={`${trackedMinutesToday} min`} accent="var(--rust)" />
          <MetricStat label="On this mission" value={`${missionTrackedMinutesToday} min`} />
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--text-hint)" }}>
            Supporting moves
          </div>
          {supportingTasks.length > 0 ? (
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: queueColumns }}>
              {supportingTasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: "10px 12px",
                    background: "var(--bg-page)",
                    minWidth: 0,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--text-ink)", fontWeight: 600, lineHeight: 1.35 }}>
                      {task.title}
                    </div>
                    <div style={{ marginTop: 2, fontSize: 11, color: "var(--text-hint)" }}>{task.type}</div>
                  </div>
                  <Link
                    href={`/${task.type === "lab" ? "lab" : task.type === "quiz" ? "quiz" : "learn"}/${task.id}`}
                    style={{
                      fontSize: 12,
                      color: "var(--teal)",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    Queue
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 10,
                borderRadius: 14,
                border: "1px dashed var(--border)",
                padding: "12px",
                background: "var(--bg-page)",
              }}
            >
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-muted)" }}>
                No supporting moves are queued yet. Finish this block, then either capture proof or open the full path.
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/resume" style={{ fontSize: 12, color: "var(--teal)", textDecoration: "none", fontWeight: 600 }}>
                  Capture proof
                </Link>
                <Link href="/phases" style={{ fontSize: 12, color: "var(--text-ink)", textDecoration: "none", fontWeight: 600 }}>
                  Open path
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardCard>
  );
}

function MetricStat({
  label,
  value,
  accent = "var(--text-ink)",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--bg-page)",
        padding: "12px 13px",
      }}
    >
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--text-hint)" }}>
        {label}
      </div>
      <div style={{ marginTop: 6, fontSize: 18, fontFamily: "var(--font-display)", color: accent }}>{value}</div>
    </div>
  );
}
