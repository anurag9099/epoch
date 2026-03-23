"use client";

import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface DashboardCardProps {
  eyebrow?: string;
  title?: ReactNode;
  icon?: LucideIcon;
  accent?: string;
  action?: ReactNode;
  children: ReactNode;
  muted?: boolean;
  style?: CSSProperties;
}

export function DashboardCard({
  eyebrow,
  title,
  icon: Icon,
  accent = "var(--teal)",
  action,
  children,
  muted = false,
  style,
}: DashboardCardProps) {
  return (
    <section
      className={`dashboard-card${muted ? " dashboard-card--muted" : ""}`}
      style={{ display: "grid", gap: 14, ...style }}
    >
      {(eyebrow || title || action) && (
        <div style={{ display: "grid", gap: 10 }}>
          {eyebrow && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {Icon ? <Icon style={{ width: 16, height: 16, color: accent }} /> : null}
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "var(--text-hint)",
                }}
              >
                {eyebrow}
              </div>
              {action ? <div style={{ marginLeft: "auto" }}>{action}</div> : null}
            </div>
          )}
          {title ? (
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
                lineHeight: 1.1,
                color: "var(--text-ink)",
              }}
            >
              {title}
            </div>
          ) : null}
        </div>
      )}
      {children}
    </section>
  );
}
