"use client";

import { Badge } from "@/components/ui/Badge";

interface Segment {
  id: number;
  label: string;
  completed: number;
  order_num: number;
}

interface SegmentTrackerProps {
  segments: Segment[];
  taskId: string;
  onToggle: (segment: Segment) => void;
}

export function SegmentTracker({ segments, taskId, onToggle }: SegmentTrackerProps) {
  const completedCount = segments.filter((s) => s.completed).length;

  const handleToggle = async (segId: number) => {
    const res = await fetch(`/api/tasks/${taskId}/segments/${segId}`, {
      method: "PATCH",
    });
    if (!res.ok) return;
    const updatedSegment = (await res.json()) as Segment;
    onToggle(updatedSegment);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-display font-semibold text-ink">Segments</h3>
        <Badge variant="muted">
          {completedCount}/{segments.length}
        </Badge>
      </div>
      <ul className="space-y-2">
        {segments
          .slice()
          .sort((a, b) => a.order_num - b.order_num)
          .map((seg) => {
            const done = !!seg.completed;
            return (
              <li key={seg.id} className="flex items-center gap-3">
                <button
                  onClick={() => handleToggle(seg.id)}
                  className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors duration-150 cursor-pointer
                    ${done ? "bg-teal border-teal" : "border-border-warm hover:border-teal"}`}
                  aria-label={done ? "Mark incomplete" : "Mark complete"}
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
                  className={`text-sm font-body ${
                    done ? "line-through text-hint" : "text-ink"
                  }`}
                >
                  {seg.label}
                </span>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
