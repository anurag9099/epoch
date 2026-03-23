import { execRaw, execute, get, query } from "./db";

export type ProofArtifactStatus = "draft" | "ready" | "exported";

export interface ProofArtifact {
  id: number;
  taskId: number;
  taskTitle: string;
  fieldId: number | null;
  fieldName: string | null;
  fieldUnit: string | null;
  title: string;
  artifactType: string;
  proofStatement: string;
  explanation: string | null;
  evidenceSummary: string | null;
  metricLabel: string | null;
  metricValue: string | null;
  metricUnit: string | null;
  repoUrl: string | null;
  artifactUrl: string | null;
  status: ProofArtifactStatus;
  updatedAt: string;
  createdAt: string;
}

export interface ProofSignal {
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
  artifactStatus: ProofArtifactStatus | null;
  artifactTitle: string | null;
}

export interface ProofSummary {
  readyCount: number;
  draftCount: number;
  totalCount: number;
  capturedSignals: number;
  totalSignals: number;
  headline: string | null;
}

export interface ArtifactExportBundle {
  filenameBase: string;
  text: string;
  markdown: string;
  data: Record<string, unknown>;
}

const PROOF_ARTIFACT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS proof_artifacts (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  field_id INTEGER UNIQUE REFERENCES lab_fields(id),
  title TEXT NOT NULL,
  artifact_type TEXT DEFAULT 'metric' CHECK(artifact_type IN ('metric','project','evaluation','writeup')),
  proof_statement TEXT NOT NULL,
  explanation TEXT,
  evidence_summary TEXT,
  metric_label TEXT,
  metric_value TEXT,
  metric_unit TEXT,
  repo_url TEXT,
  artifact_url TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','ready','exported')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_artifacts_task ON proof_artifacts(task_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_status ON proof_artifacts(status);
`;

let proofArtifactsSchemaReady = false;

export async function ensureProofArtifactsSchema() {
  if (proofArtifactsSchemaReady) return;
  await execRaw(PROOF_ARTIFACT_SCHEMA_SQL);
  proofArtifactsSchemaReady = true;
}

interface ArtifactDraftSource {
  task_id: number;
  task_title: string;
  task_description: string | null;
  field_id: number;
  field_name: string;
  field_unit: string | null;
  resume_placeholder: string | null;
  value: string | null;
  bullet_text: string | null;
  placeholder: string | null;
}

interface SaveProofArtifactInput {
  fieldId: number;
  title: string;
  proofStatement: string;
  explanation?: string | null;
  evidenceSummary?: string | null;
  repoUrl?: string | null;
  artifactUrl?: string | null;
  status: ProofArtifactStatus;
}

function mapArtifact(row: Record<string, unknown>): ProofArtifact {
  return {
    id: row.id as number,
    taskId: row.task_id as number,
    taskTitle: row.task_title as string,
    fieldId: (row.field_id as number | null) ?? null,
    fieldName: (row.field_name as string | null) ?? null,
    fieldUnit: (row.field_unit as string | null) ?? null,
    title: row.title as string,
    artifactType: row.artifact_type as string,
    proofStatement: row.proof_statement as string,
    explanation: (row.explanation as string | null) ?? null,
    evidenceSummary: (row.evidence_summary as string | null) ?? null,
    metricLabel: (row.metric_label as string | null) ?? null,
    metricValue: (row.metric_value as string | null) ?? null,
    metricUnit: (row.metric_unit as string | null) ?? null,
    repoUrl: (row.repo_url as string | null) ?? null,
    artifactUrl: (row.artifact_url as string | null) ?? null,
    status: row.status as ProofArtifactStatus,
    updatedAt: row.updated_at as string,
    createdAt: row.created_at as string,
  };
}

function buildMetricValue(value: string, unit: string | null): string {
  return unit ? `${value} ${unit}` : value;
}

function replacePlaceholder(
  bulletText: string | null,
  placeholder: string | null,
  replacement: string
): string | null {
  if (!bulletText || !placeholder) return null;
  return bulletText.includes(placeholder)
    ? bulletText.replace(placeholder, replacement)
    : null;
}

async function getArtifactDraftSource(fieldId: number): Promise<ArtifactDraftSource | null> {
  const row = await get(
    `SELECT lf.id as field_id,
            lf.field_name,
            lf.field_unit,
            lf.resume_placeholder,
            lf.task_id,
            lr.value,
            t.title as task_title,
            t.description as task_description,
            rb.bullet_text,
            rb.placeholder
     FROM lab_fields lf
     JOIN tasks t ON lf.task_id = t.id
     LEFT JOIN lab_results lr ON lr.field_id = lf.id
     LEFT JOIN resume_bullets rb ON rb.linked_field_id = lf.id
     WHERE lf.id = ?`,
    [fieldId]
  );

  if (!row) return null;

  return {
    task_id: row.task_id as number,
    task_title: row.task_title as string,
    task_description: (row.task_description as string | null) ?? null,
    field_id: row.field_id as number,
    field_name: row.field_name as string,
    field_unit: (row.field_unit as string | null) ?? null,
    resume_placeholder: (row.resume_placeholder as string | null) ?? null,
    value: (row.value as string | null) ?? null,
    bullet_text: (row.bullet_text as string | null) ?? null,
    placeholder: (row.placeholder as string | null) ?? null,
  };
}

export async function listProofArtifacts(taskId?: number): Promise<ProofArtifact[]> {
  await ensureProofArtifactsSchema();
  const rows = await query(
    `SELECT pa.*,
            t.title as task_title,
            lf.field_name,
            lf.field_unit
     FROM proof_artifacts pa
     JOIN tasks t ON pa.task_id = t.id
     LEFT JOIN lab_fields lf ON pa.field_id = lf.id
     ${typeof taskId === "number" ? "WHERE pa.task_id = ?" : ""}
     ORDER BY CASE pa.status WHEN 'ready' THEN 0 WHEN 'exported' THEN 0 ELSE 1 END,
              pa.updated_at DESC,
              pa.id DESC`,
    typeof taskId === "number" ? [taskId] : []
  );

  return rows.map((row) => mapArtifact(row));
}

export async function getProofArtifact(fieldId: number): Promise<ProofArtifact | null> {
  await ensureProofArtifactsSchema();
  const row = await get(
    `SELECT pa.*,
            t.title as task_title,
            lf.field_name,
            lf.field_unit
     FROM proof_artifacts pa
     JOIN tasks t ON pa.task_id = t.id
     LEFT JOIN lab_fields lf ON pa.field_id = lf.id
     WHERE pa.field_id = ?`,
    [fieldId]
  );

  return row ? mapArtifact(row) : null;
}

export async function getProofArtifactById(id: number): Promise<ProofArtifact | null> {
  await ensureProofArtifactsSchema();
  const row = await get(
    `SELECT pa.*,
            t.title as task_title,
            lf.field_name,
            lf.field_unit
     FROM proof_artifacts pa
     JOIN tasks t ON pa.task_id = t.id
     LEFT JOIN lab_fields lf ON pa.field_id = lf.id
     WHERE pa.id = ?`,
    [id]
  );

  return row ? mapArtifact(row) : null;
}

export async function getProofArtifactDraft(fieldId: number): Promise<ProofArtifact | null> {
  await ensureProofArtifactsSchema();
  const source = await getArtifactDraftSource(fieldId);
  if (!source?.value || source.value.trim().length === 0) return null;

  const existing = await getProofArtifact(fieldId);
  if (existing) {
    return {
      ...existing,
      metricLabel: source.field_name,
      metricValue: source.value,
      metricUnit: source.field_unit,
      fieldName: source.field_name,
      fieldUnit: source.field_unit,
    };
  }

  const metricValue = buildMetricValue(source.value, source.field_unit);
  const statement =
    replacePlaceholder(source.bullet_text, source.placeholder, metricValue) ??
    `Measured ${source.field_name.toLowerCase()} at ${metricValue} while working through ${source.task_title}.`;

  return {
    id: 0,
    taskId: source.task_id,
    taskTitle: source.task_title,
    fieldId: source.field_id,
    fieldName: source.field_name,
    fieldUnit: source.field_unit,
    title: `${source.task_title} — ${source.field_name}`,
    artifactType: "metric",
    proofStatement: statement,
    explanation:
      source.task_description ??
      `This metric was captured during ${source.task_title} and can be used to explain the implementation tradeoffs behind the result.`,
    evidenceSummary: `Captured ${source.field_name.toLowerCase()} at ${metricValue}.`,
    metricLabel: source.field_name,
    metricValue: source.value,
    metricUnit: source.field_unit,
    repoUrl: null,
    artifactUrl: null,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function saveProofArtifact(input: SaveProofArtifactInput): Promise<ProofArtifact | null> {
  await ensureProofArtifactsSchema();
  const source = await getArtifactDraftSource(input.fieldId);
  if (!source?.value || source.value.trim().length === 0) {
    return null;
  }

  await execute(
    `INSERT INTO proof_artifacts (
       task_id, field_id, title, artifact_type, proof_statement, explanation,
       evidence_summary, metric_label, metric_value, metric_unit, repo_url, artifact_url, status, updated_at
     ) VALUES (?, ?, ?, 'metric', ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(field_id) DO UPDATE SET
       task_id = excluded.task_id,
       title = excluded.title,
       proof_statement = excluded.proof_statement,
       explanation = excluded.explanation,
       evidence_summary = excluded.evidence_summary,
       metric_label = excluded.metric_label,
       metric_value = excluded.metric_value,
       metric_unit = excluded.metric_unit,
       repo_url = excluded.repo_url,
       artifact_url = excluded.artifact_url,
       status = excluded.status,
       updated_at = datetime('now')`,
    [
      source.task_id,
      input.fieldId,
      input.title,
      input.proofStatement,
      input.explanation ?? null,
      input.evidenceSummary ?? null,
      source.field_name,
      source.value,
      source.field_unit,
      input.repoUrl ?? null,
      input.artifactUrl ?? null,
      input.status,
    ]
  );

  return getProofArtifact(input.fieldId);
}

export async function getProofSignals(): Promise<ProofSignal[]> {
  await ensureProofArtifactsSchema();
  const rows = await query(
    `SELECT rb.id,
            rb.bullet_text,
            rb.placeholder,
            rb.linked_field_id,
            rb.filled_value,
            rb.status,
            lf.field_name,
            lf.field_unit,
            lf.task_id,
            lr.value as current_value,
            pa.status as artifact_status,
            pa.title as artifact_title
     FROM resume_bullets rb
     LEFT JOIN lab_fields lf ON rb.linked_field_id = lf.id
     LEFT JOIN lab_results lr ON lf.id = lr.field_id
     LEFT JOIN proof_artifacts pa ON pa.field_id = lf.id
     ORDER BY rb.id ASC`
  );

  return rows.map((row) => ({
    id: row.id as number,
    bulletText: row.bullet_text as string,
    placeholder: row.placeholder as string,
    linkedFieldId: (row.linked_field_id as number | null) ?? null,
    filledValue: (row.filled_value as string | null) ?? null,
    status: row.status as string,
    fieldName: (row.field_name as string | null) ?? null,
    fieldUnit: (row.field_unit as string | null) ?? null,
    taskId: (row.task_id as number | null) ?? null,
    currentValue: (row.current_value as string | null) ?? null,
    artifactStatus: (row.artifact_status as ProofArtifactStatus | null) ?? null,
    artifactTitle: (row.artifact_title as string | null) ?? null,
  }));
}

export async function getProofSummary(): Promise<ProofSummary> {
  await ensureProofArtifactsSchema();
  const [artifactCounts, signalCounts, latestArtifact, latestSignal] = await Promise.all([
    get(
      `SELECT
         COALESCE(SUM(CASE WHEN status IN ('ready', 'exported') THEN 1 ELSE 0 END), 0) as ready_count,
         COALESCE(SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END), 0) as draft_count,
         COUNT(*) as total_count
       FROM proof_artifacts`
    ),
    get(
      `SELECT
         COUNT(*) as total_signals,
         COALESCE(SUM(CASE WHEN lr.value IS NOT NULL AND trim(lr.value) != '' THEN 1 ELSE 0 END), 0) as captured_signals
       FROM lab_fields lf
       LEFT JOIN lab_results lr ON lr.field_id = lf.id`
    ),
    get(
      `SELECT pa.title, pa.proof_statement
       FROM proof_artifacts pa
       ORDER BY CASE pa.status WHEN 'ready' THEN 0 WHEN 'exported' THEN 0 ELSE 1 END,
                pa.updated_at DESC,
                pa.id DESC
       LIMIT 1`
    ),
    get(
      `SELECT lf.field_name, lr.value
       FROM lab_results lr
       JOIN lab_fields lf ON lr.field_id = lf.id
       WHERE lr.value IS NOT NULL AND trim(lr.value) != ''
       ORDER BY lr.recorded_at DESC
       LIMIT 1`
    ),
  ]);

  const readyCount = (artifactCounts?.ready_count as number | null) ?? 0;
  const draftCount = (artifactCounts?.draft_count as number | null) ?? 0;
  const totalCount = (artifactCounts?.total_count as number | null) ?? 0;
  const latestSignalLabel = (latestSignal?.field_name as string | null) ?? null;
  const latestSignalValue = (latestSignal?.value as string | null) ?? null;

  return {
    readyCount,
    draftCount,
    totalCount,
    capturedSignals: (signalCounts?.captured_signals as number | null) ?? 0,
    totalSignals: (signalCounts?.total_signals as number | null) ?? 0,
    headline:
      (latestArtifact?.title as string | null) ??
      (latestArtifact?.proof_statement as string | null) ??
      (latestSignalLabel && latestSignalValue
        ? `${latestSignalLabel}: ${latestSignalValue}`
        : null),
  };
}

function safeFilename(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "proof-artifact";
}

export function buildArtifactExportBundle(artifact: ProofArtifact): ArtifactExportBundle {
  const metricLine = artifact.metricLabel && artifact.metricValue
    ? `${artifact.metricLabel}: ${artifact.metricValue}${artifact.metricUnit ? ` ${artifact.metricUnit}` : ""}`
    : null;

  const textParts = [
    artifact.title,
    artifact.proofStatement,
    artifact.explanation,
    metricLine,
    artifact.evidenceSummary,
    artifact.repoUrl ? `Repo: ${artifact.repoUrl}` : null,
    artifact.artifactUrl ? `Artifact: ${artifact.artifactUrl}` : null,
    `Task: ${artifact.taskTitle}`,
    `Status: ${artifact.status}`,
  ].filter(Boolean);

  const markdownParts = [
    `# ${artifact.title}`,
    "",
    artifact.proofStatement,
    artifact.explanation ? `\n## Why It Matters\n\n${artifact.explanation}` : null,
    metricLine ? `\n## Evidence\n\n- ${metricLine}` : null,
    artifact.evidenceSummary ? `- Summary: ${artifact.evidenceSummary}` : null,
    artifact.repoUrl ? `- Repo: ${artifact.repoUrl}` : null,
    artifact.artifactUrl ? `- Artifact: ${artifact.artifactUrl}` : null,
    `- Task: ${artifact.taskTitle}`,
    `- Status: ${artifact.status}`,
  ].filter(Boolean);

  return {
    filenameBase: safeFilename(artifact.title),
    text: textParts.join("\n\n"),
    markdown: markdownParts.join("\n"),
    data: {
      id: artifact.id,
      title: artifact.title,
      proofStatement: artifact.proofStatement,
      explanation: artifact.explanation,
      evidenceSummary: artifact.evidenceSummary,
      metric: artifact.metricLabel
        ? {
            label: artifact.metricLabel,
            value: artifact.metricValue,
            unit: artifact.metricUnit,
          }
        : null,
      repoUrl: artifact.repoUrl,
      artifactUrl: artifact.artifactUrl,
      task: {
        id: artifact.taskId,
        title: artifact.taskTitle,
      },
      status: artifact.status,
      updatedAt: artifact.updatedAt,
    },
  };
}
