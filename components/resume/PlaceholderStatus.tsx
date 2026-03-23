"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import type { ResumeBullet } from "./BulletCard";

interface PlaceholderStatusProps {
  bullet: ResumeBullet;
}

export function PlaceholderStatus({ bullet }: PlaceholderStatusProps) {
  const filled = bullet.status === "filled";

  const content = (
    <div className="flex items-center gap-3 bg-surface border border-border-warm rounded-lg p-4 transition-colors hover:border-border-hover">
      <div className="shrink-0">
        {filled ? (
          <CheckCircle2 className="h-5 w-5 text-teal" />
        ) : (
          <Circle className="h-5 w-5 text-hint" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-body font-medium text-ink">
          {bullet.field_name ?? "Unknown field"}
        </p>
        {bullet.field_unit && (
          <p className="text-xs font-body text-hint">{bullet.field_unit}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        {filled ? (
          <p className="text-teal font-body font-bold text-sm">
            {bullet.filled_value ?? bullet.current_value}
            {bullet.field_unit ? ` ${bullet.field_unit}` : ""}
          </p>
        ) : (
          <p className="text-hint font-body text-xs">Not measured</p>
        )}
      </div>
    </div>
  );

  if (bullet.task_id) {
    return (
      <Link href={`/lab/${bullet.task_id}`} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
