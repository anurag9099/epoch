"use client";

interface SourceBadgeProps {
  source: string;
}

const TECH_SOURCES = ["arxiv-lg", "arxiv-cl", "huggingface", "pytorch", "lilianweng", "anthropic"];

function isTechSource(source: string): boolean {
  return TECH_SOURCES.includes(source);
}

function getLabel(source: string): string {
  return source.slice(0, 2).toUpperCase();
}

export function SourceBadge({ source }: SourceBadgeProps) {
  const label = getLabel(source);
  const isTech = isTechSource(source);

  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-[10px] font-body font-bold uppercase tracking-wide whitespace-nowrap ${
        isTech ? "bg-teal text-white" : "bg-rust text-white"
      }`}
    >
      {label}
    </span>
  );
}
