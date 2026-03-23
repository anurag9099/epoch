"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw, Bookmark, ExternalLink, X, Search } from "lucide-react";
import { FeedFilter } from "@/components/feed/FeedFilter";
import { FeedItem, FeedItemData } from "@/components/feed/FeedItem";
import { useToast } from "@/components/ui/Toast";

interface Recommendation {
  id: number;
  source: string;
  title: string;
  url: string;
  content_type: string;
  reason: string;
  topic: string;
  priority: number;
  status: string;
  created_at: string;
}

interface RecommendationContext {
  headline: string;
  summary: string;
  signals: Array<{
    signalType: string;
    topic: string;
    label: string;
    topicLabel: string;
    evidence: string;
    confidence: number;
    href: string | null;
  }>;
}

interface SavedItem {
  id: number;
  feed_item_id: number | null;
  recommendation_id: number | null;
  notes: string | null;
  created_at: string;
  title?: string;
  url?: string;
}

type Tab = "latest" | "foryou" | "saved";

const BLOG_SOURCES = ["interconnects", "lilianweng", "pytorch", "anthropic"];

export default function LensPage() {
  return (
    <Suspense fallback={<div className="animate-pulse space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-sunken rounded-lg" />)}</div>}>
      <LensPageInner />
    </Suspense>
  );
}

function LensPageInner() {
  const [activeTab, setActiveTab] = useState<Tab>("foryou");
  const [items, setItems] = useState<FeedItemData[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommendationContext, setRecommendationContext] = useState<RecommendationContext | null>(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const toast = useToast();
  const searchParams = useSearchParams();
  const [highlightTopic, setHighlightTopic] = useState<string | null>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Handle ?tab=foryou and ?highlight=topic on mount
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "latest") setActiveTab("latest");
    if (tab === "foryou") setActiveTab("foryou");
    if (tab === "saved") setActiveTab("saved");

    const hl = searchParams.get("highlight");
    if (hl) {
      setHighlightTopic(hl);
      // Clear highlight after 3 seconds
      const timer = setTimeout(() => setHighlightTopic(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // Scroll to highlighted item when items load
  useEffect(() => {
    if (highlightTopic && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightTopic, items]);

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/feed");
    const data = await res.json();
    setItems(data);
  }, []);

  const fetchRecommendations = useCallback(async () => {
    setRecsLoading(true);
    try {
      const res = await fetch("/api/recommendations");
      const data = await res.json();
      setRecommendations(data.recommendations || []);
      setRecommendationContext(data.context || null);
    } finally {
      setRecsLoading(false);
    }
  }, []);

  const fetchSaved = useCallback(async () => {
    setSavedLoading(true);
    try {
      const res = await fetch("/api/saved");
      const data = await res.json();
      setSavedItems(data || []);
    } catch {
      setSavedItems([]);
    } finally {
      setSavedLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (activeTab === "latest") {
        await fetch("/api/feed/refresh", { method: "POST" });
        await fetchItems();
        toast.success("Feed updated");
      } else if (activeTab === "foryou") {
        await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "refresh" }),
        });
        await fetchRecommendations();
        toast.success("Recommendations refreshed");
      }
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, fetchItems, fetchRecommendations, toast]);

  useEffect(() => {
    (async () => {
      try {
        await fetch("/api/feed/refresh", { method: "POST" });
        await fetchItems();
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchItems]);

  useEffect(() => {
    if (activeTab === "foryou") fetchRecommendations();
    if (activeTab === "saved") fetchSaved();
  }, [activeTab, fetchRecommendations, fetchSaved]);

  const handleMarkRead = async (id: number) => {
    await fetch(`/api/feed?markRead=${id}`);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_read: 1 } : item))
    );
  };

  const handleDismiss = async (id: number) => {
    await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss", id }),
    });
    setRecommendations((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSave = async (id: number) => {
    await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", id }),
    });
    setRecommendations((prev) => prev.filter((r) => r.id !== id));
    toast.success("Saved to bookmarks");
  };

  const filtered = items.filter((item) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "arxiv") return item.source.startsWith("arxiv");
    if (activeFilter === "blogs") return BLOG_SOURCES.includes(item.source);
    if (activeFilter === "huggingface") return item.source === "huggingface";
    if (activeFilter === "reddit") return item.source === "reddit";
    return true;
  });

  const TABS: { key: Tab; label: string }[] = [
    { key: "foryou", label: "For You" },
    { key: "latest", label: "Library" },
    { key: "saved", label: "Saved" },
  ];

  return (
    <div className="space-y-4 pb-4">
      <style>{`
        @keyframes highlight-fade {
          0% { box-shadow: 0 0 0 2px #2a7c6f; }
          70% { box-shadow: 0 0 0 2px #2a7c6f; }
          100% { box-shadow: 0 0 0 0px transparent; }
        }
      `}</style>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-teal" />
          <h1 className="text-lg font-display font-semibold text-ink">Lens</h1>
        </div>
        {activeTab !== "saved" && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-md hover:bg-sunken transition-colors text-muted cursor-pointer"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        )}
      </div>
      <p className="text-sm text-muted">
        Default to the signals and resources that support your active path. Open the library only when you intentionally need broader context.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 bg-sunken rounded-lg p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === tab.key
                ? "bg-teal text-white"
                : "text-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Latest tab */}
      {activeTab === "latest" && (
        <>
          <FeedFilter activeFilter={activeFilter} onFilter={setActiveFilter} />
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-sunken rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-display italic text-muted">
                Nothing here yet. Hit refresh to discover new reads.
              </p>
            </div>
          ) : (
            <div>
              {(() => {
                const hlLower = highlightTopic?.toLowerCase() ?? "";
                let firstMatchFound = false;
                return filtered.map((item) => {
                  const isMatch = hlLower && !firstMatchFound && (
                    item.title.toLowerCase().includes(hlLower) ||
                    (item.summary?.toLowerCase().includes(hlLower))
                  );
                  if (isMatch) firstMatchFound = true;
                  return (
                    <div
                      key={item.id}
                      ref={isMatch ? highlightRef : undefined}
                      style={isMatch ? {
                        boxShadow: "0 0 0 2px #2a7c6f",
                        borderRadius: 8,
                        transition: "box-shadow 0.3s ease",
                        animation: "highlight-fade 3s ease-out forwards",
                      } : undefined}
                    >
                      <FeedItem
                        item={item}
                        onMarkRead={handleMarkRead}
                      />
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </>
      )}

      {/* For You tab */}
      {activeTab === "foryou" && (
        <>
          {recsLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-sunken rounded-lg" />
              ))}
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-display italic text-muted">
                No recommendations yet. Complete some tasks and quizzes first.
              </p>
              <button
                onClick={handleRefresh}
                className="mt-3 px-4 py-2 bg-teal text-white text-sm rounded-md hover:bg-teal/90 transition-colors cursor-pointer"
              >
                Generate Recommendations
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendationContext ? (
                <div className="bg-surface border border-border-warm rounded-lg p-4 space-y-3">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-teal">
                      Why these now
                    </div>
                    <h3 className="text-sm font-medium text-ink mt-1">
                      {recommendationContext.headline}
                    </h3>
                    <p className="text-xs text-muted mt-1 leading-6">
                      {recommendationContext.summary}
                    </p>
                  </div>
                  {recommendationContext.signals.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {recommendationContext.signals.map((signal) => {
                        const chip = (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border-warm bg-sunken text-xs">
                            <span className="font-medium text-teal">{signal.label}</span>
                            <span className="text-hint">{signal.topicLabel}</span>
                          </span>
                        );

                        return signal.href ? (
                          <a
                            key={`${signal.signalType}-${signal.topic}`}
                            href={signal.href}
                            className="no-underline"
                          >
                            {chip}
                          </a>
                        ) : (
                          <span key={`${signal.signalType}-${signal.topic}`}>{chip}</span>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-surface border border-border-warm rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-teal/10 text-teal uppercase tracking-wider">
                          {rec.content_type || "article"}
                        </span>
                        {rec.topic && (
                          <span className="text-[10px] text-hint">
                            {rec.topic.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-ink truncate">
                        {rec.title}
                      </h3>
                      <p className="text-xs text-teal mt-1 line-clamp-2">
                        {rec.reason}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    {rec.url && (
                      <a
                        href={rec.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 bg-teal text-white text-xs rounded-md hover:bg-teal/90 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Read
                      </a>
                    )}
                    <button
                      onClick={() => handleSave(rec.id)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-sunken text-muted text-xs rounded-md hover:text-ink transition-colors cursor-pointer"
                    >
                      <Bookmark className="h-3 w-3" />
                      Save
                    </button>
                    <button
                      onClick={() => handleDismiss(rec.id)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-sunken text-muted text-xs rounded-md hover:text-ink transition-colors cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Saved tab */}
      {activeTab === "saved" && (
        <>
          {savedLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-sunken rounded-lg" />
              ))}
            </div>
          ) : savedItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-display italic text-muted">
                No saved items yet. Save recommendations from the For You tab.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {savedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-3 px-4 bg-surface border border-border-warm rounded-lg"
                >
                  <Bookmark className="h-4 w-4 text-teal flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-body text-ink truncate block">
                      {item.title || `Saved item #${item.id}`}
                    </span>
                    {item.notes && (
                      <span className="text-xs text-hint block truncate mt-0.5">
                        {item.notes}
                      </span>
                    )}
                  </div>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
