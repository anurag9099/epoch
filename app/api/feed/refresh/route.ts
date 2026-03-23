import { NextResponse } from "next/server";
import { execute, get } from "@/lib/db";
import { fetchAllFeeds } from "@/lib/feed-fetcher";

export async function POST() {
  // Check staleness — only fetch if last fetch > 6 hours ago
  const latest = await get("SELECT MAX(fetched_at) as last_fetch FROM feed_items");
  if (latest?.last_fetch) {
    const lastFetch = new Date(latest.last_fetch as string).getTime();
    const sixHours = 6 * 60 * 60 * 1000;
    if (Date.now() - lastFetch < sixHours) {
      return NextResponse.json({ added: 0, message: "Feed is fresh" });
    }
  }

  const items = await fetchAllFeeds();
  let added = 0;

  for (const item of items) {
    try {
      await execute(
        `INSERT OR IGNORE INTO feed_items (source, title, url, summary, published_at)
         VALUES (?, ?, ?, ?, ?)`,
        [item.source, item.title, item.url, item.summary, item.published_at]
      );
      added++;
    } catch {
      // Duplicate URL — skip
    }
  }

  return NextResponse.json({ added, total: items.length });
}
