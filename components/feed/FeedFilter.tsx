"use client";

interface FeedFilterProps {
  activeFilter: string;
  onFilter: (filter: string) => void;
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "arxiv", label: "arXiv" },
  { key: "huggingface", label: "HuggingFace" },
  { key: "blogs", label: "Blogs" },
  { key: "reddit", label: "Reddit" },
];

export function FeedFilter({ activeFilter, onFilter }: FeedFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
      {FILTERS.map((f) => {
        const active = activeFilter === f.key;
        return (
          <button
            key={f.key}
            onClick={() => onFilter(f.key)}
            className={`rounded-md px-4 py-2 text-xs font-body font-medium whitespace-nowrap transition-colors cursor-pointer ${
              active
                ? "bg-teal text-white"
                : "bg-sunken text-muted hover:bg-surface"
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
