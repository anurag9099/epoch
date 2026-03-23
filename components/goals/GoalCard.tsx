"use client";

import { useState, useRef, useEffect } from "react";
import {
  Target,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface Goal {
  id: number;
  title: string;
  description: string | null;
  target_value: string | null;
  current_value: string | null;
  category: string;
  status: string;
  phase_id: number | null;
  created_at: string;
  achieved_at: string | null;
}

interface GoalCardProps {
  goal: Goal;
  onUpdate: (id: number, data: Record<string, unknown>) => void;
  onDelete: (id: number) => void;
}

const CATEGORY_VARIANT: Record<string, "teal" | "gold" | "rust" | "muted"> = {
  learning: "teal",
  resume: "gold",
  career: "rust",
  project: "teal",
};

function StatusIcon({ status }: { status: string }) {
  if (status === "achieved")
    return <CheckCircle2 className="h-5 w-5 text-teal shrink-0" />;
  if (status === "dropped")
    return <XCircle className="h-5 w-5 text-hint shrink-0" />;
  return <Target className="h-5 w-5 text-teal shrink-0" />;
}

export function GoalCard({ goal, onUpdate, onDelete }: GoalCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingProgress, setEditingProgress] = useState(false);
  const [progressValue, setProgressValue] = useState(goal.current_value ?? "");
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => {
    if (editingProgress && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingProgress]);

  const isAchieved = goal.status === "achieved";
  const isDropped = goal.status === "dropped";
  const isMuted = isAchieved || isDropped;

  const numTarget = goal.target_value ? parseFloat(goal.target_value) : NaN;
  const numCurrent = goal.current_value ? parseFloat(goal.current_value) : NaN;
  const hasNumericProgress =
    !isNaN(numTarget) && !isNaN(numCurrent) && numTarget > 0;
  const progressPct = hasNumericProgress
    ? Math.min(100, Math.round((numCurrent / numTarget) * 100))
    : 0;

  const handleProgressSubmit = () => {
    if (progressValue.trim()) {
      onUpdate(goal.id, { current_value: progressValue.trim() });
    }
    setEditingProgress(false);
  };

  return (
    <div
      className={`bg-surface border border-border-warm rounded-lg p-4 transition-colors duration-150 hover:border-border-hover ${
        isMuted ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <StatusIcon status={goal.status} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`font-body font-medium text-sm text-ink ${
                isAchieved ? "line-through" : ""
              }`}
            >
              {goal.title}
            </span>
            <Badge variant={CATEGORY_VARIANT[goal.category] ?? "teal"}>
              {goal.category}
            </Badge>
          </div>

          {goal.description && (
            <p className="text-xs font-body text-hint mt-1">{goal.description}</p>
          )}

          {goal.target_value && goal.current_value && hasNumericProgress && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-body text-hint">
                  {goal.current_value} / {goal.target_value}
                </span>
                <span className="text-[10px] font-body text-muted font-medium">
                  {progressPct}%
                </span>
              </div>
              <ProgressBar value={progressPct} />
            </div>
          )}

          {goal.target_value && goal.current_value && !hasNumericProgress && (
            <p className="text-xs font-body text-muted mt-1.5">
              {goal.current_value} / {goal.target_value}
            </p>
          )}

          {editingProgress && (
            <div className="flex items-center gap-2 mt-2">
              <input
                ref={inputRef}
                type="text"
                value={progressValue}
                onChange={(e) => setProgressValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleProgressSubmit();
                  if (e.key === "Escape") setEditingProgress(false);
                }}
                placeholder={goal.target_value ?? "Progress value"}
                className="flex-1 h-8 rounded-md bg-sunken border border-border-warm px-2 text-xs font-body text-ink placeholder:text-hint focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-all duration-150"
              />
              <button
                onClick={handleProgressSubmit}
                className="text-xs font-body font-medium text-teal hover:text-teal-hover transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded-md text-hint hover:text-muted hover:bg-sunken transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            aria-label="Goal actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 w-44 bg-surface border border-border-warm rounded-lg z-50 py-1 motion-safe:animate-scale-in">
              {goal.status === "active" && (
                <>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setEditingProgress(true);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-body text-muted hover:bg-sunken transition-colors cursor-pointer"
                  >
                    Update progress
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onUpdate(goal.id, { status: "achieved" });
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-body text-teal hover:bg-sunken transition-colors cursor-pointer"
                  >
                    Mark achieved
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onUpdate(goal.id, { status: "dropped" });
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-body text-hint hover:bg-sunken transition-colors cursor-pointer"
                  >
                    Drop
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(goal.id);
                }}
                className="w-full text-left px-3 py-2 text-xs font-body text-rust hover:bg-sunken transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
