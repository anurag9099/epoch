"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { DashboardCard } from "./DashboardCard";

interface MissionProofSignal {
  id: number;
  label: string;
  unit: string | null;
  status: "captured" | "pending";
  value: string | null;
  proofLabel: string | null;
}

interface MissionProof {
  title: string;
  summary: string;
  statusLabel: string;
  ctaLabel: string;
  ctaHref: string;
  signals: MissionProofSignal[];
}

interface RecentProofCapture {
  taskTitle: string;
  fieldName: string;
  fieldUnit: string | null;
  value: string;
}

interface Mission {
  id: number;
  title: string;
  route: string;
  phaseName: string;
  specializationLabel: string;
}

interface MissionCardProps {
  mission: Mission | null;
  missionProof: MissionProof | null;
  recentProofCapture: RecentProofCapture | null;
  onComplete: (taskId: number) => void;
}

export function MissionCard({
  mission,
  missionProof,
  recentProofCapture,
  onComplete,
}: MissionCardProps) {
  return (
    <DashboardCard
      eyebrow="Current mission"
      title={mission?.title ?? "Recovery and proof maintenance"}
      action={
        <div
          style={{
            padding: "8px 10px",
            borderRadius: 12,
            background: "var(--teal-dim)",
            color: "var(--teal)",
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {mission?.specializationLabel ?? "Core Systems"}
        </div>
      }
      style={{ height: "100%" }}
    >
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text-muted)", maxWidth: 680 }}>
          {mission
            ? `Stay inside ${mission.phaseName}. Finish the active task, keep the same block alive, and turn the output into visible proof before you leave.`
            : "No task is scheduled right now. Use the block to consolidate what you shipped and strengthen your proof trail."}
        </div>

        <div
          style={{
            display: "grid",
            gap: 10,
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "14px",
            background: "var(--bg-page)",
          }}
        >
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--text-hint)" }}>
            Proof checkpoint
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.65, color: "var(--text-muted)" }}>
            {missionProof?.summary ??
              "Leave one implementation note, design takeaway, or metric that keeps this work visible."}
          </div>

          {recentProofCapture ? (
            <div
              style={{
                display: "grid",
                gap: 5,
                borderRadius: 14,
                border: "1px solid rgba(42,124,111,0.18)",
                padding: "10px 11px",
                background: "var(--teal-dim)",
              }}
            >
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--teal)" }}>
                Latest captured
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.55, color: "var(--text-ink)" }}>
                {recentProofCapture.fieldName}: <span style={{ fontWeight: 600 }}>{recentProofCapture.value}</span>
                {recentProofCapture.fieldUnit ? ` ${recentProofCapture.fieldUnit}` : ""}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-hint)" }}>{recentProofCapture.taskTitle}</div>
            </div>
          ) : null}

          {missionProof ? (
            <>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  alignSelf: "flex-start",
                  padding: "6px 9px",
                  borderRadius: 999,
                  background: "var(--bg-surface)",
                  fontSize: 11,
                  color: "var(--text-hint)",
                }}
              >
                {missionProof.statusLabel}
              </div>

              {missionProof.signals.length > 0 ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {missionProof.signals.map((signal) => (
                    <div
                      key={signal.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 11px",
                        background: "var(--bg-surface)",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: "var(--text-ink)", fontWeight: 600 }}>{signal.label}</div>
                        <div style={{ marginTop: 2, fontSize: 11, color: "var(--text-hint)" }}>
                          {signal.proofLabel ?? (signal.unit ? signal.unit : "Evidence signal")}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: signal.status === "captured" ? "var(--teal)" : "var(--gold)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {signal.status === "captured" ? signal.value ?? "Captured" : "Pending"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <Link
                href={missionProof.ctaHref}
                style={{ fontSize: 12, color: "var(--teal)", textDecoration: "none", fontWeight: 600 }}
              >
                {missionProof.ctaLabel}
              </Link>
            </>
          ) : (
            <Link
              href="/resume"
              style={{ fontSize: 12, color: "var(--teal)", textDecoration: "none", fontWeight: 600 }}
            >
              Open proof view
            </Link>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <Link
            href={mission?.route ?? "/resume"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--teal)",
              color: "#fff",
              borderRadius: 12,
              padding: "11px 16px",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {mission ? "Open mission" : "Review proof"}
            <ArrowRight style={{ width: 14, height: 14 }} />
          </Link>
          <button
            type="button"
            onClick={() => mission && onComplete(mission.id)}
            disabled={!mission}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "transparent",
              border: "1px solid var(--border)",
              color: mission ? "var(--text-ink)" : "var(--text-disabled)",
              borderRadius: 12,
              padding: "11px 14px",
              fontSize: 13,
              cursor: mission ? "pointer" : "default",
            }}
          >
            <CheckCircle2 style={{ width: 14, height: 14 }} />
            Mark complete
          </button>
        </div>
      </div>
    </DashboardCard>
  );
}
