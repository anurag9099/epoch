"use client";

interface DailyLog {
  date: string;
  tasks_completed: number;
  minutes_spent: number;
}

interface WeeklyHeatmapProps {
  dailyLogs: DailyLog[];
  streak?: number;
  todayTasksTotal?: number;
}

function getWeekDates(): string[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeeklyHeatmap({ dailyLogs, streak = 0, todayTasksTotal = 0 }: WeeklyHeatmapProps) {
  const weekDates = getWeekDates();
  const logMap = new Map(dailyLogs.map((l) => [l.date, l]));
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div>
      {/* Header */}
      <div className="flex items-baseline justify-between mb-3">
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--text-ink)" }}>
          This Week
        </h3>
        {streak > 0 && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-hint)" }}>
            streak: {streak} days
          </span>
        )}
      </div>

      {/* 7-col grid */}
      <div className="grid grid-cols-7" style={{ gap: 6 }}>
        {weekDates.map((date, i) => {
          const log = logMap.get(date);
          const tasksCompleted = log?.tasks_completed ?? 0;
          const mins = log?.minutes_spent ?? 0;
          const hours = (mins / 60).toFixed(1);
          const isToday = date === todayStr;
          const isFuture = date > todayStr;
          const dayNum = new Date(date).getDate();
          const isDone = tasksCompleted > 0 && !isToday;

          // Background
          let bg = "var(--bg-surface)";
          let borderStyle = "1px solid var(--border)";
          if (isToday) {
            bg = "var(--teal-dim)";
            borderStyle = "1px solid var(--teal)";
          } else if (isDone) {
            bg = "rgba(42, 124, 111, 0.07)";
          }

          return (
            <div
              key={date}
              style={{
                background: bg,
                border: borderStyle,
                borderRadius: 6,
                padding: "6px 4px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                minHeight: 68,
              }}
            >
              {/* Day name */}
              <span style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--text-hint)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {DAY_NAMES[i]}
              </span>

              {/* Date number */}
              <span style={{
                fontFamily: "var(--font-mono, var(--font-body))",
                fontSize: 13,
                fontWeight: 500,
                color: isToday ? "var(--teal)" : "var(--text-ink)",
              }}>
                {dayNum}
              </span>

              {/* Task dots — derived from real completion data */}
              <div style={{ display: "flex", gap: 3, minHeight: 5, alignItems: "center", justifyContent: "center" }}>
                {(() => {
                  const totalDots = isToday ? todayTasksTotal : tasksCompleted;
                  if (totalDots === 0) return null;
                  return Array.from({ length: totalDots }).map((_, di) => (
                    <div key={di} style={{
                      width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                      background: di < tasksCompleted ? "var(--teal)" : "var(--bg-sunken)",
                    }} />
                  ));
                })()}
              </div>

              {/* Status label */}
              <span style={{
                fontFamily: "var(--font-mono, var(--font-body))",
                fontSize: 9,
                color: isToday ? "var(--teal)" : "var(--text-hint)",
              }}>
                {isToday ? "today" : isDone ? `${hours}h` : isFuture ? "" : "–"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
