import { NextRequest, NextResponse } from "next/server";
import { query, execute, get } from "@/lib/db";

// GET — list all sessions (most recent first)
export async function GET() {
  const sessions = await query(
    `SELECT s.*,
            (SELECT COUNT(*) FROM chat_messages WHERE session_id = s.id) as message_count
     FROM chat_sessions s
     ORDER BY s.updated_at DESC
     LIMIT 50`
  );
  return NextResponse.json(sessions);
}

// POST — create new session
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, phase_id, task_id } = body;

  await execute(
    `INSERT INTO chat_sessions (title, phase_id, task_id, model)
     VALUES (?, ?, ?, ?)`,
    [
      title || "New conversation",
      phase_id || null,
      task_id || null,
      "gpt-5.4",
    ]
  );

  // Get the newly created session
  const session = await get(
    "SELECT * FROM chat_sessions ORDER BY id DESC LIMIT 1"
  );

  return NextResponse.json(session, { status: 201 });
}

// PATCH — update session title
export async function PATCH(req: NextRequest) {
  const { id, title } = await req.json();

  if (!id || !title) {
    return NextResponse.json(
      { error: "id and title required" },
      { status: 400 }
    );
  }

  await execute(
    "UPDATE chat_sessions SET title = ?, updated_at = datetime('now') WHERE id = ?",
    [title, id]
  );

  return NextResponse.json({ success: true });
}
