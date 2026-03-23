"use client";

import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface ResumeProgressProps {
  filled: number;
  total: number;
}

export function ResumeProgress({ filled, total }: ResumeProgressProps) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  return (
    <Card href="/resume">
      <div className="flex items-center justify-between mb-2">
        <p className="font-display font-semibold text-ink">Capability Proof</p>
        <ArrowRight className="h-4 w-4 text-hint" />
      </div>
      <p className="text-xs font-body text-muted mb-2">
        {filled} of {total} proof signals filled
      </p>
      <ProgressBar value={pct} />
      {total > 0 && filled < total && (
        <p className="text-xs font-display italic text-hint mt-2">
          Each filled metric makes your capability easier to defend.
        </p>
      )}
    </Card>
  );
}
