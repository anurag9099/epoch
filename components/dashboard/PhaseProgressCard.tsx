"use client";

import Link from "next/link";
import { Layers } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { specializationForPhase } from "@/lib/path";

interface Phase {
  id: number;
  name: string;
  completed: number;
  total: number;
  status: string;
}

export function PhaseProgressCard({ phases }: { phases: Phase[] }) {
  return (
    <DashboardCard eyebrow="Phase progress" icon={Layers}>
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        }}
      >
        {phases.map((phase) => {
          const pct = phase.total > 0 ? Math.round((phase.completed / phase.total) * 100) : 0;
          const isActive = phase.status === "active";
          const isComplete = phase.status === "complete";
          const accent = isActive ? "var(--teal)" : isComplete ? "var(--gold)" : "var(--text-hint)";

          return (
            <Link
              key={phase.id}
              href={`/phases/${phase.id}`}
              style={{
                display: "grid",
                gap: 8,
                textDecoration: "none",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "14px 15px",
                background: isActive ? "var(--bg-page)" : "transparent",
                minWidth: 0,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, color: "var(--text-ink)", fontWeight: 600 }}>{phase.name}</div>
                  <div style={{ marginTop: 3, fontSize: 12, color: "var(--text-hint)" }}>
                    {specializationForPhase(phase.id)}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: accent, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {phase.completed}/{phase.total}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: "var(--bg-sunken)", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: accent }} />
              </div>
            </Link>
          );
        })}
      </div>
    </DashboardCard>
  );
}
