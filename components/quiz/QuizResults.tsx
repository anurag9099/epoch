"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface AnswerDetail {
  question: string;
  user_answer: string;
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
}

interface QuizResultsProps {
  score: number;
  total: number;
  passed: boolean;
  attemptNumber: number;
  answers: AnswerDetail[];
  onRetake: () => void;
  phaseId: number;
}

export function QuizResults({
  score,
  total,
  passed,
  attemptNumber,
  answers,
  onRetake,
  phaseId,
}: QuizResultsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (i: number) => {
    setExpandedIndex(expandedIndex === i ? null : i);
  };

  return (
    <div className="space-y-6">
      {/* Score display */}
      <div className="text-center space-y-3">
        <p
          className={`text-4xl font-display font-semibold ${
            passed ? "text-teal" : "text-rust"
          }`}
        >
          {score}/{total}
        </p>
        {passed ? (
          <Badge variant="teal">Passed!</Badge>
        ) : (
          <Badge variant="muted">Not yet -- 70% needed</Badge>
        )}
        <p className="font-body text-hint text-sm">Attempt #{attemptNumber}</p>
      </div>

      {/* Divider */}
      <div className="border-t border-border-warm" />

      {/* Per-question review */}
      <div className="space-y-2">
        {answers.map((a, i) => (
          <div
            key={i}
            className="border border-border-warm rounded-lg overflow-hidden"
          >
            <button
              type="button"
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-sunken transition-colors duration-150 cursor-pointer"
              onClick={() => toggleExpand(i)}
            >
              {a.is_correct ? (
                <CheckCircle2 className="h-5 w-5 text-teal shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-rust shrink-0" />
              )}
              <span className="text-sm font-body text-ink flex-1 truncate">
                {a.question}
              </span>
              <span className="text-xs font-body text-hint shrink-0 mr-2">
                {a.user_answer}
              </span>
              {expandedIndex === i ? (
                <ChevronUp className="h-4 w-4 text-hint shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-hint shrink-0" />
              )}
            </button>
            {expandedIndex === i && (
              <div className="px-4 pb-4 space-y-2 border-t border-border-warm pt-3">
                {!a.is_correct && (
                  <p className="text-sm font-body text-muted">
                    <span className="text-hint">Correct answer:</span>{" "}
                    {a.correct_answer}
                  </p>
                )}
                {a.explanation && (
                  <p className="text-sm font-body text-muted leading-relaxed">
                    {a.explanation}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex justify-center pt-2">
        {passed ? (
          <Button href={`/phases/${phaseId}`}>Back to Phase</Button>
        ) : (
          <Button onClick={onRetake}>Retake Quiz</Button>
        )}
      </div>
    </div>
  );
}
