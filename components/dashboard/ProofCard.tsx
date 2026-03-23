"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { DashboardCard } from "./DashboardCard";

interface ProofCardProps {
  readyCount: number;
  draftCount: number;
  totalCount: number;
  capturedSignals: number;
  totalSignals: number;
  headline: string | null;
}

export function ProofCard({
  readyCount,
  draftCount,
  totalCount,
  capturedSignals,
  totalSignals,
  headline,
}: ProofCardProps) {
  const pct =
    totalCount > 0
      ? Math.round((readyCount / totalCount) * 100)
      : totalSignals > 0
        ? Math.round((capturedSignals / totalSignals) * 100)
        : 0;

  return (
    <DashboardCard eyebrow="Capability proof" icon={ShieldCheck} title={totalCount > 0 ? `${readyCount} ready / ${draftCount} draft` : `${capturedSignals}/${totalSignals} signals captured`} style={{ height: "100%" }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-muted)" }}>
          {headline
            ? `Latest proof: ${headline}`
            : "No finalized artifact yet. Capture a measurable result, then finalize the proof statement."}
        </div>
        <div style={{ height: 6, borderRadius: 999, background: "var(--bg-page)", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "var(--teal)" }} />
        </div>
        <Link href="/resume" style={{ color: "var(--teal)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          Open proof view <ArrowRight style={{ width: 13, height: 13, display: "inline" }} />
        </Link>
      </div>
    </DashboardCard>
  );
}
