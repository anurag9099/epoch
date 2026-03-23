"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TimeLoggerModal } from "@/components/ui/TimeLoggerModal";
import { WeeklyHeatmap } from "@/components/dashboard/WeeklyHeatmap";
import { PathHeader } from "@/components/dashboard/PathHeader";
import { MissionCard } from "@/components/dashboard/MissionCard";
import { MissionStateCard } from "@/components/dashboard/MissionStateCard";
import { BriefingCard } from "@/components/dashboard/BriefingCard";
import { WeekCard } from "@/components/dashboard/WeekCard";
import { PhaseProgressCard } from "@/components/dashboard/PhaseProgressCard";
import { ProofCard } from "@/components/dashboard/ProofCard";
import { TelemetryCard } from "@/components/dashboard/TelemetryCard";
import { RecoveryCard } from "@/components/dashboard/RecoveryCard";
import { FocusCommitmentsCard } from "@/components/dashboard/FocusCommitmentsCard";

interface MissionTask {
  id: number;
  title: string;
  type: string;
  status: string;
  estimated_minutes?: number;
}

interface DashboardData {
  brand: { name: string; descriptor: string; promise: string };
  profile: {
    learner_name: string;
    current_role: string;
    target_role: string;
    weekly_hours: number;
  };
  activePath: {
    name: string;
    descriptor: string;
    targetRole: string;
    primarySpecialization: string;
    stageLabel: string;
    specializationLabel: string;
  };
  streak: { current_streak: number; best_streak: number; last_active_date: string | null };
  currentDay: number;
  todayTasks: MissionTask[];
  phases: Array<{ id: number; name: string; completed: number; total: number; status: string }>;
  currentMission: {
    id: number;
    title: string;
    type: string;
    status: string;
    estimatedMinutes?: number;
    scheduledDay?: number;
    route: string;
    phaseName: string;
    stageLabel: string;
    specializationLabel: string;
    supportingTasks: MissionTask[];
  } | null;
  weeklyOutcome: {
    title: string;
    summary: string;
    stageLabel: string;
    specializationLabel: string;
  };
  briefing: {
    title: string;
    summary: string;
    bullets: string[];
    signals: Array<{
      signalType: string;
      topic: string;
      label: string;
      topicLabel: string;
      evidence: string;
      confidence: number;
      href: string | null;
    }>;
  };
  recoveryState: {
    status: "needs_recovery" | "restart_ready" | "on_track";
    title: string;
    message: string;
    ctaLabel: string;
    ctaHref: string;
    microSessionMinutes: number;
    plan: string[];
  };
  telemetry: {
    trackedMinutesToday: number;
    trackedMinutesThisWeek: number;
    missionTrackedMinutesToday: number;
    focusState: "cold_start" | "warming_up" | "locked_in";
    lastActiveAt: string | null;
  };
  missionProof: {
    title: string;
    summary: string;
    statusLabel: string;
    ctaLabel: string;
    ctaHref: string;
    signals: Array<{
      id: number;
      label: string;
      unit: string | null;
      status: "captured" | "pending";
      value: string | null;
      proofLabel: string | null;
    }>;
  } | null;
  recentProofCapture: {
    taskId: number;
    taskTitle: string;
    fieldId: number;
    fieldName: string;
    fieldUnit: string | null;
    value: string;
    recordedAt: string;
    proofLabel: string | null;
    ctaHref: string;
  } | null;
  proof: {
    readyCount: number;
    draftCount: number;
    totalCount: number;
    capturedSignals: number;
    totalSignals: number;
    headline: string | null;
  };
  goals: Array<{ id: number; title: string; current_value: string | null; target_value: string | null }>;
  inlineNudge: {
    type: string;
    message: string;
    urgency: "low" | "medium" | "high";
    cta?: { label: string; href: string };
  } | null;
}

interface DailyLog {
  date: string;
  tasks_completed: number;
  minutes_spent: number;
}

function LoadingSkeleton() {
  return (
    <div className="dashboard-grid">
      <div className="dashboard-card" style={{ height: 90, opacity: 0.6 }} />
      <div className="dashboard-grid" style={{ gridTemplateColumns: "minmax(0, 1.22fr) minmax(280px, 0.88fr)" }}>
        <div className="dashboard-card" style={{ height: 540, opacity: 0.6 }} />
        <div className="dashboard-card" style={{ height: 420, opacity: 0.6 }} />
      </div>
      <div className="dashboard-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <div className="dashboard-card" style={{ height: 220, opacity: 0.6 }} />
        <div className="dashboard-card" style={{ height: 220, opacity: 0.6 }} />
      </div>
    </div>
  );
}

export default function Home() {
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [, setCompletingTaskId] = useState<number | null>(null);
  const [paneWidth, setPaneWidth] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [dashboardRes, logsRes] = await Promise.all([fetch("/api/dashboard"), fetch("/api/daily-log")]);
      setData(await dashboardRes.json());
      setDailyLogs(await logsRes.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const node = layoutRef.current;
    if (!node) return;

    const updateWidth = (width: number) => setPaneWidth(Math.round(width));
    updateWidth(node.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      updateWidth(entry.contentRect.width);
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, data]);

  const handleTaskComplete = async (taskId: number) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "complete" }),
    });
    setCompletingTaskId(taskId);
    setModalOpen(true);
  };

  const handleTimeSubmit = async (minutes: number) => {
    await fetch("/api/daily-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutes }),
    });
    setModalOpen(false);
    setCompletingTaskId(null);
    fetchData();
  };

  if (loading || !data) return <LoadingSkeleton />;

  const missionDay = data.currentMission?.scheduledDay ?? data.currentDay;
  const missionGridColumns = paneWidth >= 700 ? "minmax(0, 1.22fr) minmax(280px, 0.88fr)" : "1fr";
  const briefingGridColumns = paneWidth >= 700 ? "repeat(2, minmax(0, 1fr))" : "1fr";
  const evidenceGridColumns =
    paneWidth >= 980 ? "repeat(3, minmax(0, 1fr))" : paneWidth >= 680 ? "repeat(2, minmax(0, 1fr))" : "1fr";
  const lowerGridColumns = paneWidth >= 740 ? "minmax(0, 1.16fr) minmax(260px, 0.84fr)" : "1fr";

  return (
    <div ref={layoutRef} className="dashboard-grid" style={{ paddingBottom: 40, width: "100%" }}>
      <PathHeader
        brand={data.brand}
        currentRole={data.profile.current_role}
        targetRole={data.activePath.targetRole}
        stageLabel={data.activePath.stageLabel}
        specializationLabel={data.activePath.specializationLabel}
        primarySpecialization={data.activePath.primarySpecialization}
        missionDay={missionDay}
        paneWidth={paneWidth}
      />

      <section className="dashboard-grid" style={{ gridTemplateColumns: missionGridColumns, alignItems: "start" }}>
        <MissionCard
          mission={data.currentMission}
          missionProof={data.missionProof}
          recentProofCapture={data.recentProofCapture}
          onComplete={handleTaskComplete}
        />
        <MissionStateCard
          mission={data.currentMission}
          trackedMinutesToday={data.telemetry.trackedMinutesToday}
          missionTrackedMinutesToday={data.telemetry.missionTrackedMinutesToday}
          paneWidth={paneWidth}
        />
      </section>

      <section className="dashboard-grid" style={{ gridTemplateColumns: briefingGridColumns }}>
        <BriefingCard briefing={data.briefing} />
        <WeekCard
          title={data.weeklyOutcome.title}
          summary={data.weeklyOutcome.summary}
          stageLabel={data.weeklyOutcome.stageLabel}
          specializationLabel={data.weeklyOutcome.specializationLabel}
        />
      </section>

      <PhaseProgressCard phases={data.phases} />

      <section className="dashboard-grid" style={{ gridTemplateColumns: evidenceGridColumns }}>
        <ProofCard {...data.proof} />
        <TelemetryCard {...data.telemetry} />
        <RecoveryCard recoveryState={data.recoveryState} inlineNudge={data.inlineNudge} />
      </section>

      <section className="dashboard-grid" style={{ gridTemplateColumns: lowerGridColumns, alignItems: "start" }}>
        <div className="dashboard-card">
          <WeeklyHeatmap
            dailyLogs={dailyLogs}
            streak={data.streak.current_streak}
            todayTasksTotal={data.todayTasks.length}
          />
        </div>
        <FocusCommitmentsCard goals={data.goals} />
      </section>

      <TimeLoggerModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setCompletingTaskId(null);
          fetchData();
        }}
        onSubmit={handleTimeSubmit}
      />
    </div>
  );
}
