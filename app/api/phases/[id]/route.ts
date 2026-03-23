import { NextResponse } from "next/server";
import { query, get } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const phase = await get("SELECT * FROM phases WHERE id = ?", [id]);
  if (!phase) return NextResponse.json({ error: "Phase not found" }, { status: 404 });

  const tasks = await query(
    "SELECT * FROM tasks WHERE phase_id = ? ORDER BY order_num",
    [id]
  );

  const completed = tasks.filter((t: Record<string, unknown>) => t.status === "complete").length;

  return NextResponse.json({ ...phase, tasks, completed, total: tasks.length });
}
