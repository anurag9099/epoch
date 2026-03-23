"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ProofArtifactStatus } from "@/lib/artifacts";

export interface FinalizeProofDraft {
  fieldId: number;
  title: string;
  proofStatement: string;
  explanation: string | null;
  evidenceSummary: string | null;
  repoUrl: string | null;
  artifactUrl: string | null;
  status: ProofArtifactStatus;
  metricLabel: string | null;
  metricValue: string | null;
  metricUnit: string | null;
}

interface FinalizeProofModalProps {
  isOpen: boolean;
  draft: FinalizeProofDraft | null;
  onClose: () => void;
  onSave: (payload: {
    fieldId: number;
    title: string;
    proofStatement: string;
    explanation: string;
    evidenceSummary: string;
    repoUrl: string;
    artifactUrl: string;
    status: ProofArtifactStatus;
  }) => Promise<void>;
}

export function FinalizeProofModal({
  isOpen,
  draft,
  onClose,
  onSave,
}: FinalizeProofModalProps) {
  const [title, setTitle] = useState("");
  const [proofStatement, setProofStatement] = useState("");
  const [explanation, setExplanation] = useState("");
  const [evidenceSummary, setEvidenceSummary] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [artifactUrl, setArtifactUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [handleKeyDown, isOpen]);

  useEffect(() => {
    if (!draft) return;
    setTitle(draft.title);
    setProofStatement(draft.proofStatement);
    setExplanation(draft.explanation ?? "");
    setEvidenceSummary(draft.evidenceSummary ?? "");
    setRepoUrl(draft.repoUrl ?? "");
    setArtifactUrl(draft.artifactUrl ?? "");
  }, [draft]);

  if (!isOpen || !draft) return null;

  const metricValue = draft.metricValue
    ? `${draft.metricValue}${draft.metricUnit ? ` ${draft.metricUnit}` : ""}`
    : null;

  const submit = async (status: ProofArtifactStatus) => {
    if (!title.trim() || !proofStatement.trim()) return;
    setSaving(true);
    try {
      await onSave({
        fieldId: draft.fieldId,
        title: title.trim(),
        proofStatement: proofStatement.trim(),
        explanation: explanation.trim(),
        evidenceSummary: evidenceSummary.trim(),
        repoUrl: repoUrl.trim(),
        artifactUrl: artifactUrl.trim(),
        status,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center bg-ink/30 motion-safe:animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-[92vw] max-w-2xl rounded-lg border border-border-warm bg-surface p-6 motion-safe:animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-hint transition-colors hover:text-muted"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.16em] text-hint">
            Finalize proof
          </div>
          <h2 className="text-lg font-display font-semibold text-ink">
            Turn this metric into visible capability
          </h2>
          {metricValue && (
            <div className="inline-flex rounded-full bg-teal-dim px-3 py-1 text-[11px] font-medium text-teal">
              {draft.metricLabel ?? "Metric"}: {metricValue}
            </div>
          )}
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Artifact title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 w-full rounded-md border border-border-warm bg-sunken px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal"
              placeholder="e.g. GPT-2 training baseline"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Proof statement
            </label>
            <textarea
              rows={3}
              value={proofStatement}
              onChange={(e) => setProofStatement(e.target.value)}
              className="w-full rounded-md border border-border-warm bg-sunken px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal"
              placeholder="Write the interview-ready claim you can defend."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Why it matters
            </label>
            <textarea
              rows={3}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full rounded-md border border-border-warm bg-sunken px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal"
              placeholder="Explain what this metric demonstrates and what tradeoff or capability it reflects."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Evidence summary
            </label>
            <textarea
              rows={2}
              value={evidenceSummary}
              onChange={(e) => setEvidenceSummary(e.target.value)}
              className="w-full rounded-md border border-border-warm bg-sunken px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal"
              placeholder="Short factual summary of what you measured or built."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Repo link
              </label>
              <input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="h-11 w-full rounded-md border border-border-warm bg-sunken px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal"
                placeholder="https://github.com/..."
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Artifact link
              </label>
              <input
                value={artifactUrl}
                onChange={(e) => setArtifactUrl(e.target.value)}
                className="h-11 w-full rounded-md border border-border-warm bg-sunken px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal"
                placeholder="Demo, gist, note, report..."
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => submit("draft")} disabled={saving}>
            Save draft
          </Button>
          <Button onClick={() => submit("ready")} disabled={saving || !title.trim() || !proofStatement.trim()}>
            Mark ready
          </Button>
        </div>
      </div>
    </div>
  );
}
