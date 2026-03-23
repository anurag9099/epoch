import { execute, get } from "./db";

export async function getStreak() {
  const row = await get("SELECT * FROM streaks WHERE id = 1");
  return row || { current_streak: 0, best_streak: 0, last_active_date: null };
}

export async function updateStreak() {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const streak = await getStreak();
  const lastDate = streak.last_active_date as string | null;

  if (lastDate === today) return streak; // already active today

  let newStreak: number;
  if (lastDate) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    newStreak = lastDate === yesterdayStr ? (streak.current_streak as number) + 1 : 1;
  } else {
    newStreak = 1;
  }

  const bestStreak = Math.max(newStreak, streak.best_streak as number);

  await execute(
    "UPDATE streaks SET current_streak = ?, best_streak = ?, last_active_date = ? WHERE id = 1",
    [newStreak, bestStreak, today]
  );

  // Upsert daily_log
  await execute(
    `INSERT INTO daily_log (date, tasks_completed, minutes_spent) VALUES (?, 0, 0)
     ON CONFLICT(date) DO UPDATE SET tasks_completed = tasks_completed`,
    [today]
  );

  return { current_streak: newStreak, best_streak: bestStreak, last_active_date: today };
}

export async function incrementDailyTasks() {
  const today = new Date().toISOString().split("T")[0];
  await execute(
    `INSERT INTO daily_log (date, tasks_completed, minutes_spent) VALUES (?, 1, 0)
     ON CONFLICT(date) DO UPDATE SET tasks_completed = tasks_completed + 1`,
    [today]
  );
}

export async function addMinutes(minutes: number) {
  const today = new Date().toISOString().split("T")[0];
  await execute(
    `INSERT INTO daily_log (date, tasks_completed, minutes_spent) VALUES (?, 0, ?)
     ON CONFLICT(date) DO UPDATE SET minutes_spent = minutes_spent + ?`,
    [today, minutes, minutes]
  );
}
