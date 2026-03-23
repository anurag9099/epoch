"use client";

import { useRef, useState } from "react";

interface TerminalOutputProps {
  fieldId: number;
  initialValue: string;
}

export function TerminalOutput({ fieldId, initialValue }: TerminalOutputProps) {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBlur = async () => {
    await fetch(`/api/lab/${fieldId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ terminal_output: value }),
    });
    setSaved(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-display font-semibold text-ink">
          Terminal Output
        </h3>
        {saved && (
          <span className="text-xs font-body text-hint animate-pulse">Saved</span>
        )}
      </div>
      <textarea
        className="w-full min-h-[200px] bg-sunken border border-border-warm rounded-lg p-4 font-mono text-base sm:text-sm text-ink placeholder:text-hint resize-y focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-all duration-150"
        placeholder="Paste command output, profiler results, or training logs here..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
      />
    </div>
  );
}
