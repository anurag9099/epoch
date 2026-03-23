"use client";

import { useRef, useState } from "react";
import { ExternalLink, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ReadingViewProps {
  task: {
    id: number;
    content_url: string;
    takeaways: string | null;
  };
}

export function ReadingView({ task }: ReadingViewProps) {
  const parseTakeaways = (raw: string | null): string[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const [takeaways, setTakeaways] = useState<string[]>(() =>
    parseTakeaways(task.takeaways)
  );
  const [saved, setSaved] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveTakeaways = async (updated: string[]) => {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ takeaways: updated }),
    });
    setSaved(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setSaved(false), 2000);
  };

  const handleChange = (index: number, value: string) => {
    const updated = [...takeaways];
    updated[index] = value;
    setTakeaways(updated);
  };

  const handleBlur = () => {
    saveTakeaways(takeaways);
  };

  const handleDelete = (index: number) => {
    const updated = takeaways.filter((_, i) => i !== index);
    setTakeaways(updated);
    saveTakeaways(updated);
  };

  const handleAdd = () => {
    const updated = [...takeaways, ""];
    setTakeaways(updated);
  };

  return (
    <div>
      <a
        href={task.content_url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button variant="primary" className="gap-2">
          <ExternalLink className="h-4 w-4" />
          Open Article
        </Button>
      </a>
      <p className="text-xs font-body text-hint truncate mt-2 max-w-full">
        {task.content_url}
      </p>
      <p className="text-sm font-display italic text-muted mt-3">
        Read deeply, then capture what stays with you.
      </p>

      <div className="border-t border-border-warm my-6" />

      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-display font-semibold text-ink">
          Key Takeaways
        </h3>
        {saved && (
          <span className="text-xs font-body text-hint animate-pulse">Saved</span>
        )}
      </div>

      <ul className="space-y-2 mb-3">
        {takeaways.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <span className="text-hint text-sm shrink-0">&bull;</span>
            <input
              type="text"
              className="flex-1 bg-sunken border border-border-warm rounded-md px-3 py-2 text-base sm:text-sm font-body text-ink placeholder:text-hint focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-all duration-150"
              value={item}
              onChange={(e) => handleChange(index, e.target.value)}
              onBlur={handleBlur}
              placeholder="Enter a takeaway..."
            />
            <button
              onClick={() => handleDelete(index)}
              className="shrink-0 p-1 text-hint hover:text-rust transition-colors duration-150 cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              aria-label="Remove takeaway"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <Button variant="secondary" onClick={handleAdd} className="gap-2 text-xs">
        <Plus className="h-4 w-4" />
        Add takeaway
      </Button>
    </div>
  );
}
