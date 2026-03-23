"use client";

import { SourceBadge } from "./SourceBadge";

export interface FeedItemData {
  id: number;
  source: string;
  title: string;
  url: string;
  summary: string | null;
  published_at: string;
  is_read: number;
}

interface FeedItemProps {
  item: FeedItemData;
  onMarkRead: (id: number) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function FeedItem({ item, onMarkRead }: FeedItemProps) {
  const readClass = item.is_read ? "text-hint opacity-70" : "text-ink";

  const handleClick = () => {
    onMarkRead(item.id);
    window.open(item.url, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left border-b border-border-warm py-3 flex items-start gap-3 cursor-pointer hover:bg-sunken transition-colors"
    >
      <div className="shrink-0 pt-0.5">
        <SourceBadge source={item.source} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-body font-medium line-clamp-2 ${readClass}`}>
          {item.title}
        </p>
        {item.summary && (
          <p className="text-xs font-body text-muted line-clamp-2 mt-0.5">
            {item.summary}
          </p>
        )}
        <p className="text-[10px] font-body text-hint mt-1">
          {timeAgo(item.published_at)}
        </p>
      </div>
    </button>
  );
}
