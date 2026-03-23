import { execute } from "./db";

export async function trackEvent(
  eventType: string,
  opts: {
    topic?: string;
    phaseId?: number;
    taskId?: number;
    payload?: Record<string, unknown>;
  }
) {
  await execute(
    "INSERT INTO user_events (event_type, topic, phase_id, task_id, payload) VALUES (?, ?, ?, ?, ?)",
    [
      eventType,
      opts.topic ?? null,
      opts.phaseId ?? null,
      opts.taskId ?? null,
      opts.payload ? JSON.stringify(opts.payload) : null,
    ]
  );
}
