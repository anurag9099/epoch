"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Layers, FlaskConical, Sparkles, FileText, Target, Flame, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { EpochBrand } from "@/components/branding/EpochBrand";
import { useShell } from "@/components/layout/ShellProvider";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Path", href: "/phases", icon: Layers },
  { label: "Build", href: "/labs", icon: FlaskConical },
  { label: "For You", href: "/lens", icon: Sparkles },
  { label: "Proof", href: "/resume", icon: FileText },
  { label: "Focus", href: "/goals", icon: Target },
] as const;

interface SidebarData {
  brand: { name: string; descriptor: string };
  activePath: { targetRole: string; primarySpecialization: string };
  streak: { current_streak: number; best_streak: number };
  currentDay: number;
  stats: { tasksDone: number; totalTasks: number };
  phases: Array<{ id: number; name: string; completed: number; total: number; status: string }>;
  inlineNudge?: { urgency: string } | null;
}

export function Sidebar() {
  const pathname = usePathname();
  const [data, setData] = useState<SidebarData | null>(null);
  const [labCount, setLabCount] = useState<number | null>(null);
  const { sidebarCollapsed, toggleSidebar, isLabRoute } = useShell();

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
    fetch("/api/labs")
      .then((r) => r.json())
      .then((labs: unknown[]) => setLabCount(labs.length))
      .catch(() => {});
  }, [pathname]);

  const currentPhase = data?.phases.find((p) => p.status === "active");
  const hasLowNudge = data?.inlineNudge?.urgency === "low";

  return (
    <aside
      className="w-full flex flex-col bg-surface overflow-hidden rounded-[22px]"
      style={{
        height: "calc(100vh - (var(--shell-padding) * 2))",
        border: "1px solid var(--border)",
        boxShadow: "0 16px 40px rgba(17, 22, 28, 0.06)",
      }}
    >
      {/* Logo */}
      <div className={`${sidebarCollapsed ? "px-2 pt-4 pb-3" : "px-5 pt-6 pb-2"}`}>
        <div className={`flex ${sidebarCollapsed ? "flex-col items-center gap-2" : "items-start justify-between gap-3"}`}>
          <div className={`min-w-0 ${sidebarCollapsed ? "text-center" : "pr-2"}`}>
            {sidebarCollapsed ? (
              <Link href="/" className="inline-flex text-base font-display font-semibold tracking-tight text-ink">
                Epoch
              </Link>
            ) : (
              <>
                <EpochBrand compact showDescriptor={false} />
                <p className="mt-1 max-w-[10rem] text-[10px] leading-4 text-hint">
                  {data?.brand.descriptor ?? "Focused Paths for AI Engineers"}
                </p>
              </>
            )}
          </div>
          <div className={`shrink-0 ${sidebarCollapsed ? "flex flex-col items-center gap-2" : "flex items-center gap-2 pt-0.5"}`}>
            <button
              type="button"
              onClick={toggleSidebar}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg-page)",
                color: "var(--text-muted)",
              }}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
            <ThemeToggle compact />
          </div>
        </div>
      </div>

      {/* Active phase banner */}
      {currentPhase && !sidebarCollapsed && (
        <div className="mx-4 mt-2 mb-3 px-3 py-2 bg-rust-dim rounded-md border border-border-warm">
          <div className="text-[10px] font-medium text-rust uppercase tracking-wider">
            Active Phase
          </div>
          <div className="text-xs text-ink font-medium mt-0.5 truncate">
            {currentPhase.name}
          </div>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-hint">
            <Flame className="h-2.5 w-2.5 text-rust" />
            Day {data?.currentDay ?? 1} of 42
          </div>
          <div className="mt-2 inline-flex items-center rounded-md bg-page px-2 py-1 text-[10px] font-medium text-teal">
            RL specialization
          </div>
        </div>
      )}

      {sidebarCollapsed ? (
        <div className="mx-2 mb-3 flex flex-col items-center gap-2">
          <div
            className="w-full rounded-xl border border-border-warm bg-page px-2 py-2 text-center"
            title={currentPhase ? `${currentPhase.name} · Day ${data?.currentDay ?? 1}` : "Current mission day"}
          >
            <div className="text-[9px] font-medium uppercase tracking-[0.18em] text-hint">Day</div>
            <div className="mt-1 text-sm font-display font-semibold text-ink">{data?.currentDay ?? 1}</div>
          </div>
          {isLabRoute ? (
            <div className="rounded-full bg-teal-dim px-2 py-1 text-[9px] font-medium uppercase tracking-[0.14em] text-teal">
              Lab
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mx-4 mb-3 rounded-lg border border-border-warm bg-page px-3 py-3">
          <div className="text-[9px] font-medium uppercase tracking-[0.18em] text-hint">
            Active Path
          </div>
          <div className="mt-1 text-sm font-display font-semibold text-ink">
            {data?.activePath.targetRole ?? "ML System Engineer"}
          </div>
          <div className="mt-1 text-[11px] leading-4 text-muted">
            Specialization: {data?.activePath.primarySpecialization ?? "Reinforcement Learning"}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 mt-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={sidebarCollapsed ? label : undefined}
              className={`flex items-center ${sidebarCollapsed ? "justify-center gap-0 px-0" : "gap-2.5 px-3"} py-2 rounded-md text-[13px] font-medium transition-colors cursor-pointer ${
                isActive
                  ? "bg-sunken text-ink border-l-2 border-teal -ml-[2px] pl-[14px]"
                  : "text-muted hover:text-ink hover:bg-sunken/50"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!sidebarCollapsed ? <span>{label}</span> : null}
              {!sidebarCollapsed && label === "Build" && labCount !== null && (
                <span
                  style={{
                    background: isActive ? "var(--teal-dim)" : "var(--bg-sunken)",
                    color: isActive ? "var(--teal)" : "var(--text-hint)",
                    fontSize: 9,
                    fontFamily: "var(--font-body)",
                    fontWeight: 500,
                    borderRadius: 3,
                    padding: "1px 5px",
                    marginLeft: "auto",
                  }}
                >
                  {labCount}
                </span>
              )}
              {label === "Build" && hasLowNudge && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--teal)",
                    flexShrink: 0,
                    marginLeft: sidebarCollapsed ? 0 : labCount !== null ? 0 : "auto",
                    animation: "pulse 2s ease-in-out infinite",
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Phase progress list */}
      {!sidebarCollapsed && (
      <div className="px-4 pb-5 mt-auto">
        <div className="text-[9px] text-hint uppercase tracking-widest font-medium mb-2">
          Progress
        </div>
        <div className="space-y-2">
          {(data?.phases ?? []).slice(0, 7).map((phase) => {
            const pct = phase.total > 0 ? Math.round((phase.completed / phase.total) * 100) : 0;
            return (
              <Link
                key={phase.id}
                href={`/phases/${phase.id}`}
                className="block group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-hint group-hover:text-muted truncate pr-2 transition-colors">
                    {phase.name}
                  </span>
                  <span className="text-[9px] text-hint font-medium flex-shrink-0">
                    {pct}%
                  </span>
                </div>
                <ProgressBar value={pct} />
              </Link>
            );
          })}
        </div>
      </div>
      )}
    </aside>
  );
}
