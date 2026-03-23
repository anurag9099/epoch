"use client";

type Model = "opus" | "gpt";

interface ModelSelectorProps {
  model: Model;
  onChange: (model: Model) => void;
}

export function ModelSelector({ model, onChange }: ModelSelectorProps) {
  const models: { id: Model; label: string; dotClass: string }[] = [
    { id: "opus", label: "Opus 4.6", dotClass: "bg-teal" },
    { id: "gpt", label: "GPT-5.4", dotClass: "bg-gold" },
  ];

  const current = models.find((m) => m.id === model) ?? models[0];
  const next = models.find((m) => m.id !== model) ?? models[1];

  return (
    <button
      type="button"
      onClick={() => onChange(next.id)}
      className="inline-flex items-center gap-1.5 bg-sunken border border-border-warm rounded-md px-2 py-0.5 text-[10px] text-muted cursor-pointer hover:border-border-hover transition-colors"
      title={`Switch to ${next.label}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dotClass} shrink-0`} />
      <span className="font-body font-medium">{current.label}</span>
    </button>
  );
}
