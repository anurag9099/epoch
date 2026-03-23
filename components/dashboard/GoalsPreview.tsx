"use client";

import Link from "next/link";
import { Target } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface Goal {
  id: number;
  title: string;
  target_value: string | null;
  current_value: string | null;
  category: string;
  status: string;
}

interface GoalsPreviewProps {
  goals: Goal[];
}

const CATEGORY_VARIANT: Record<string, "teal" | "gold" | "rust" | "muted"> = {
  learning: "teal",
  resume: "gold",
  career: "rust",
  project: "teal",
};

export function GoalsPreview({ goals }: GoalsPreviewProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-display font-semibold text-ink">Goals</h3>
        <Link href="/goals" className="text-teal text-sm font-body hover:underline">
          View all &rarr;
        </Link>
      </div>
      {goals.length === 0 ? (
        <div className="text-center py-6">
          <p className="font-display italic text-muted mb-2">
            Set your compass.
          </p>
          <Link
            href="/goals"
            className="text-sm font-body text-teal hover:underline"
          >
            Set your first goal &rarr;
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {goals.map((goal) => {
            const numTarget = goal.target_value
              ? parseFloat(goal.target_value)
              : NaN;
            const numCurrent = goal.current_value
              ? parseFloat(goal.current_value)
              : NaN;
            const hasProgress =
              !isNaN(numTarget) && !isNaN(numCurrent) && numTarget > 0;
            const pct = hasProgress
              ? Math.min(100, Math.round((numCurrent / numTarget) * 100))
              : 0;

            return (
              <li
                key={goal.id}
                className="flex items-center gap-3 bg-surface border border-border-warm rounded-lg px-3 py-2.5"
              >
                <Target className="h-4 w-4 text-teal shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-body text-ink truncate">
                      {goal.title}
                    </span>
                    <Badge
                      variant={CATEGORY_VARIANT[goal.category] ?? "teal"}
                      className="text-[10px] px-2 py-0.5"
                    >
                      {goal.category}
                    </Badge>
                  </div>
                  {hasProgress && (
                    <div className="mt-1.5">
                      <ProgressBar value={pct} />
                    </div>
                  )}
                </div>
                {hasProgress && (
                  <span className="text-[10px] font-body text-hint shrink-0 font-medium">
                    {pct}%
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
