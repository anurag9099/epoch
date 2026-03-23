import { NextResponse } from "next/server";
import { execute, get, query } from "@/lib/db";
import { analyzeUserState } from "@/lib/analyzer";
import { trackEvent } from "@/lib/observer";
import { matchTopic } from "@/lib/topic-matcher";

export async function POST(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const { answers } = await req.json();

  const score = answers.filter((a: { is_correct: boolean }) => a.is_correct).length;
  const total = answers.length;
  const passed = score / total >= 0.7 ? 1 : 0;

  const attemptCount = await get(
    "SELECT COUNT(*) as c FROM quiz_results WHERE task_id = ?", [taskId]
  );
  const attemptNumber = ((attemptCount?.c as number) ?? 0) + 1;

  await execute(
    "INSERT INTO quiz_results (task_id, attempt_number, score, total, passed) VALUES (?, ?, ?, ?, ?)",
    [taskId, attemptNumber, score, total, passed]
  );

  const result = await get(
    "SELECT id FROM quiz_results WHERE task_id = ? ORDER BY id DESC LIMIT 1", [taskId]
  );
  const resultId = result!.id;

  for (const a of answers) {
    await execute(
      "INSERT INTO quiz_attempts (question_id, result_id, user_answer, is_correct) VALUES (?, ?, ?, ?)",
      [a.question_id, resultId, a.user_answer, a.is_correct ? 1 : 0]
    );
  }

  if (passed) {
    await execute("UPDATE tasks SET status = 'complete', completed_at = datetime('now') WHERE id = ?", [taskId]);
  }

  // Track quiz events
  const questions = await query("SELECT * FROM quiz_questions WHERE task_id = ?", [taskId]);
  for (const a of answers) {
    const q = questions.find((qq) => qq.id === a.question_id);
    const topic = q ? matchTopic(q.question as string) : null;
    await trackEvent("quiz_answer", {
      topic: topic ?? undefined,
      taskId: Number(taskId),
      payload: { question_id: a.question_id, is_correct: a.is_correct },
    });
  }

  try {
    await analyzeUserState();
  } catch {
    /* non-critical */
  }

  return NextResponse.json({ result_id: resultId, score, total, passed: !!passed, attempt_number: attemptNumber });
}
