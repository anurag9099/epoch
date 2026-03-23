"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { AnswerOptions } from "@/components/quiz/AnswerOptions";
import { QuizResults } from "@/components/quiz/QuizResults";
import { MissionSessionStatus } from "@/components/telemetry/MissionSessionStatus";

interface Question {
  id: number;
  question: string;
  type: "mcq" | "freetext";
  options_json: string;
  correct_answer: string;
  explanation: string;
  order_num: number;
}

interface Phase {
  id: number;
  name: string;
}

interface Task {
  id: number;
  type: string;
  title: string;
  prevTaskId: number | null;
  nextTaskId: number | null;
  phase: Phase;
  questions: Question[];
}

interface AnswerRecord {
  question_id: number;
  user_answer: string;
  is_correct: boolean;
}

interface SubmitResult {
  result_id: number;
  score: number;
  total: number;
  passed: boolean;
  attempt_number: number;
}

type QuizState = "answering" | "reviewing" | "results";

export default function QuizPage() {
  const params = useParams();
  const taskId = params.taskId as string;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<QuizState>("answering");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
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

  const currentQuestion = task?.questions?.[currentIndex] ?? null;
  const isLastQuestion = task ? currentIndex === task.questions.length - 1 : false;

  const handleSelect = (answer: string) => {
    if (state === "reviewing" && currentQuestion?.type === "freetext") {
      if (answer === "__self_grade_correct" || answer === "__self_grade_incorrect") {
        const isCorrect = answer === "__self_grade_correct";
        setAnswers((prev) =>
          prev.map((a) =>
            a.question_id === currentQuestion.id
              ? { ...a, is_correct: isCorrect }
              : a
          )
        );
        return;
      }
    }
    setCurrentAnswer(answer);
  };

  const handleSubmitAnswer = () => {
    if (!currentQuestion || currentAnswer === null) return;

    const isMcq = currentQuestion.type === "mcq";
    const isCorrect = isMcq
      ? currentAnswer === currentQuestion.correct_answer
      : false;

    const record: AnswerRecord = {
      question_id: currentQuestion.id,
      user_answer: currentAnswer,
      is_correct: isCorrect,
    };

    setAnswers((prev) => [...prev, record]);
    setState("reviewing");
  };

  const handleNext = async () => {
    if (isLastQuestion) {
      setSubmitting(true);
      try {
        const res = await fetch(`/api/quiz/${taskId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        });
        const data: SubmitResult = await res.json();
        setSubmitResult(data);
        setState("results");
        if (data.passed) {
          toast.success("Quiz passed!");
        } else {
          toast.error("Keep going \u2014 70% needed");
        }
      } catch {
        // stay on reviewing state
      } finally {
        setSubmitting(false);
      }
    } else {
      setCurrentIndex((prev) => prev + 1);
      setCurrentAnswer(null);
      setState("answering");
    }
  };

  const handleRetake = () => {
    setCurrentIndex(0);
    setCurrentAnswer(null);
    setAnswers([]);
    setSubmitResult(null);
    setState("answering");
  };

  if (loading) {
    return (
      <div className="py-6 animate-pulse">
        <div className="h-4 bg-sunken rounded w-40 mb-6" />
        <div className="h-7 bg-sunken rounded w-2/3 mb-4" />
        <div className="h-[2px] bg-sunken rounded w-full mb-6" />
        <div className="h-6 bg-sunken rounded w-1/2 mb-4" />
        <div className="h-12 bg-sunken rounded-lg mb-3" />
        <div className="h-12 bg-sunken rounded-lg mb-3" />
        <div className="h-12 bg-sunken rounded-lg mb-3" />
        <div className="h-12 bg-sunken rounded-lg" />
      </div>
    );
  }

  if (!task || !task.questions?.length) {
    return (
      <div className="py-6">
        <p className="font-body text-muted">Quiz not found.</p>
      </div>
    );
  }

  return (
    <div className="py-6 pb-28">
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
        <span className="text-muted truncate">Quiz</span>
      </nav>

      {/* Title */}
      <h1 className="text-2xl font-display font-semibold text-ink mb-6">{task.title}</h1>

      {state === "results" && submitResult ? (
        <Card>
          <QuizResults
            score={submitResult.score}
            total={submitResult.total}
            passed={submitResult.passed}
            attemptNumber={submitResult.attempt_number}
            answers={task.questions.map((q, i) => {
              const ans = answers[i];
              return {
                question: q.question,
                user_answer: ans?.user_answer ?? "",
                is_correct: ans?.is_correct ?? false,
                correct_answer: q.correct_answer,
                explanation: q.explanation,
              };
            })}
            onRetake={handleRetake}
            phaseId={task.phase.id}
          />
        </Card>
      ) : currentQuestion ? (
        <Card>
          <QuestionCard
            questionNumber={currentIndex + 1}
            totalQuestions={task.questions.length}
            question={currentQuestion.question}
          >
            <AnswerOptions
              question={currentQuestion}
              selectedAnswer={currentAnswer}
              submitted={state === "reviewing"}
              onSelect={handleSelect}
            />
          </QuestionCard>

          <div className="mt-6 flex justify-end">
            {state === "answering" ? (
              <Button
                onClick={handleSubmitAnswer}
                disabled={currentAnswer === null || currentAnswer === ""}
              >
                Submit Answer
              </Button>
            ) : (
              <Button onClick={handleNext} loading={submitting}>
                {isLastQuestion ? "See Results" : "Next Question"}
              </Button>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
