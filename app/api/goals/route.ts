import { NextRequest, NextResponse } from "next/server";
import { query, execute, get } from "@/lib/db";

export async function GET() {
  const goals = await query("SELECT * FROM goals ORDER BY created_at DESC");
  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const { title, description, target_value, category, phase_id } =
    await req.json();
  if (!title)
    return NextResponse.json({ error: "Title required" }, { status: 400 });

  await execute(
    "INSERT INTO goals (title, description, target_value, category, phase_id) VALUES (?, ?, ?, ?, ?)",
    [
      title,
      description || null,
      target_value || null,
      category || "learning",
      phase_id || null,
    ]
  );

  const goal = await get("SELECT * FROM goals ORDER BY id DESC LIMIT 1");
  return NextResponse.json(goal);
}

export async function PATCH(req: NextRequest) {
  const { id, current_value, status, title, description, target_value } =
    await req.json();
  if (!id)
    return NextResponse.json({ error: "ID required" }, { status: 400 });

  const updates: string[] = [];
  const values: unknown[] = [];

  if (current_value !== undefined) {
    updates.push("current_value = ?");
    values.push(current_value);
  }
  if (status !== undefined) {
    updates.push("status = ?");
    values.push(status);
    if (status === "achieved") {
      updates.push("achieved_at = datetime('now')");
    }
  }
  if (title !== undefined) {
    updates.push("title = ?");
    values.push(title);
  }
  if (description !== undefined) {
    updates.push("description = ?");
    values.push(description);
  }
  if (target_value !== undefined) {
    updates.push("target_value = ?");
    values.push(target_value);
  }

  if (updates.length === 0)
    return NextResponse.json({ error: "No fields" }, { status: 400 });

  values.push(id);
  await execute(
    `UPDATE goals SET ${updates.join(", ")} WHERE id = ?`,
    values
  );

  const goal = await get("SELECT * FROM goals WHERE id = ?", [id]);
  return NextResponse.json(goal);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await execute("DELETE FROM goals WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
