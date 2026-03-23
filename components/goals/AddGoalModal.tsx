"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (goal: {
    title: string;
    description?: string;
    target_value?: string;
    category: string;
  }) => void;
}

const CATEGORIES = [
  { key: "learning", label: "Learning" },
  { key: "resume", label: "Resume" },
  { key: "career", label: "Career" },
  { key: "project", label: "Project" },
];

export function AddGoalModal({ isOpen, onClose, onAdd }: AddGoalModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [category, setCategory] = useState("learning");

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

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTargetValue("");
    setCategory("learning");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      description: description.trim() || undefined,
      target_value: targetValue.trim() || undefined,
      category,
    });
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/30 motion-safe:animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-[90vw] max-w-md bg-surface border border-border-warm rounded-lg p-6 motion-safe:animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-hint hover:text-muted transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-md p-1"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-display font-semibold text-ink mb-5">
          Add Goal
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-body font-medium text-muted mb-1.5">
              Title <span className="text-rust">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Complete RLHF implementation"
              className="w-full h-11 rounded-md bg-sunken border border-border-warm px-3 text-base sm:text-sm font-body text-ink placeholder:text-hint focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-all duration-150"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-body font-medium text-muted mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details..."
              className="w-full rounded-md bg-sunken border border-border-warm px-3 py-2.5 text-base sm:text-sm font-body text-ink placeholder:text-hint focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-all duration-150 resize-none"
            />
          </div>

          {/* Target value */}
          <div>
            <label className="block text-xs font-body font-medium text-muted mb-1.5">
              Target value
            </label>
            <input
              type="text"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="e.g. 90% accuracy"
              className="w-full h-11 rounded-md bg-sunken border border-border-warm px-3 text-base sm:text-sm font-body text-ink placeholder:text-hint focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-all duration-150"
            />
          </div>

          {/* Category pills */}
          <div>
            <label className="block text-xs font-body font-medium text-muted mb-2">
              Category
            </label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((cat) => {
                const active = category === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategory(cat.key)}
                    className={`rounded-md px-4 py-2 text-xs font-body font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      active
                        ? "bg-teal text-white"
                        : "bg-sunken text-muted hover:bg-page"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <Button type="submit" disabled={!title.trim()} className="w-full">
            Add Goal
          </Button>
        </form>
      </div>
    </div>
  );
}
