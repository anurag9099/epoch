"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

interface TimeLoggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (minutes: number) => void;
}

const QUICK_PICKS = [
  { label: "15m", value: 15 },
  { label: "30m", value: 30 },
  { label: "1h", value: 60 },
  { label: "2h", value: 120 },
];

export function TimeLoggerModal({
  isOpen,
  onClose,
  onSubmit,
}: TimeLoggerModalProps) {
  const [customMinutes, setCustomMinutes] = useState("");

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleQuickPick = (minutes: number) => {
    onSubmit(minutes);
  };

  const handleCustomSubmit = () => {
    const mins = parseInt(customMinutes, 10);
    if (mins > 0) {
      onSubmit(mins);
      setCustomMinutes("");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/30 motion-safe:animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-[90vw] max-w-sm bg-surface border border-border-warm rounded-lg p-6 motion-safe:animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-hint hover:text-muted transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-md p-1"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-display text-ink mb-5">
          How long did you spend?
        </h2>

        <div className="grid grid-cols-4 gap-2 mb-5">
          {QUICK_PICKS.map(({ label, value }) => (
            <Button
              key={value}
              variant="secondary"
              onClick={() => handleQuickPick(value)}
              className="px-3 py-2 text-xs"
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            placeholder="Custom"
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCustomSubmit();
            }}
            className="flex-1 h-11 rounded-md bg-page border border-border-warm px-3 text-base sm:text-sm font-body text-ink placeholder:text-hint focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-all duration-150"
          />
          <span className="text-sm font-body text-hint whitespace-nowrap">
            minutes
          </span>
          <Button onClick={handleCustomSubmit} className="shrink-0">
            Log
          </Button>
        </div>
      </div>
    </div>
  );
}
