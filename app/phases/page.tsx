"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { epochBrand, flagshipPath, specializationForPhase } from "@/lib/path";

interface Phase {
  id: number;
  name: string;
  slug: string;
  description: string;
  order_num: number;
  start_week: number;
  end_week: number;
  status: string;
  completed: number;
  total: number;
}

export default function PhasesPage() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/phases")
      .then((res) => res.json())
      .then((data) => {
        setPhases(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-6">
        <h1 className="text-2xl font-display font-semibold text-ink mb-6">Current Path</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface border border-border-warm rounded-lg p-4 animate-pulse"
            >
              <div className="h-5 bg-sunken rounded w-2/3 mb-3" />
              <div className="h-4 bg-sunken rounded w-full mb-2" />
              <div className="h-4 bg-sunken rounded w-4/5 mb-3" />
              <div className="h-3 bg-sunken rounded w-1/4 mb-4" />
              <div className="h-[2px] bg-sunken rounded-full w-full mb-2" />
              <div className="h-3 bg-sunken rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6 space-y-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-hint">{epochBrand.descriptor}</div>
        <h1 className="text-2xl font-display font-semibold text-ink">Current Path</h1>
        <p className="max-w-2xl text-sm text-muted">
          One active path, one current mission, and visible capability at the end. The current flagship path targets {flagshipPath.targetRole} with RL specialization layered into the later stages.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {phases.map((phase) => {
          const progress =
            phase.total > 0
              ? Math.round((phase.completed / phase.total) * 100)
              : 0;
          const badgeVariant =
            phase.status === "active"
              ? "rust"
              : phase.status === "complete"
                ? "teal"
                : "muted";
          const badgeLabel =
            phase.status === "active"
              ? "Active"
              : phase.status === "complete"
                ? "Complete"
                : "Locked";

          return (
            <Card
              key={phase.id}
              href={`/phases/${phase.id}`}
            >
              <div className="flex items-start justify-between mb-1">
                <h2 className="font-display font-semibold text-ink">
                  {phase.name}
                </h2>
                <Badge variant={badgeVariant}>{badgeLabel}</Badge>
              </div>
              <p className="text-sm font-body text-muted line-clamp-2 mb-2">
                {phase.description}
              </p>
              <p className="text-xs font-body text-teal mb-2">
                {specializationForPhase(phase.id)}
              </p>
              <p className="text-xs font-body text-hint mb-3">
                Weeks {phase.start_week}-{phase.end_week}
              </p>
              <ProgressBar value={progress} />
              <p className="text-xs font-body text-hint mt-2">
                {phase.completed}/{phase.total} tasks
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
