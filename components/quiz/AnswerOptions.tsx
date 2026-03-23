"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface Question {
  id: number;
  question: string;
  type: "mcq" | "freetext";
  options_json: string;
  correct_answer: string;
  explanation: string;
  order_num: number;
}

interface AnswerOptionsProps {
  question: Question;
  selectedAnswer: string | null;
  submitted: boolean;
  onSelect: (answer: string) => void;
}

const letters = ["A", "B", "C", "D"];

export function AnswerOptions({
  question,
  selectedAnswer,
  submitted,
  onSelect,
}: AnswerOptionsProps) {
  const [freetextSelfGrade, setFreetextSelfGrade] = useState<boolean | null>(null);

  if (question.type === "mcq") {
    const options: string[] = JSON.parse(question.options_json);

    return (
      <div className="space-y-3">
        {options.map((option, i) => {
          const letter = letters[i];
          const isSelected = selectedAnswer === letter;
          const isCorrect = letter === question.correct_answer;

          let containerClass =
            "flex items-center gap-3 rounded-lg border p-4 transition-all duration-150";

          if (!submitted) {
            if (isSelected) {
              containerClass += " bg-teal-dim border-teal";
            } else {
              containerClass += " bg-surface border-border-warm cursor-pointer hover:border-border-hover";
            }
          } else {
            if (isCorrect) {
              containerClass += " bg-teal-dim border-teal";
            } else if (isSelected && !isCorrect) {
              containerClass += " bg-rust-dim border-rust";
            } else {
              containerClass += " bg-surface border-border-warm opacity-60";
            }
          }

          return (
            <button
              key={letter}
              type="button"
              className={`w-full text-left ${containerClass}`}
              onClick={() => {
                if (!submitted) onSelect(letter);
              }}
              disabled={submitted}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-body font-medium ${
                  isSelected && !submitted
                    ? "bg-teal text-white"
                    : submitted && isCorrect
                      ? "bg-teal text-white"
                      : submitted && isSelected && !isCorrect
                        ? "bg-rust text-white"
                        : "bg-sunken text-muted"
                }`}
              >
                {letter}
              </span>
              <span className="text-sm font-body text-ink flex-1">{option}</span>
              {submitted && isCorrect && (
                <CheckCircle2 className="h-5 w-5 text-teal shrink-0" />
              )}
              {submitted && isSelected && !isCorrect && (
                <XCircle className="h-5 w-5 text-rust shrink-0" />
              )}
            </button>
          );
        })}

        {submitted && question.explanation && (
          <Card className="bg-teal-dim border-teal mt-4">
            <p className="text-xs font-body font-semibold uppercase tracking-widest text-teal mb-2">
              Explanation
            </p>
            <p className="text-sm font-body text-muted leading-relaxed">
              {question.explanation}
            </p>
          </Card>
        )}
      </div>
    );
  }

  // Freetext type
  return (
    <div className="space-y-4">
      {!submitted ? (
        <textarea
          className="w-full bg-sunken border border-border-warm rounded-lg p-4 min-h-[100px] text-base sm:text-sm font-body text-ink placeholder:text-hint focus:outline-none focus:border-teal transition-colors duration-150"
          placeholder="Type your answer here..."
          value={selectedAnswer ?? ""}
          onChange={(e) => onSelect(e.target.value)}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card>
              <p className="text-xs font-body font-semibold uppercase tracking-widest text-hint mb-2">
                Your Answer
              </p>
              <p className="text-sm font-body text-ink">{selectedAnswer}</p>
            </Card>
            <Card>
              <p className="text-xs font-body font-semibold uppercase tracking-widest text-hint mb-2">
                Model Answer
              </p>
              <p className="text-sm font-body text-ink">{question.correct_answer}</p>
            </Card>
          </div>

          {freetextSelfGrade === null && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex-1 rounded-lg border border-teal bg-teal-dim px-4 py-3 text-sm font-body font-medium text-teal transition-colors hover:bg-teal/20 cursor-pointer"
                onClick={() => {
                  setFreetextSelfGrade(true);
                  onSelect("__self_grade_correct");
                }}
              >
                I got this right
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-border-warm bg-surface px-4 py-3 text-sm font-body font-medium text-hint transition-colors hover:bg-sunken cursor-pointer"
                onClick={() => {
                  setFreetextSelfGrade(false);
                  onSelect("__self_grade_incorrect");
                }}
              >
                I need to review
              </button>
            </div>
          )}

          {freetextSelfGrade !== null && (
            <p className="text-sm font-body text-hint">
              {freetextSelfGrade
                ? "Marked as correct."
                : "Marked for review."}
            </p>
          )}
        </>
      )}

      {submitted && question.explanation && (
        <Card className="bg-teal-dim border-teal">
          <p className="text-xs font-body font-semibold uppercase tracking-widest text-teal mb-2">
            Explanation
          </p>
          <p className="text-sm font-body text-muted leading-relaxed">
            {question.explanation}
          </p>
        </Card>
      )}
    </div>
  );
}
