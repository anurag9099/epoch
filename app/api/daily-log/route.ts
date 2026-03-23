import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTrackedMinutesByDate } from "@/lib/session-analytics";
import { addMinutes } from "@/lib/streak";

export async function GET() {
  const [logs, trackedMinutes] = await Promise.all([
    query("SELECT * FROM daily_log ORDER BY date DESC LIMIT 42"),
    getTrackedMinutesByDate(42),
  ]);

  const merged = new Map<string, Record<string, unknown>>();

  for (const log of logs) {
    const date = log.date as string;
    const tracked = trackedMinutes.get(date) ?? 0;
    merged.set(date, {
      ...log,
      minutes_spent: tracked > 0 ? tracked : log.minutes_spent,
    });
  }

  for (const [date, minutes] of Array.from(trackedMinutes.entries())) {
    if (!merged.has(date)) {
      merged.set(date, {
        date,
        tasks_completed: 0,
        minutes_spent: minutes,
        notes: null,
      });
    }
  }

  return NextResponse.json(
    Array.from(merged.values()).sort((a, b) =>
      String(b.date).localeCompare(String(a.date))
    )
  );
}

export async function POST(req: Request) {
  const { minutes } = await req.json();
  if (typeof minutes !== "number" || minutes <= 0) {
    return NextResponse.json({ error: "Invalid minutes" }, { status: 400 });
  }
  await addMinutes(minutes);
  return NextResponse.json({ ok: true });
}
