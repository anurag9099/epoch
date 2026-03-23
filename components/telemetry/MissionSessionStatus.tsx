"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Activity, PauseCircle, TimerReset } from "lucide-react";

type MissionMode = "learn" | "lab" | "quiz" | "other";

function missionModeForPath(pathname: string): MissionMode {
  if (pathname.startsWith("/learn/")) return "learn";
  if (pathname.startsWith("/lab/")) return "lab";
  if (pathname.startsWith("/quiz/")) return "quiz";
  return "other";
}

function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function modeLabel(mode: MissionMode): string {
  if (mode === "lab") return "Build block";
  if (mode === "quiz") return "Assessment block";
  if (mode === "learn") return "Learning block";
  return "Mission block";
}

function isVisibleAndFocused(): boolean {
  if (typeof document === "undefined" || typeof window === "undefined") return false;
  return document.visibilityState === "visible" && document.hasFocus();
}

export function MissionSessionStatus({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const mode = missionModeForPath(pathname);
  const [active, setActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (mode === "other") {
      setActive(false);
      setElapsedSeconds(0);
      return;
    }

    setActive(isVisibleAndFocused());
    setElapsedSeconds(0);
  }, [mode, pathname]);

  useEffect(() => {
    if (mode === "other") return;

    const handleVisibility = () => setActive(isVisibleAndFocused());
    const handleFocus = () => setActive(true);
    const handleBlur = () => setActive(false);

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [mode]);

  useEffect(() => {
    if (mode === "other" || !active) return;

    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [active, mode]);

  const statusLabel = useMemo(() => {
    if (active) return "Session live";
    if (elapsedSeconds > 0) return "Session paused";
    return "Ready to track";
  }, [active, elapsedSeconds]);

  if (mode === "other") return null;

  const icon = active ? <Activity style={{ width: 14, height: 14 }} /> : elapsedSeconds > 0 ? <PauseCircle style={{ width: 14, height: 14 }} /> : <TimerReset style={{ width: 14, height: 14 }} />;
  const accent = active ? "var(--teal)" : elapsedSeconds > 0 ? "var(--gold)" : "var(--text-hint)";

  if (compact) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderRadius: 999,
          border: "1px solid var(--border)",
          background: "var(--bg-page)",
          color: "var(--text-muted)",
          fontFamily: "var(--font-body)",
          fontSize: 11,
        }}
      >
        <span style={{ color: accent, display: "inline-flex", alignItems: "center" }}>{icon}</span>
        <span>{statusLabel}</span>
        <span style={{ color: "var(--text-hint)" }}>{formatElapsed(elapsedSeconds)}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 10,
        padding: "14px 16px",
        borderRadius: 16,
        border: "1px solid var(--border)",
        background: active ? "var(--teal-dim)" : "var(--bg-surface)",
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: accent }}>
          {icon}
          <span
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              fontWeight: 600,
            }}
          >
            {statusLabel}
          </span>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-ink)" }}>
          {formatElapsed(elapsedSeconds)}
        </div>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--text-ink)" }}>
        {modeLabel(mode)}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-muted)" }}>
        Epoch tracks focused time only while this tab is active. Leave one concrete note or artifact before you exit the block.
      </div>
    </div>
  );
}
