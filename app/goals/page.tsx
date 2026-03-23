"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GoalCard } from "@/components/goals/GoalCard";
import { AddGoalModal } from "@/components/goals/AddGoalModal";

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

type FilterKey = "all" | "active" | "achieved" | "dropped";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "achieved", label: "Achieved" },
  { key: "dropped", label: "Dropped" },
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [modalOpen, setModalOpen] = useState(false);

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/goals");
      const data = await res.json();
      setGoals(data);
    } catch (err) {
      console.error("Failed to fetch goals:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleAdd = async (goalData: {
    title: string;
    description?: string;
    target_value?: string;
    category: string;
  }) => {
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(goalData),
    });
    setModalOpen(false);
    fetchGoals();
  };

  const handleUpdate = async (id: number, data: Record<string, unknown>) => {
    await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    fetchGoals();
  };

  const handleDelete = async (id: number) => {
    await fetch("/api/goals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchGoals();
  };

  const filtered =
    filter === "all" ? goals : goals.filter((g) => g.status === filter);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-40 bg-sunken rounded-lg" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-20 bg-sunken rounded-md" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-sunken rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4">
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-hint">Focus</div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-display font-semibold text-ink">Focus Commitments</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Keep this list small. Epoch should support one active path and only a few commitments that sharpen the outcome, not dilute it.
            </p>
          </div>
        <Button onClick={() => setModalOpen(true)} className="gap-1.5 px-4 py-2 min-h-[36px]">
          <Plus className="h-4 w-4" />
          <span>Add</span>
        </Button>
        </div>
      </div>

      {/* Filter pills */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none"
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-md px-4 py-2 text-xs font-body font-medium whitespace-nowrap transition-colors cursor-pointer ${
                active
                  ? "bg-teal text-white"
                  : "bg-sunken text-muted hover:bg-surface"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Goal list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="font-display italic text-muted mb-4">
            {filter === "all"
              ? "Every journey begins with a single goal."
              : `No ${filter} goals yet.`}
          </p>
          {filter === "all" && (
            <Button onClick={() => setModalOpen(true)} variant="secondary">
              <Plus className="h-4 w-4" />
              Set a Goal
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AddGoalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}
