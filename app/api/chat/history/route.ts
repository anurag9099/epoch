import { NextRequest, NextResponse } from "next/server";
import { query, get } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (sessionId) {
    const messages = await query(
      "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT 50",
      [sessionId]
    );
    const session = await get(
      "SELECT * FROM chat_sessions WHERE id = ?",
      [sessionId]
    );
    return NextResponse.json({ messages, session });
  }

  // Fallback: legacy phase/task based lookup
  const taskId = searchParams.get("taskId");
  const phaseId = searchParams.get("phaseId");

  let sql = "SELECT * FROM chat_messages WHERE 1=1";
  const params: unknown[] = [];

  if (taskId) {
    sql += " AND task_id = ?";
    params.push(taskId);
  } else if (phaseId) {
    sql += " AND phase_id = ? AND task_id IS NULL";
    params.push(phaseId);
  } else {
    sql += " AND phase_id IS NULL AND task_id IS NULL";
  }

  sql += " ORDER BY created_at ASC LIMIT 50";

  const messages = await query(sql, params);
  return NextResponse.json({ messages, session: null });
}
