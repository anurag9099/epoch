import { query } from "./db";

function safeSecondsFromPayload(payload: unknown): number {
  if (typeof payload !== "string") return 0;
  try {
    const parsed = JSON.parse(payload) as { seconds?: unknown };
    const seconds = Number(parsed.seconds ?? 0);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  } catch {
    return 0;
  }
}

export async function getTrackedSecondsSince(startDate: string): Promise<number> {
  const events = await query(
    `SELECT payload
     FROM user_events
     WHERE event_type = 'session_time' AND created_at >= ?`,
    [startDate]
  );

  return events.reduce<number>(
    (sum, event) => sum + safeSecondsFromPayload(event.payload),
    0
  );
}

export async function getTrackedSecondsForDate(date: string, taskId?: number): Promise<number> {
  const params: Array<string | number> = [date, date];
  const taskClause = typeof taskId === "number" ? " AND task_id = ?" : "";
  if (typeof taskId === "number") params.push(taskId);

  const events = await query(
    `SELECT payload
     FROM user_events
     WHERE event_type = 'session_time'
       AND created_at >= datetime(?)
       AND created_at < datetime(?, '+1 day')${taskClause}`,
    params
  );

  return events.reduce<number>(
    (sum, event) => sum + safeSecondsFromPayload(event.payload),
    0
  );
}

export async function getLastTrackedEvent(): Promise<{
  created_at: string | null;
  task_id: number | null;
  phase_id: number | null;
} | null> {
  const events = await query(
    `SELECT created_at, task_id, phase_id
     FROM user_events
     WHERE event_type = 'session_time'
     ORDER BY created_at DESC
     LIMIT 1`
  );

  if (events.length === 0) return null;

  const latest = events[0];
  return {
    created_at: (latest.created_at as string | null) ?? null,
    task_id: (latest.task_id as number | null) ?? null,
    phase_id: (latest.phase_id as number | null) ?? null,
  };
}

export async function getTrackedMinutesByDate(days = 42): Promise<Map<string, number>> {
  const events = await query(
    `SELECT created_at, payload
     FROM user_events
     WHERE event_type = 'session_time'
       AND created_at >= datetime('now', ?)`,
    [`-${days} days`]
  );

  const totals = new Map<string, number>();
  for (const event of events) {
    const createdAt = event.created_at as string | undefined;
    if (!createdAt) continue;
    const date = createdAt.slice(0, 10);
    const seconds = safeSecondsFromPayload(event.payload);
    if (seconds <= 0) continue;
    totals.set(date, (totals.get(date) ?? 0) + seconds);
  }

  return new Map(
    Array.from(totals.entries()).map(([date, seconds]) => [date, Math.round(seconds / 60)])
  );
}

export async function getTrackedMinutesByTopic(days = 30): Promise<Map<string, number>> {
  const events = await query(
    `SELECT topic, payload
     FROM user_events
     WHERE event_type = 'session_time'
       AND created_at >= datetime('now', ?)`,
    [`-${days} days`]
  );

  const totals = new Map<string, number>();
  for (const event of events) {
    const topic = event.topic as string | null;
    if (!topic) continue;
    const seconds = safeSecondsFromPayload(event.payload);
    if (seconds <= 0) continue;
    totals.set(topic, (totals.get(topic) ?? 0) + seconds);
  }

  return new Map(
    Array.from(totals.entries()).map(([topic, seconds]) => [topic, Math.round(seconds / 60)])
  );
}
