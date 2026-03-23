import { NextResponse } from "next/server";
import { get } from "@/lib/db";
import { trackEvent } from "@/lib/observer";
import { topicForPhase } from "@/lib/topic-matcher";
import { updateStreak } from "@/lib/streak";

export async function POST(req: Request) {
  const { events } = await req.json();

  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: "events array required" }, { status: 400 });
  }

  let inserted = 0;
  let shouldUpdateStreak = false;

  for (const evt of events) {
    const taskId = typeof evt.task_id === "number" ? evt.task_id : undefined;
    let phaseId = typeof evt.phase_id === "number" ? evt.phase_id : undefined;

    if (!phaseId && taskId) {
      const task = await get("SELECT phase_id FROM tasks WHERE id = ?", [taskId]);
      phaseId = (task?.phase_id as number | undefined) ?? undefined;
    }

    const topic =
      typeof evt.topic === "string" && evt.topic.length > 0
        ? evt.topic
        : phaseId
          ? topicForPhase(phaseId) ?? undefined
          : undefined;

    const payload =
      evt.payload && typeof evt.payload === "object"
        ? evt.payload
        : undefined;

    if (evt.event_type === "session_time") {
      const seconds = Number(payload?.seconds ?? 0);
      if (Number.isFinite(seconds) && seconds >= 45) {
        shouldUpdateStreak = true;
      }
    }

    await trackEvent(evt.event_type, {
      topic,
      phaseId,
      taskId,
      payload,
    });
    inserted++;
  }

  if (shouldUpdateStreak) {
    await updateStreak();
  }

  return NextResponse.json({ inserted });
}
