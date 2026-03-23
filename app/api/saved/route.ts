import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const saved = await query(
    `SELECT si.*,
       COALESCE(r.title, fi.title) as title,
       COALESCE(r.url, fi.url) as url
     FROM saved_items si
     LEFT JOIN recommendations r ON si.recommendation_id = r.id
     LEFT JOIN feed_items fi ON si.feed_item_id = fi.id
     ORDER BY si.created_at DESC`
  );
  return NextResponse.json(saved);
}
