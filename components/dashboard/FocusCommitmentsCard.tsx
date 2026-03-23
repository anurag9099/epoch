"use client";

import { Target } from "lucide-react";
import { DashboardCard } from "./DashboardCard";

interface Goal {
  id: number;
  title: string;
  current_value: string | null;
  target_value: string | null;
}

export function FocusCommitmentsCard({ goals }: { goals: Goal[] }) {
  return (
    <DashboardCard eyebrow="Focus commitments" icon={Target}>
      {goals.length === 0 ? (
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-muted)" }}>
          Add one or two active commitments only. The product should pressure clarity, not collect aspirations.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {goals.map((goal) => (
            <div
              key={goal.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "12px 14px",
                background: "var(--bg-page)",
              }}
            >
              <div style={{ fontSize: 14, color: "var(--text-ink)", fontWeight: 600 }}>{goal.title}</div>
              {(goal.current_value || goal.target_value) && (
                <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-hint)" }}>
                  {goal.current_value ?? "0"} / {goal.target_value ?? "?"}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}
