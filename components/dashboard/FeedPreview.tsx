"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface FeedItem {
  id: number;
  title: string;
  source: string;
  published_at: string;
}

interface FeedPreviewProps {
  items: FeedItem[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const TECH_SOURCES = ["arxiv", "pytorch", "huggingface", "lilianweng", "anthropic"];

function sourceInitials(source: string): string {
  return source.slice(0, 2).toUpperCase();
}

function sourceBadgeClass(source: string): string {
  const isTech = TECH_SOURCES.some((s) => source.toLowerCase().startsWith(s));
  return isTech ? "bg-teal text-white" : "bg-rust text-white";
}

export function FeedPreview({ items }: FeedPreviewProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-display font-semibold text-ink">
          Latest
        </h3>
        <Link href="/lens" className="text-teal text-sm font-body hover:underline">
          View all &rarr;
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-6">
          <p className="font-display italic text-muted mb-3">
            Your reading list awaits.
          </p>
          <Button href="/lens" variant="secondary">
            Go to Lens
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border-warm">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 py-2.5"
            >
              <span
                className={`h-6 w-6 shrink-0 rounded-sm flex items-center justify-center text-[9px] font-body font-bold ${sourceBadgeClass(item.source)}`}
              >
                {sourceInitials(item.source)}
              </span>
              <span className="flex-1 text-sm font-body text-ink truncate">
                {item.title}
              </span>
              <span className="text-[10px] font-body text-hint shrink-0">
                {timeAgo(item.published_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
