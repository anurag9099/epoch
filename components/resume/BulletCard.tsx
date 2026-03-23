"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";

export interface ResumeBullet {
  id: number;
  bullet_text: string;
  placeholder: string;
  linked_field_id: number | null;
  filled_value: string | null;
  status: string;
  field_name: string | null;
  field_unit: string | null;
  task_id: number | null;
  current_value: string | null;
}

interface BulletCardProps {
  bullet: ResumeBullet;
}

export function BulletCard({ bullet }: BulletCardProps) {
  const parts = bullet.bullet_text.split(bullet.placeholder);

  const renderedText = (
    <span className="text-sm font-body leading-relaxed text-muted">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 &&
            (bullet.status === "filled" ? (
              <span className="text-teal font-semibold">
                {bullet.filled_value ?? bullet.current_value}
              </span>
            ) : (
              <span className="text-teal font-semibold bg-teal-dim px-1 rounded-sm">
                [X]
              </span>
            ))}
        </span>
      ))}
    </span>
  );

  return (
    <Card>
      <div>{renderedText}</div>
      {bullet.task_id && (
        <div className="mt-3">
          <Link
            href={`/lab/${bullet.task_id}`}
            className="text-teal text-xs font-body inline-flex items-center gap-1 hover:underline"
          >
            Go to lab
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </Card>
  );
}
