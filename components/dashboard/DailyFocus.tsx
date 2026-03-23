"use client";

import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

interface Task {
  id: number;
  title: string;
  type: string;
  estimated_minutes?: number;
  phase_name?: string;
  status: string;
}

interface DailyFocusProps {
  task: Task | null;
  currentDay: number;
}

const typeBadgeVariant: Record<string, "teal" | "gold" | "rust" | "muted"> = {
  video: "teal",
  quiz: "gold",
  lab: "rust",
  reading: "muted",
};

function taskHref(task: Task): string {
  switch (task.type) {
    case "quiz":
      return `/quiz/${task.id}`;
    case "lab":
      return `/lab/${task.id}`;
    default:
      return `/learn/${task.id}`;
  }
}

export function DailyFocus({ task, currentDay }: DailyFocusProps) {
  if (!task) {
    return (
      <EmptyState
        title="Rest day!"
        description="Review your notes or explore the feed."
        action={{ label: "Browse Feed", href: "/feed" }}
      />
    );
  }

  const isStarted = task.status === "in_progress";

  return (
    <div className="bg-surface border border-border-warm rounded-lg p-4">
      <p className="text-[10px] font-body uppercase tracking-widest text-teal mb-1">
        Today&apos;s Focus &mdash; Day {currentDay}
      </p>
      <h2 className="text-lg font-display font-semibold text-ink mb-3">
        {task.title}
      </h2>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Badge variant={typeBadgeVariant[task.type] ?? "muted"}>{task.type}</Badge>
        {task.estimated_minutes && (
          <span className="inline-flex items-center gap-1 text-xs font-body text-muted">
            <Clock className="h-3 w-3" />
            ~{task.estimated_minutes}m
          </span>
        )}
        {task.phase_name && (
          <span className="text-xs font-body text-hint">{task.phase_name}</span>
        )}
      </div>
      <Button href={taskHref(task)}>
        {isStarted ? "Continue" : "Start"}
      </Button>
    </div>
  );
}
