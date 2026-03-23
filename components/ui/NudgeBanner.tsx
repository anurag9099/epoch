"use client";
import { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";

export function NudgeBanner() {
  const [nudge, setNudge] = useState<{
    message: string;
    type: string;
    urgency: string;
    cta?: { label: string; href: string };
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/nudges")
      .then(r => r.json())
      .then(data => {
        if (data.nudge?.urgency === "high") {
          // Check localStorage for dismiss
          const key = `epoch_nudge_dismiss_${data.nudge.type}`;
          const lastDismiss = localStorage.getItem(key);
          if (lastDismiss && Date.now() - Number(lastDismiss) < 86400000) return; // 24h cooldown
          setNudge(data.nudge);
        }
      })
      .catch(() => {});
  }, []);

  if (!nudge || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(`epoch_nudge_dismiss_${nudge.type}`, String(Date.now()));
  };

  return (
    <div style={{
      background: "var(--rust-dim)", borderLeft: "3px solid var(--rust)",
      borderRadius: 8, padding: "12px 16px", marginBottom: 16,
      display: "flex", alignItems: "flex-start", gap: 10,
    }}>
      <AlertTriangle style={{ width: 14, height: 14, color: "var(--rust)", flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--rust)", marginBottom: 4 }}>
          Attention
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-ink)", lineHeight: 1.5 }}>
          {nudge.message}
        </div>
        {nudge.cta ? (
          <a
            href={nudge.cta.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              marginTop: 8,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--rust)",
              textDecoration: "none",
            }}
          >
            {nudge.cta.label}
          </a>
        ) : null}
      </div>
      <button onClick={handleDismiss} style={{
        background: "transparent", border: "none", color: "var(--text-hint)",
        cursor: "pointer", padding: 2, flexShrink: 0,
      }}>
        <X style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}
