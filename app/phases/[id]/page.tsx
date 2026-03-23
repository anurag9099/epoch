"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Video,
  BookOpen,
  FlaskConical,
  HelpCircle,
  CheckCircle2,
  Circle,
  Loader2,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface Task {
  id: number;
  type: string;
  title: string;
  status: string;
  estimated_minutes: number | null;
  order_num: number;
}

interface PhaseDetail {
  id: number;
  name: string;
  slug: string;
  description: string;
  order_num: number;
  start_week: number;
  end_week: number;
  status: string;
  gate_check_text: string | null;
  tasks: Task[];
  completed: number;
  total: number;
}

const typeConfig: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; group: number }
> = {
  video: { label: "Videos", icon: Video, group: 0 },
  reading: { label: "Readings", icon: BookOpen, group: 1 },
  lab: { label: "Labs", icon: FlaskConical, group: 2 },
  quiz: { label: "Quiz", icon: HelpCircle, group: 3 },
};

function taskHref(task: Task): string {
  if (task.type === "video" || task.type === "reading") return `/learn/${task.id}`;
  if (task.type === "lab") return `/lab/${task.id}`;
  if (task.type === "quiz") return `/quiz/${task.id}`;
  return "#";
}

function StatusIcon({ status }: { status: string }) {
  if (status === "complete")
    return <CheckCircle2 className="h-5 w-5 text-teal flex-shrink-0" />;
  if (status === "in_progress")
    return <Loader2 className="h-5 w-5 text-rust animate-spin flex-shrink-0" />;
  return <Circle className="h-5 w-5 text-hint flex-shrink-0" />;
}

export default function PhaseDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [phase, setPhase] = useState<PhaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/phases/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setPhase(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="px-4 py-6 animate-pulse">
        <div className="h-4 bg-sunken rounded w-24 mb-6" />
        <div className="h-7 bg-sunken rounded w-2/3 mb-3" />
        <div className="h-4 bg-sunken rounded w-full mb-2" />
        <div className="h-4 bg-sunken rounded w-3/4 mb-4" />
        <div className="h-[2px] bg-sunken rounded-full w-full mb-6" />
        <div className="bg-surface border border-border-warm rounded-lg p-4 mb-6">
          <div className="h-5 bg-sunken rounded w-1/2 mb-3" />
          <div className="h-4 bg-sunken rounded w-2/3" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mb-6">
            <div className="h-5 bg-sunken rounded w-1/4 mb-3" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div
                key={j}
                className="h-12 bg-surface border border-border-warm rounded-lg mb-2"
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!phase) {
    return (
      <div className="px-4 py-6">
        <Link
          href="/phases"
          className="inline-flex items-center gap-1 text-sm font-body text-hint hover:text-muted mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> All Phases
        </Link>
        <p className="font-body text-muted">Phase not found.</p>
      </div>
    );
  }

  const progress =
    phase.total > 0
      ? Math.round((phase.completed / phase.total) * 100)
      : 0;

  const nonQuizTasks = phase.tasks.filter((t) => t.type !== "quiz");
  const allNonQuizComplete =
    nonQuizTasks.length > 0 && nonQuizTasks.every((t) => t.status === "complete");
  const quizTask = phase.tasks.find((t) => t.type === "quiz") ?? null;
  const quizPassed = quizTask?.status === "complete";

  const grouped = phase.tasks.reduce<Record<string, Task[]>>((acc, task) => {
    if (!acc[task.type]) acc[task.type] = [];
    acc[task.type].push(task);
    return acc;
  }, {});

  const sortedTypes = Object.keys(grouped).sort(
    (a, b) => (typeConfig[a]?.group ?? 99) - (typeConfig[b]?.group ?? 99)
  );

  return (
    <div className="px-4 py-6">
      {/* Back link */}
      <Link
        href="/phases"
        className="inline-flex items-center gap-1 text-sm font-body text-hint hover:text-muted mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> All Phases
      </Link>

      {/* Phase header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-2xl font-display font-semibold text-ink">{phase.name}</h1>
          <Badge variant="muted">
            Weeks {phase.start_week}-{phase.end_week}
          </Badge>
        </div>
        <p className="font-body text-muted mb-4">{phase.description}</p>
        <ProgressBar value={progress} />
        <p className="text-sm font-body text-hint mt-2">
          {phase.completed} of {phase.total} complete
        </p>
      </div>

      {/* Gate Check Status */}
      <Card className="mb-6">
        <h3 className="font-display font-semibold text-ink mb-2">Gate Check</h3>
        {quizPassed ? (
          <div className="flex items-center gap-2">
            <Badge variant="teal">Gate Check Passed</Badge>
          </div>
        ) : allNonQuizComplete && quizTask ? (
          <div className="flex items-center justify-between">
            <p className="text-sm font-body text-muted">Gate Check Available</p>
            <Button href={`/quiz/${quizTask.id}`}>Take Quiz</Button>
          </div>
        ) : (
          <p className="text-sm font-body text-hint">
            Complete all tasks to unlock gate check
          </p>
        )}
      </Card>

      {/* Task list grouped by type */}
      {sortedTypes.map((type) => {
        const config = typeConfig[type] ?? {
          label: type,
          icon: Circle,
          group: 99,
        };
        const Icon = config.icon;
        const tasks = grouped[type];

        return (
          <section key={type} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Icon className="h-4 w-4 text-hint" />
              <h2 className="text-sm font-display font-semibold text-muted uppercase tracking-wide">
                {config.label}
              </h2>
            </div>
            <div className="space-y-2">
              {tasks.map((task) => (
                <Link
                  key={task.id}
                  href={taskHref(task)}
                  className="flex items-center gap-3 bg-surface border border-border-warm rounded-lg p-3 hover:border-border-hover transition-colors duration-150"
                >
                  <StatusIcon status={task.status} />
                  <span
                    className={`flex-1 text-sm font-body ${
                      task.status === "complete"
                        ? "text-hint line-through"
                        : "text-ink"
                    }`}
                  >
                    {task.title}
                  </span>
                  {task.estimated_minutes != null && (
                    <span className="flex items-center gap-1 text-xs font-body text-hint flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      {task.estimated_minutes}m
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
