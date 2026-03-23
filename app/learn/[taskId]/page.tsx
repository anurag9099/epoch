"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { TimeLoggerModal } from "@/components/ui/TimeLoggerModal";
import { useToast } from "@/components/ui/Toast";
import { VideoPlayer } from "@/components/learn/VideoPlayer";
import { SegmentTracker } from "@/components/learn/SegmentTracker";
import { NotesEditor } from "@/components/learn/NotesEditor";
import { ReadingView } from "@/components/learn/ReadingView";
import { MissionSessionStatus } from "@/components/telemetry/MissionSessionStatus";

interface Segment {
  id: number;
  label: string;
  completed: number;
  order_num: number;
}

interface Phase {
  id: number;
  name: string;
  slug: string;
}

interface Task {
  id: number;
  type: string;
  title: string;
  description: string | null;
  content_url: string;
  notes: string | null;
  takeaways: string | null;
  status: string;
  prevTaskId: number | null;
  nextTaskId: number | null;
  phase: Phase;
  segments?: Segment[];
}

export default function LearnPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTimeLogger, setShowTimeLogger] = useState(false);
  const toast = useToast();

  const fetchTask = useCallback(() => {
    setLoading(true);
    fetch(`/api/tasks/${taskId}`)
      .then((res) => res.json())
      .then((data) => {
        setTask(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const handleSegmentToggle = useCallback((updatedSegment: Segment) => {
    setTask((prev) => {
      if (!prev?.segments) return prev;
      return {
        ...prev,
        segments: prev.segments.map((segment) =>
          segment.id === updatedSegment.id ? { ...segment, ...updatedSegment } : segment
        ),
      };
    });
  }, []);

  const handleMarkComplete = async () => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "complete" }),
    });
    setShowTimeLogger(true);
  };

  const handleTimeLogged = (minutes: number) => {
    void minutes;
    setShowTimeLogger(false);
    toast.success("Task completed!");
    if (task?.nextTaskId) {
      router.push(`/learn/${task.nextTaskId}`);
    } else {
      fetchTask();
    }
  };

  if (loading) {
    return (
      <div className="py-6 animate-pulse">
        <div className="h-4 bg-sunken rounded w-40 mb-6" />
        <div className="h-7 bg-sunken rounded w-2/3 mb-4" />
        <div className="aspect-video bg-sunken rounded-lg mb-6" />
        <div className="h-4 bg-sunken rounded w-full mb-2" />
        <div className="h-4 bg-sunken rounded w-3/4 mb-2" />
        <div className="h-4 bg-sunken rounded w-1/2 mb-6" />
        <div className="h-32 bg-sunken rounded-lg" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="py-6">
        <p className="font-body text-muted">Task not found.</p>
      </div>
    );
  }

  const isComplete = task.status === "complete";

  return (
    <div className="py-6">
      <MissionSessionStatus />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm font-body text-hint mb-4">
        <Link
          href={`/phases/${task.phase.id}`}
          className="hover:text-muted transition-colors duration-150"
        >
          {task.phase.name}
        </Link>
        <span className="text-hint">&gt;</span>
        <span className="text-muted truncate">{task.title}</span>
      </nav>

      {/* Title */}
      <h1 className="text-2xl font-display font-semibold text-ink mb-6">{task.title}</h1>

      {/* Content area */}
      {task.type === "video" && (
        <div className="space-y-6">
          <VideoPlayer contentUrl={task.content_url} />
          {task.segments && task.segments.length > 0 && (
            <Card>
              <SegmentTracker
                segments={task.segments}
                taskId={taskId}
                onToggle={handleSegmentToggle}
              />
            </Card>
          )}
          <Card>
            <NotesEditor
              initialValue={task.notes ?? ""}
              taskId={taskId}
              field="notes"
            />
          </Card>
        </div>
      )}

      {task.type === "reading" && (
        <div className="space-y-6">
          <Card>
            <ReadingView task={task} />
          </Card>
          <Card>
            <NotesEditor
              initialValue={task.notes ?? ""}
              taskId={taskId}
              field="notes"
            />
          </Card>
        </div>
      )}

      {/* Inline navigation — below content, not fixed */}
      <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-border-warm">
        <Button
          variant="secondary"
          href={task.prevTaskId ? `/learn/${task.prevTaskId}` : undefined}
          disabled={!task.prevTaskId}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </Button>

        {isComplete ? (
          <Badge variant="teal">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Completed
          </Badge>
        ) : (
          <Button onClick={handleMarkComplete}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark Complete
          </Button>
        )}

        <Button
          variant="secondary"
          href={task.nextTaskId ? `/learn/${task.nextTaskId}` : undefined}
          disabled={!task.nextTaskId}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Time Logger Modal */}
      <TimeLoggerModal
        isOpen={showTimeLogger}
        onClose={() => {
          setShowTimeLogger(false);
          fetchTask();
        }}
        onSubmit={handleTimeLogged}
      />
    </div>
  );
}
