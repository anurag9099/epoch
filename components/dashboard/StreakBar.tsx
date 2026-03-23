"use client";

import { Flame } from "lucide-react";

interface StreakBarProps {
  currentStreak: number;
  bestStreak: number;
}

export function StreakBar({ currentStreak, bestStreak }: StreakBarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Flame
          className={`h-5 w-5 ${currentStreak > 0 ? "text-rust" : "text-hint"}`}
        />
        {currentStreak > 0 ? (
          <span className="font-display font-semibold text-ink">
            {currentStreak} day streak
          </span>
        ) : (
          <span className="text-sm font-body text-muted">Start your streak today</span>
        )}
      </div>
      <span className="text-xs font-body text-hint">
        Best: {bestStreak}
      </span>
    </div>
  );
}
