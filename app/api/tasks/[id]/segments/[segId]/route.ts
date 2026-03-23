import { NextResponse } from "next/server";
import { get, execute } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; segId: string }> }
) {
  const { segId } = await params;
  const segment = await get("SELECT * FROM task_segments WHERE id = ?", [segId]);
  if (!segment) return NextResponse.json({ error: "Segment not found" }, { status: 404 });

  const newCompleted = segment.completed === 1 ? 0 : 1;
  await execute("UPDATE task_segments SET completed = ? WHERE id = ?", [newCompleted, segId]);

  return NextResponse.json({ ...segment, completed: newCompleted });
}
