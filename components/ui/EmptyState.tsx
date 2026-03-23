"use client";

import { Button } from "./Button";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <h3 className="text-lg font-display italic text-muted">{title}</h3>
      <p className="mt-2 text-sm font-body text-hint max-w-xs">{description}</p>
      {action && (
        <div className="mt-4">
          <Button href={action.href} onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
