"use client";

interface ContextBadgeProps {
  phaseName?: string;
  taskTitle?: string;
  taskType?: string;
}

export function ContextBadge({ phaseName, taskTitle }: ContextBadgeProps) {
  const label =
    phaseName && taskTitle
      ? `${phaseName} · ${taskTitle}`
      : phaseName
        ? phaseName
        : taskTitle
          ? taskTitle
          : "General";

  return (
    <span className="text-[10px] text-hint font-body truncate">
      {label}
    </span>
  );
}
