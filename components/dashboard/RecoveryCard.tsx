"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { DashboardCard } from "./DashboardCard";

interface InlineNudge {
  type: string;
  message: string;
  urgency: "low" | "medium" | "high";
  cta?: { label: string; href: string };
}

interface RecoveryState {
  status: "needs_recovery" | "restart_ready" | "on_track";
  title: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
  microSessionMinutes: number;
  plan: string[];
}

export function RecoveryCard({
  recoveryState,
  inlineNudge,
}: {
  recoveryState: RecoveryState;
  inlineNudge: InlineNudge | null;
}) {
  const accent =
    recoveryState.status === "needs_recovery"
      ? "var(--rust)"
      : recoveryState.status === "restart_ready"
        ? "var(--gold)"
        : "var(--teal)";

  return (
    <DashboardCard
      eyebrow="Recovery"
      icon={AlertTriangle}
      accent={accent}
      title={recoveryState.title}
      muted={recoveryState.status !== "on_track"}
      style={{ height: "100%" }}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-muted)" }}>{recoveryState.message}</div>

        {inlineNudge ? (
          <div
            style={{
              display: "grid",
              gap: 8,
              borderRadius: 14,
              border: "1px solid var(--border)",
              padding: "12px 13px",
              background: "var(--bg-surface)",
            }}
          >
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--teal)" }}>
              Unity noticed
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-muted)" }}>{inlineNudge.message}</div>
            {inlineNudge.cta ? (
              <Link
                href={inlineNudge.cta.href}
                style={{ color: "var(--teal)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}
              >
                {inlineNudge.cta.label}
              </Link>
            ) : null}
          </div>
        ) : null}

        <div
          style={{
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            padding: "12px 13px",
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--text-hint)" }}>
            {recoveryState.microSessionMinutes}-minute restart plan
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {recoveryState.plan.map((step, index) => (
              <div key={`${index}-${step}`} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span
                  style={{
                    marginTop: 2,
                    width: 18,
                    color: "var(--text-hint)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                  }}
                >
                  {index + 1}.
                </span>
                <span style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-muted)" }}>{step}</span>
              </div>
            ))}
          </div>
        </div>

        <Link
          href={recoveryState.ctaHref}
          style={{ color: "var(--teal)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
        >
          {recoveryState.ctaLabel} <ArrowRight style={{ width: 13, height: 13, display: "inline" }} />
        </Link>
      </div>
    </DashboardCard>
  );
}
