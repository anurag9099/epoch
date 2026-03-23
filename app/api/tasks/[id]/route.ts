import { NextResponse } from "next/server";
import { query, get, execute } from "@/lib/db";
import { analyzeUserState } from "@/lib/analyzer";
import { updateStreak, incrementDailyTasks } from "@/lib/streak";
import { trackEvent } from "@/lib/observer";
import { getAdjacentCanonicalLabIds } from "@/lib/labs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await get("SELECT * FROM tasks WHERE id = ?", [id]);
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const extra: Record<string, unknown> = {};

  if (task.type === "video") {
    extra.segments = await query(
      "SELECT * FROM task_segments WHERE task_id = ? ORDER BY order_num",
      [id]
    );
  } else if (task.type === "quiz") {
    extra.questions = await query(
      "SELECT * FROM quiz_questions WHERE task_id = ? ORDER BY order_num",
      [id]
    );
  } else if (task.type === "lab") {
    const fields = await query(
      "SELECT * FROM lab_fields WHERE task_id = ? ORDER BY order_num",
      [id]
    );
    // Join with lab_results
    for (const field of fields) {
      const result = await get(
        "SELECT * FROM lab_results WHERE field_id = ?",
        [field.id]
      );
      (field as Record<string, unknown>).result = result;
    }
    extra.fields = fields;
  }

  // Get phase info for breadcrumb
  const phase = await get("SELECT id, name, slug FROM phases WHERE id = ?", [task.phase_id]);

  // Get prev/next IDs for navigation
  let prevTaskId: number | null = null;
  let nextTaskId: number | null = null;

  if (task.type === "lab") {
    const adjacentLabs = await getAdjacentCanonicalLabIds({
      id: task.id as number,
      phase_id: task.phase_id as number,
      title: task.title as string,
    });
    prevTaskId = adjacentLabs.prevTaskId;
    nextTaskId = adjacentLabs.nextTaskId;
  } else {
    const prevTask = await get(
      "SELECT id FROM tasks WHERE phase_id = ? AND order_num < ? ORDER BY order_num DESC, id DESC LIMIT 1",
      [task.phase_id, task.order_num]
    );
    const nextTask = await get(
      "SELECT id FROM tasks WHERE phase_id = ? AND order_num > ? ORDER BY order_num ASC, id ASC LIMIT 1",
      [task.phase_id, task.order_num]
    );
    prevTaskId = (prevTask?.id as number | undefined) ?? null;
    nextTaskId = (nextTask?.id as number | undefined) ?? null;
  }

  return NextResponse.json({
    ...task,
    ...extra,
    phase,
    prevTaskId,
    nextTaskId,
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.status !== undefined) {
    updates.push("status = ?");
    values.push(body.status);
    if (body.status === "complete") {
      updates.push("completed_at = datetime('now')");
    }
  }
  if (body.notes !== undefined) {
    updates.push("notes = ?");
    values.push(body.notes);
  }
  if (body.takeaways !== undefined) {
    updates.push("takeaways = ?");
    values.push(JSON.stringify(body.takeaways));
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  values.push(id);
  await execute(
    `UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`,
    values
  );

  const taskData = await get("SELECT * FROM tasks WHERE id = ?", [id]);

  // If marking complete, update streak and daily log
  if (body.status === "complete") {
    await updateStreak();
    await incrementDailyTasks();

    await trackEvent("task_complete", {
      taskId: Number(id),
      phaseId: taskData?.phase_id as number | undefined,
      payload: { title: taskData?.title, type: taskData?.type },
    });
  }

  if (body.notes !== undefined) {
    await trackEvent("note_saved", {
      taskId: Number(id),
      phaseId: taskData?.phase_id as number | undefined,
      payload: { has_notes: Boolean(body.notes) },
    });
  }

  if (body.status === "complete") {
    try {
      await analyzeUserState();
    } catch {
      /* non-critical */
    }
  }

  return NextResponse.json(taskData);
}
