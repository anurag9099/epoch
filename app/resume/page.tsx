"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ArtifactCard, type ProofArtifactCardData } from "@/components/proof/ArtifactCard";

interface ProofSignal {
  id: number;
  bulletText: string;
  placeholder: string;
  linkedFieldId: number | null;
  filledValue: string | null;
  status: string;
  fieldName: string | null;
  fieldUnit: string | null;
  taskId: number | null;
  currentValue: string | null;
  artifactStatus: "draft" | "ready" | "exported" | null;
  artifactTitle: string | null;
}

interface ProofLockerResponse {
  artifacts: ProofArtifactCardData[];
  signals: ProofSignal[];
  summary: {
    readyCount: number;
    draftCount: number;
    totalCount: number;
    capturedSignals: number;
    totalSignals: number;
    headline: string | null;
  };
}

export default function ResumePage() {
  const [data, setData] = useState<ProofLockerResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/resume");
        setData(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-48 rounded-lg bg-sunken" />
        <div className="h-[2px] rounded-full bg-sunken" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-sunken" />
          ))}
        </div>
      </div>
    );
  }

  const readyArtifacts = data.artifacts.filter(
    (artifact) => artifact.status === "ready" || artifact.status === "exported"
  );
  const draftArtifacts = data.artifacts.filter((artifact) => artifact.status === "draft");
  const artifactPct =
    data.summary.totalCount > 0
      ? Math.round((data.summary.readyCount / data.summary.totalCount) * 100)
      : 0;

  return (
    <div className="space-y-6 pb-4">
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-hint">Proof Locker</div>
        <h1 className="text-lg font-display font-semibold text-ink">
          Capability Proof
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Raw measurements are not the product. This view turns captured lab evidence into claims you can defend in an interview, share with a hiring manager, or point to in a portfolio review.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-muted">
              {data.summary.readyCount} ready, {data.summary.draftCount} draft
            </div>
            <div className="mt-1 text-xs text-hint">
              {data.summary.capturedSignals}/{data.summary.totalSignals} evidence signals captured
            </div>
          </div>
          {data.summary.headline && (
            <div className="max-w-xl text-right text-xs text-hint">
              Latest proof: {data.summary.headline}
            </div>
          )}
        </div>
        <ProgressBar value={data.summary.totalCount > 0 ? artifactPct : 0} />
      </section>

      {readyArtifacts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-display font-semibold text-muted">
            Ready Artifacts
          </h2>
          <div className="space-y-3">
            {readyArtifacts.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} />
            ))}
          </div>
        </section>
      )}

      {draftArtifacts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-display font-semibold text-muted">
            Draft Artifacts
          </h2>
          <div className="space-y-3">
            {draftArtifacts.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-display font-semibold text-muted">
          Evidence Signals
        </h2>
        <div className="space-y-3">
          {data.signals.map((signal) => {
            const capturedValue = signal.filledValue ?? signal.currentValue;
            const hasArtifact = Boolean(signal.artifactStatus);

            return (
              <div
                key={signal.id}
                className="rounded-lg border border-border-warm bg-surface p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink">
                      {signal.fieldName ?? "Unmapped field"}
                    </div>
                    <div className="mt-1 text-xs leading-relaxed text-hint">
                      {signal.artifactTitle
                        ? `Artifact: ${signal.artifactTitle}`
                        : signal.placeholder}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-sm font-semibold"
                      style={{ color: capturedValue ? "var(--teal)" : "var(--text-hint)" }}
                    >
                      {capturedValue
                        ? `${capturedValue}${signal.fieldUnit ? ` ${signal.fieldUnit}` : ""}`
                        : "Not captured"}
                    </div>
                    {hasArtifact && (
                      <div className="mt-1 text-[11px] text-hint">
                        {signal.artifactStatus === "ready" || signal.artifactStatus === "exported"
                          ? "Artifact ready"
                          : "Artifact draft"}
                      </div>
                    )}
                  </div>
                </div>
                {signal.taskId && (
                  <div className="mt-3">
                    <Link href={`/lab/${signal.taskId}`} className="text-xs font-medium text-teal hover:underline">
                      Open lab
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {data.artifacts.length === 0 && (
        <div className="rounded-lg border border-dashed border-border-warm bg-surface p-6 text-sm text-muted">
          No artifacts yet. Capture a measurement in a lab, then use the finalize-proof flow to turn it into a reusable proof statement.
        </div>
      )}
    </div>
  );
}
