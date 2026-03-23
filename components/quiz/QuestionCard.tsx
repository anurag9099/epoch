"use client";

import { ProgressBar } from "@/components/ui/ProgressBar";

interface QuestionCardProps {
  questionNumber: number;
  totalQuestions: number;
  question: string;
  children: React.ReactNode;
}

export function QuestionCard({
  questionNumber,
  totalQuestions,
  question,
  children,
}: QuestionCardProps) {
  const progress = (questionNumber / totalQuestions) * 100;

  return (
    <div>
      <ProgressBar value={progress} className="mb-4" />
      <p className="text-xs font-body text-hint uppercase tracking-widest">
        Question {questionNumber} of {totalQuestions}
      </p>
      <p className="text-lg font-display font-semibold mt-4 text-ink">{question}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}
