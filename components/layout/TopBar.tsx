"use client";

import { Flame } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface TopBarProps {
  currentDay?: number;
  streak?: number;
}

export function TopBar({ currentDay = 1, streak = 0 }: TopBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-base border-b border-border-default md:hidden">
      <div className="mx-auto max-w-3xl h-full px-4 flex items-center justify-between">
        <span className="font-bold text-lg bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">Epoch</span>

        <span className="text-sm text-text-secondary font-medium">
          Day {currentDay} of 42
        </span>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div
            className={`flex items-center gap-1.5 rounded-full bg-success-subtle px-3 py-1 text-xs font-medium text-success ${
              streak > 0 ? "animate-pulse" : ""
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>{streak}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
