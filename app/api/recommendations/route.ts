import { NextResponse } from "next/server";
import { query, execute, get } from "@/lib/db";
import { analyzeUserState } from "@/lib/analyzer";
import { generateRecommendations } from "@/lib/recommender";
import { buildRecommendationContext } from "@/lib/intelligence/presenter";

export async function GET() {
  const [recs, savedCount, context] = await Promise.all([
    query("SELECT * FROM recommendations WHERE status = 'active' ORDER BY priority DESC, created_at DESC"),
    get("SELECT COUNT(*) as c FROM saved_items"),
    buildRecommendationContext(),
  ]);

  return NextResponse.json({
    recommendations: recs,
    savedCount: (savedCount?.c as number) ?? 0,
    context,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { action } = body;

  if (action === "refresh") {
    try {
      await analyzeUserState();
    } catch {
      /* non-critical */
    }
    await generateRecommendations();
    const [recs, context] = await Promise.all([
      query("SELECT * FROM recommendations WHERE status = 'active' ORDER BY priority DESC, created_at DESC"),
      buildRecommendationContext(),
    ]);
    return NextResponse.json({ recommendations: recs, context });
  }

  if (action === "dismiss" && body.id) {
    await execute("UPDATE recommendations SET status = 'dismissed' WHERE id = ?", [body.id]);
    return NextResponse.json({ ok: true });
  }

  if (action === "save" && body.id) {
    const rec = await get("SELECT * FROM recommendations WHERE id = ?", [body.id]);
    if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await execute(
      "INSERT INTO saved_items (recommendation_id, notes) VALUES (?, ?)",
      [body.id, body.notes ?? null]
    );
    await execute("UPDATE recommendations SET status = 'completed' WHERE id = ?", [body.id]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
