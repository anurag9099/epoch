"use client";

import { useRouter } from "next/navigation";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";

interface Phase {
  id: number;
  name: string;
  completed: number;
  total: number;
  status: string;
}

interface PhaseTimelineProps {
  phases: Phase[];
}

const statusVariant: Record<string, "rust" | "teal" | "muted"> = {
  active: "rust",
  complete: "teal",
  locked: "muted",
};

export function PhaseTimeline({ phases }: PhaseTimelineProps) {
  const router = useRouter();

  return (
    <div
      className="flex gap-3 overflow-x-auto pb-2 scrollbar-none"
    >
      {phases.map((phase) => {
        const isActive = phase.status === "active";
        const pct = phase.total > 0 ? Math.round((phase.completed / phase.total) * 100) : 0;

        return (
          <div
            key={phase.id}
            className={`min-w-[160px] shrink-0 cursor-pointer rounded-lg p-4 border transition-colors ${
              isActive
                ? "bg-sunken border-l-2 border-l-teal border-border-warm"
                : "bg-surface border-border-warm"
            }`}
            onClick={() => router.push(`/phases/${phase.id}`)}
          >
            <p className="font-display font-semibold text-sm text-ink truncate mb-2">
              {phase.name}
            </p>
            <ProgressBar value={pct} />
            <div className="mt-2 flex items-center justify-between">
              <Badge variant={statusVariant[phase.status] ?? "muted"}>
                {phase.status}
              </Badge>
              <span className="text-[10px] font-body text-hint">
                {phase.completed}/{phase.total}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
