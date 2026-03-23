"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, FlaskConical } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

export interface ProofArtifactCardData {
  id: number;
  taskId: number;
  taskTitle: string;
  fieldName: string | null;
  fieldUnit: string | null;
  title: string;
  proofStatement: string;
  explanation: string | null;
  evidenceSummary: string | null;
  metricLabel: string | null;
  metricValue: string | null;
  metricUnit: string | null;
  repoUrl: string | null;
  artifactUrl: string | null;
  status: "draft" | "ready" | "exported";
  updatedAt: string;
}

function artifactStatusLabel(status: ProofArtifactCardData["status"]) {
  if (status === "exported") return "Exported";
  if (status === "ready") return "Ready";
  return "Draft";
}

export function ArtifactCard({ artifact }: { artifact: ProofArtifactCardData }) {
  const toast = useToast();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const metricValue = artifact.metricValue
    ? `${artifact.metricValue}${artifact.metricUnit ? ` ${artifact.metricUnit}` : ""}`
    : null;

  const fetchExport = async (format: "text" | "markdown" | "json") => {
    const res = await fetch(`/api/proof-artifacts/${artifact.id}/export?format=${format}`);
    if (!res.ok) throw new Error("Export failed");

    if (format === "json") {
      return {
        filename: `${artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "proof-artifact"}.json`,
        content: await res.text(),
        mime: "application/json",
      };
    }

    return {
      filename: `${artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "proof-artifact"}.${
        format === "markdown" ? "md" : "txt"
      }`,
      content: await res.text(),
      mime: format === "markdown" ? "text/markdown" : "text/plain",
    };
  };

  const copyExport = async (format: "text" | "markdown") => {
    try {
      setBusyAction(`copy-${format}`);
      const exported = await fetchExport(format);
      await navigator.clipboard.writeText(exported.content);
      toast.success(format === "markdown" ? "Markdown copied" : "Proof summary copied");
    } catch {
      toast.error("Unable to copy export");
    } finally {
      setBusyAction(null);
    }
  };

  const downloadExport = async (format: "markdown" | "json") => {
    try {
      setBusyAction(`download-${format}`);
      const exported = await fetchExport(format);
      const blob = new Blob([exported.content], { type: exported.mime });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = exported.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success(format === "json" ? "JSON export downloaded" : "Markdown export downloaded");
    } catch {
      toast.error("Unable to download export");
    } finally {
      setBusyAction(null);
    }
  };

  const shareArtifact = async () => {
    try {
      setBusyAction("share");
      const exported = await fetchExport("text");
      const shareUrl = artifact.artifactUrl ?? artifact.repoUrl ?? undefined;
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: artifact.title,
          text: exported.content,
          url: shareUrl,
        });
        toast.success("Artifact shared");
      } else {
        await navigator.clipboard.writeText(exported.content);
        toast.success("Share summary copied");
      }
    } catch {
      toast.error("Unable to share artifact");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.16em] text-hint">
            {artifact.fieldName ?? "Artifact"}
          </div>
          <h3 className="mt-1 text-base font-display font-semibold text-ink">
            {artifact.title}
          </h3>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-medium"
          style={{
            background:
              artifact.status === "ready" || artifact.status === "exported"
                ? "var(--teal-dim)"
                : "var(--gold-dim)",
            color:
              artifact.status === "ready" || artifact.status === "exported"
                ? "var(--teal)"
                : "var(--gold)",
          }}
        >
          {artifactStatusLabel(artifact.status)}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-muted">
        {artifact.proofStatement}
      </p>

      {artifact.explanation && (
        <p className="text-xs leading-relaxed text-hint">
          {artifact.explanation}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {metricValue && (
          <span className="rounded-full bg-page px-2.5 py-1 text-[11px] text-ink">
            {artifact.metricLabel ?? "Metric"}: {metricValue}
          </span>
        )}
        <span className="rounded-full bg-page px-2.5 py-1 text-[11px] text-hint">
          {artifact.taskTitle}
        </span>
      </div>

      <div className="flex flex-wrap gap-4 text-xs font-medium">
        <Link
          href={`/lab/${artifact.taskId}`}
          className="inline-flex items-center gap-1 text-teal hover:underline"
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Open lab
        </Link>
        {artifact.repoUrl && (
          <a
            href={artifact.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-teal hover:underline"
          >
            Repo
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
        {artifact.artifactUrl && (
          <a
            href={artifact.artifactUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-teal hover:underline"
          >
            Artifact link
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border-warm pt-3 text-[11px] font-medium">
        <button
          type="button"
          onClick={() => copyExport("text")}
          disabled={busyAction !== null}
          className="rounded-md bg-page px-3 py-1.5 text-teal transition-colors hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-50"
        >
          Copy summary
        </button>
        <button
          type="button"
          onClick={() => copyExport("markdown")}
          disabled={busyAction !== null}
          className="rounded-md bg-page px-3 py-1.5 text-teal transition-colors hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-50"
        >
          Copy markdown
        </button>
        <button
          type="button"
          onClick={() => downloadExport("json")}
          disabled={busyAction !== null}
          className="rounded-md bg-page px-3 py-1.5 text-teal transition-colors hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-50"
        >
          Download JSON
        </button>
        <button
          type="button"
          onClick={shareArtifact}
          disabled={busyAction !== null}
          className="rounded-md bg-page px-3 py-1.5 text-teal transition-colors hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-50"
        >
          Share
        </button>
      </div>
    </Card>
  );
}
