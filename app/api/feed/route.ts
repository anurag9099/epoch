import { NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { trackEvent } from "@/lib/observer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source");
  const markRead = searchParams.get("markRead");

  if (markRead) {
    await execute("UPDATE feed_items SET is_read = 1 WHERE id = ?", [markRead]);
    await trackEvent("feed_read", {
      payload: { feed_item_id: Number(markRead) },
    });
    return NextResponse.json({ ok: true });
  }

  let sql = "SELECT * FROM feed_items";
  const params: unknown[] = [];

  if (source && source !== "all") {
    sql += " WHERE source = ?";
    params.push(source);
  }

  sql += " ORDER BY published_at DESC LIMIT 50";
  const items = await query(sql, params);
  return NextResponse.json(items);
}
