"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  Search,
  CheckCircle2,
  Lock,
  Clock,
  Cpu,
  Globe,
} from "lucide-react";

/* ── Types ─────────────────────────────────── */

interface Lab {
  id: number;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  status: "not-started" | "in-progress" | "completed" | "locked";
  runtime: "browser" | "gpu";
  durationMin: number;
  durationMax: number;
  category: "foundations" | "training" | "systems" | "portfolio";
  phaseId: number;
  phaseName: string;
  requiresGPU: boolean;
}

type StatusFilter = "all" | "in-progress" | "not-started" | "completed" | "locked";
type DifficultyFilter = "all" | "beginner" | "intermediate" | "advanced";

/* ── Colour maps ───────────────────────────── */

const DIFFICULTY_ACCENT: Record<string, string> = {
  beginner: "#2a7c6f",
  intermediate: "#b08d3c",
  advanced: "#c45c2a",
};

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  "not-started": { bg: "var(--teal-dim)", color: "var(--teal)", label: "New" },
  "in-progress": { bg: "var(--gold-dim)", color: "var(--gold)", label: "In Progress" },
  completed: { bg: "rgba(42,124,111,0.1)", color: "var(--teal)", label: "Done" },
  locked: { bg: "var(--bg-sunken)", color: "var(--text-hint)", label: "Locked" },
};

const DIFFICULTY_LABEL: Record<string, { color: string; label: string }> = {
  beginner: { color: "var(--teal)", label: "Beginner" },
  intermediate: { color: "var(--gold)", label: "Intermediate" },
  advanced: { color: "var(--rust)", label: "Advanced" },
};

/* ── Page ──────────────────────────────────── */

export default function LabsPage() {
  const router = useRouter();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [tooltip, setTooltip] = useState<{ id: number; text: string } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/labs")
      .then((r) => r.json())
      .then((data) => setLabs(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* Filter logic */
  const filtered = labs.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (difficultyFilter !== "all" && l.difficulty !== difficultyFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!l.title.toLowerCase().includes(q) && !l.description.toLowerCase().includes(q))
        return false;
    }
    return true;
  });

  /* Group: in-progress -> not-started (available) -> completed -> locked */
  const groups: { key: string; label: string; items: Lab[] }[] = [];
  const inProgress = filtered.filter((l) => l.status === "in-progress");
  const available = filtered.filter((l) => l.status === "not-started");
  const completed = filtered.filter((l) => l.status === "completed");
  const locked = filtered.filter((l) => l.status === "locked");
  if (inProgress.length) groups.push({ key: "in-progress", label: "In Progress", items: inProgress });
  if (available.length) groups.push({ key: "available", label: "Available", items: available });
  if (completed.length) groups.push({ key: "completed", label: "Completed", items: completed });
  if (locked.length) groups.push({ key: "locked", label: "Locked", items: locked });

  /* Stats */
  const stats = {
    inProgress: labs.filter((l) => l.status === "in-progress").length,
    available: labs.filter((l) => l.status === "not-started").length,
    completed: labs.filter((l) => l.status === "completed").length,
    locked: labs.filter((l) => l.status === "locked").length,
  };

  /* Click handler */
  const handleClick = (lab: Lab) => {
    if (lab.status === "locked") {
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
      setTooltip({ id: lab.id, text: `Complete ${lab.phaseName} to unlock` });
      tooltipTimer.current = setTimeout(() => setTooltip(null), 2000);
      return;
    }
    router.push(`/lab/${lab.id}`);
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setDifficultyFilter("all");
    setSearchQuery("");
  };

  /* ── Render ──────────────────────────────── */

  return (
    <div style={{ padding: "32px 36px 80px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <FlaskConical style={{ width: 22, height: 22, color: "var(--teal)" }} />
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 26,
              fontWeight: 600,
              color: "var(--text-ink)",
              margin: 0,
            }}
          >
            Build Labs
          </h1>
        </div>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 13,
            color: "var(--text-muted)",
            margin: 0,
            marginLeft: 32,
          }}
        >
          Hands-on build work across the AI systems path, including RLHF and agent training specialization.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "In Progress", value: stats.inProgress, bg: "var(--gold-dim)", color: "var(--gold)" },
          { label: "Available", value: stats.available, bg: "var(--teal-dim)", color: "var(--teal)" },
          { label: "Completed", value: stats.completed, bg: "rgba(42,124,111,0.1)", color: "var(--teal)" },
          { label: "Locked", value: stats.locked, bg: "var(--bg-sunken)", color: "var(--text-hint)" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: "var(--radius-sm)",
              background: s.bg,
              fontFamily: "var(--font-body)",
              fontSize: 11,
              fontWeight: 500,
              color: s.color,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 13 }}>{s.value}</span>
            {s.label}
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 28,
          flexWrap: "wrap",
        }}
      >
        {/* Status pills */}
        <div style={{ display: "flex", gap: 4 }}>
          {(
            [
              { key: "all", label: "All" },
              { key: "in-progress", label: "In Progress" },
              { key: "completed", label: "Completed" },
              { key: "locked", label: "Locked" },
            ] as { key: StatusFilter; label: string }[]
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              style={{
                padding: "4px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid",
                borderColor:
                  statusFilter === f.key ? "var(--teal)" : "var(--border)",
                background:
                  statusFilter === f.key ? "var(--teal-dim)" : "transparent",
                color:
                  statusFilter === f.key ? "var(--teal)" : "var(--text-muted)",
                fontFamily: "var(--font-body)",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Separator */}
        <div
          style={{
            width: 1,
            height: 20,
            background: "var(--border)",
            flexShrink: 0,
          }}
        />

        {/* Difficulty pills */}
        <div style={{ display: "flex", gap: 4 }}>
          {(
            [
              { key: "all", label: "All", color: "var(--text-muted)" },
              { key: "beginner", label: "Beginner", color: "#2a7c6f" },
              { key: "intermediate", label: "Intermediate", color: "#b08d3c" },
              { key: "advanced", label: "Advanced", color: "#c45c2a" },
            ] as { key: DifficultyFilter; label: string; color: string }[]
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setDifficultyFilter(f.key)}
              style={{
                padding: "4px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid",
                borderColor:
                  difficultyFilter === f.key ? f.color : "var(--border)",
                background:
                  difficultyFilter === f.key
                    ? `${f.color}18`
                    : "transparent",
                color:
                  difficultyFilter === f.key ? f.color : "var(--text-muted)",
                fontFamily: "var(--font-body)",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ marginLeft: "auto", position: "relative" }}>
          <Search
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              width: 14,
              height: 14,
              color: "var(--text-hint)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Search labs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: 200,
              padding: "5px 10px 5px 28px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--bg-sunken)",
              color: "var(--text-ink)",
              fontFamily: "var(--font-body)",
              fontSize: 12,
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: "var(--text-hint)",
            fontFamily: "var(--font-body)",
            fontSize: 13,
          }}
        >
          Loading labs...
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--text-hint)",
            fontFamily: "var(--font-body)",
          }}
        >
          <p style={{ fontSize: 14, marginBottom: 12 }}>No labs match your filters.</p>
          <button
            onClick={clearFilters}
            style={{
              padding: "6px 16px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--bg-sunken)",
              color: "var(--text-muted)",
              fontFamily: "var(--font-body)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Grouped grid */}
      {groups.map((group) => (
        <div key={group.key} style={{ marginBottom: 32 }}>
          <h2
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-hint)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 12,
            }}
          >
            {group.label}
            <span
              style={{
                marginLeft: 6,
                fontWeight: 400,
                fontSize: 11,
                color: "var(--text-disabled)",
              }}
            >
              ({group.items.length})
            </span>
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
              gap: 14,
            }}
          >
            {group.items.map((lab) => (
              <LabTile
                key={lab.id}
                lab={lab}
                onClick={() => handleClick(lab)}
                tooltip={tooltip?.id === lab.id ? tooltip.text : null}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Lab Tile Card ─────────────────────────── */

function LabTile({
  lab,
  onClick,
  tooltip,
}: {
  lab: Lab;
  onClick: () => void;
  tooltip: string | null;
}) {
  const [hovered, setHovered] = useState(false);
  const isLocked = lab.status === "locked";
  const isCompleted = lab.status === "completed";
  const accent = DIFFICULTY_ACCENT[lab.difficulty];
  const statusBadge = STATUS_BADGE[lab.status];
  const diffLabel = DIFFICULTY_LABEL[lab.difficulty];

  const categoryIcon: Record<string, string> = {
    foundations: "F",
    training: "T",
    systems: "S",
    portfolio: "P",
  };

  const categoryColor: Record<string, string> = {
    foundations: "var(--teal)",
    training: "var(--rust)",
    systems: "var(--gold)",
    portfolio: "var(--text-hint)",
  };

  const categoryBg: Record<string, string> = {
    foundations: "var(--teal-dim)",
    training: "var(--rust-dim)",
    systems: "var(--gold-dim)",
    portfolio: "var(--bg-sunken)",
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        borderRadius: "var(--radius-md)",
        border: `1px solid ${isCompleted ? "rgba(42,124,111,0.25)" : hovered && !isLocked ? "var(--border-hover)" : "var(--border)"}`,
        background: "var(--bg-surface)",
        opacity: isLocked ? 0.5 : 1,
        cursor: isLocked ? "not-allowed" : "pointer",
        transform: hovered && !isLocked ? "translateY(-2px)" : "translateY(0)",
        transition: "transform 200ms ease, border-color 200ms ease",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 3px accent bar */}
      <div style={{ height: 3, background: accent, flexShrink: 0 }} />

      {/* Top row: icon + status badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px 0",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "var(--radius-sm)",
            background: categoryBg[lab.category],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-body)",
            fontSize: 11,
            fontWeight: 700,
            color: categoryColor[lab.category],
          }}
        >
          {categoryIcon[lab.category]}
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 7px",
            borderRadius: "var(--radius-sm)",
            background: statusBadge.bg,
            color: statusBadge.color,
            fontFamily: "var(--font-body)",
            fontSize: 10,
            fontWeight: 500,
          }}
        >
          {lab.status === "locked" && <Lock style={{ width: 9, height: 9 }} />}
          {lab.status === "completed" && <CheckCircle2 style={{ width: 9, height: 9 }} />}
          {statusBadge.label}
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          padding: "8px 14px 0",
          fontFamily: "var(--font-body)",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-ink)",
          lineHeight: 1.35,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          minHeight: 36,
        }}
      >
        {lab.title}
      </div>

      {/* Description */}
      <div
        style={{
          padding: "4px 14px 12px",
          fontFamily: "var(--font-body)",
          fontSize: 11,
          color: "var(--text-hint)",
          lineHeight: 1.45,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          flex: 1,
        }}
      >
        {lab.description}
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 10,
          fontFamily: "var(--font-body)",
          color: "var(--text-hint)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: diffLabel.color, fontWeight: 500 }}>
            {diffLabel.label}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Clock style={{ width: 10, height: 10 }} />~{lab.durationMin}m
          </span>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: "1px 6px",
            borderRadius: "var(--radius-sm)",
            background:
              lab.runtime === "gpu"
                ? "rgba(139,92,246,0.08)"
                : "var(--bg-sunken)",
            color:
              lab.runtime === "gpu" ? "#8b5cf6" : "var(--text-hint)",
            fontWeight: 500,
            fontSize: 9,
            textTransform: "uppercase",
          }}
        >
          {lab.runtime === "gpu" ? (
            <Cpu style={{ width: 9, height: 9 }} />
          ) : (
            <Globe style={{ width: 9, height: 9 }} />
          )}
          {lab.runtime === "gpu" ? "GPU" : "Browser"}
        </span>
      </div>

      {/* Completed check overlay */}
      {isCompleted && (
        <CheckCircle2
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            width: 16,
            height: 16,
            color: "var(--teal)",
            opacity: 0.6,
          }}
        />
      )}

      {/* Locked tooltip */}
      {tooltip && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "var(--text-ink)",
            color: "var(--bg-page)",
            fontFamily: "var(--font-body)",
            fontSize: 11,
            fontWeight: 500,
            padding: "6px 12px",
            borderRadius: "var(--radius-sm)",
            whiteSpace: "nowrap",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}
