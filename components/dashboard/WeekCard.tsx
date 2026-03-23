"use client";

import { Target } from "lucide-react";
import { DashboardCard } from "./DashboardCard";

interface WeekCardProps {
  title: string;
  summary: string;
  stageLabel: string;
  specializationLabel: string;
}

export function WeekCard({ title, summary, stageLabel, specializationLabel }: WeekCardProps) {
  return (
    <DashboardCard
      eyebrow="This week"
      icon={Target}
      title={title}
      action={
        <span
          style={{
            padding: "5px 9px",
            borderRadius: 999,
            background: "var(--bg-page)",
            fontSize: 11,
            color: "var(--text-hint)",
          }}
        >
          active
        </span>
      }
      style={{ height: "100%" }}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-muted)" }}>{summary}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span
            style={{
              padding: "6px 9px",
              borderRadius: 999,
              background: "var(--bg-page)",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            {stageLabel}
          </span>
          <span
            style={{
              padding: "6px 9px",
              borderRadius: 999,
              background: "var(--gold-dim)",
              fontSize: 11,
              color: "var(--gold)",
            }}
          >
            {specializationLabel}
          </span>
        </div>
      </div>
    </DashboardCard>
  );
}
