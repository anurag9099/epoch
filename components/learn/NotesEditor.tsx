"use client";

import { useRef, useState } from "react";

interface NotesEditorProps {
  initialValue: string;
  taskId: string;
  field: "notes" | "takeaways";
}

export function NotesEditor({ initialValue, taskId, field }: NotesEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBlur = async () => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setSaved(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-display font-semibold text-ink">Notes</h3>
        {saved && (
          <span className="text-xs font-body text-hint animate-pulse">Saved</span>
        )}
      </div>
      <textarea
        className="w-full min-h-[120px] bg-sunken border border-border-warm rounded-lg p-3 text-base sm:text-sm font-body text-ink placeholder:text-hint resize-y focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-all duration-150"
        placeholder="Write your notes here..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
      />
    </div>
  );
}
