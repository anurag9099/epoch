"use client";

import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { DashboardCard } from "./DashboardCard";

interface PresentedSignal {
  signalType: string;
  topic: string;
  label: string;
  topicLabel: string;
  evidence: string;
  confidence: number;
  href: string | null;
}

interface BriefingCardProps {
  briefing: {
    title: string;
    summary: string;
    bullets: string[];
    signals: PresentedSignal[];
  };
}

export function BriefingCard({ briefing }: BriefingCardProps) {
  return (
    <DashboardCard eyebrow="Today's briefing" icon={Lightbulb} title={briefing.title}>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontSize: 13, lineHeight: 1.65, color: "var(--text-muted)" }}>
          {briefing.summary}
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, color: "var(--text-ink)" }}>
          {briefing.bullets.map((bullet) => (
            <li key={bullet} style={{ fontSize: 13, lineHeight: 1.55 }}>
              {bullet}
            </li>
          ))}
        </ul>
        {briefing.signals.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {briefing.signals.map((signal) => {
              const chip = (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    padding: "6px 10px",
                    background: "var(--bg-surface)",
                    color: "var(--text-ink)",
                    fontSize: 12,
                    textDecoration: "none",
                  }}
                >
                  <span style={{ color: "var(--teal)", fontWeight: 600 }}>{signal.label}</span>
                  <span style={{ color: "var(--text-muted)" }}>{signal.topicLabel}</span>
                </span>
              );

              return signal.href ? (
                <Link key={`${signal.signalType}-${signal.topic}`} href={signal.href} style={{ textDecoration: "none" }}>
                  {chip}
                </Link>
              ) : (
                <span key={`${signal.signalType}-${signal.topic}`}>{chip}</span>
              );
            })}
          </div>
        ) : null}
      </div>
    </DashboardCard>
  );
}
