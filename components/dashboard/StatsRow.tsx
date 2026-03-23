"use client";

interface StatsRowProps {
  tasksDone: number;
  totalTasks: number;
  quizzesPassed: number;
  hoursThisWeek: number;
}

export function StatsRow({
  tasksDone,
  totalTasks,
  quizzesPassed,
  hoursThisWeek,
}: StatsRowProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-surface border border-border-warm rounded-lg p-4">
        <p className="text-2xl font-display font-semibold text-ink">{tasksDone}</p>
        <p className="text-[10px] font-body text-hint uppercase tracking-widest">
          / {totalTasks} tasks
        </p>
      </div>
      <div className="bg-surface border border-border-warm rounded-lg p-4">
        <p className="text-2xl font-display font-semibold text-gold">{quizzesPassed}</p>
        <p className="text-[10px] font-body text-hint uppercase tracking-widest">passed</p>
      </div>
      <div className="bg-surface border border-border-warm rounded-lg p-4">
        <p className="text-2xl font-display font-semibold text-teal">{hoursThisWeek}</p>
        <p className="text-[10px] font-body text-hint uppercase tracking-widest">this week</p>
      </div>
    </div>
  );
}
