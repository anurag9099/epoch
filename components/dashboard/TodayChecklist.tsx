"use client";

import { Badge } from "@/components/ui/Badge";

interface Task {
  id: number;
  title: string;
  type: string;
  status: string;
}

interface TodayChecklistProps {
  tasks: Task[];
  onComplete: (taskId: number) => void;
}

const typeBadgeVariant: Record<string, "teal" | "gold" | "rust" | "muted"> = {
  video: "teal",
  quiz: "gold",
  lab: "rust",
  reading: "muted",
};

export function TodayChecklist({ tasks, onComplete }: TodayChecklistProps) {
  if (tasks.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-display font-semibold text-ink mb-3">
        Today&apos;s Tasks
      </h3>
      <ul className="space-y-2">
        {tasks.map((task) => {
          const done = task.status === "complete";
          return (
            <li
              key={task.id}
              className="flex items-center gap-3 bg-surface border border-border-warm rounded-lg px-3 py-2.5"
            >
              <button
                onClick={() => {
                  if (!done) onComplete(task.id);
                }}
                disabled={done}
                className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors duration-150 cursor-pointer
                  ${done ? "bg-teal border-teal" : "border-border-warm hover:border-teal"}`}
                aria-label={done ? "Completed" : "Mark complete"}
              >
                {done && (
                  <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
              <span
                className={`flex-1 text-sm font-body ${
                  done ? "line-through text-hint" : "text-ink"
                }`}
              >
                {task.title}
              </span>
              <Badge variant={typeBadgeVariant[task.type] ?? "muted"} className="text-[10px] px-2 py-0.5">
                {task.type}
              </Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
