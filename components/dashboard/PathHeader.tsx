"use client";

interface PathHeaderProps {
  brand: { name: string; descriptor: string; promise: string };
  currentRole: string;
  targetRole: string;
  stageLabel: string;
  specializationLabel: string;
  primarySpecialization: string;
  missionDay: number;
  paneWidth: number;
}

export function PathHeader({
  brand,
  currentRole,
  targetRole,
  stageLabel,
  specializationLabel,
  primarySpecialization,
  missionDay,
  paneWidth,
}: PathHeaderProps) {
  const isCompact = paneWidth >= 680;

  return (
    <section
      className="dashboard-card"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--bg-sunken) 86%, #081219 14%), color-mix(in srgb, var(--bg-page) 68%, #10242b 32%))",
        color: "var(--text-ink)",
        position: "relative",
        overflow: "hidden",
        padding: isCompact ? "14px 18px" : "16px 18px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at top right, rgba(31,143,98,0.16), transparent 34%), radial-gradient(circle at bottom left, rgba(222,107,46,0.14), transparent 30%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", display: "grid", gap: isCompact ? 8 : 12 }}>
        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: isCompact ? "minmax(0, 1fr) auto" : "1fr",
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--text-hint)" }}>
                {brand.name}
              </span>
              <span
                style={{
                  fontSize: 11,
                  padding: "4px 9px",
                  borderRadius: 999,
                  background: "var(--teal-dim)",
                  color: "var(--teal)",
                }}
              >
                {primarySpecialization}
              </span>
              <span
                style={{
                  fontSize: 11,
                  padding: "4px 9px",
                  borderRadius: 999,
                  background: "var(--bg-elevated)",
                  color: "var(--text-muted)",
                }}
              >
                Mission day {missionDay}
              </span>
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: isCompact ? 18 : 21,
                lineHeight: 1.08,
                fontFamily: "var(--font-display)",
                fontWeight: 600,
              }}
            >
              {brand.descriptor}
            </h1>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              color: "var(--text-muted)",
              fontSize: 12,
              justifyContent: isCompact ? "flex-end" : "flex-start",
            }}
          >
            <span>{currentRole}</span>
            <span>→</span>
            <span>{targetRole}</span>
            <span>•</span>
            <span>{stageLabel}</span>
            <span>•</span>
            <span>{specializationLabel}</span>
          </div>
        </div>

        <div style={{ fontSize: 12, lineHeight: 1.55, color: "var(--text-muted)", maxWidth: 760 }}>
          {brand.promise}. One path, one mission, and visible proof instead of scattered studying.
        </div>
      </div>
    </section>
  );
}
