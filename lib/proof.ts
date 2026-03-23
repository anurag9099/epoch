import { get, query } from "./db";
import { missionRouteForTask } from "./path";

interface TaskRef {
  id: number;
  title: string;
  type: string;
  scheduled_day?: number | null;
  phase_id?: number | null;
}

export interface MissionProofSignal {
  id: number;
  label: string;
  unit: string | null;
  status: "captured" | "pending";
  value: string | null;
  proofLabel: string | null;
}

export interface MissionProof {
  title: string;
  summary: string;
  statusLabel: string;
  ctaLabel: string;
  ctaHref: string;
  signals: MissionProofSignal[];
}

export interface LabProofSnapshot {
  taskId: number;
  taskTitle: string;
  capturedCount: number;
  totalCount: number;
  signals: MissionProofSignal[];
  latestSignal: MissionProofSignal | null;
}

export interface RecentProofCapture {
  taskId: number;
  taskTitle: string;
  fieldId: number;
  fieldName: string;
  fieldUnit: string | null;
  value: string;
  recordedAt: string;
  proofLabel: string | null;
  ctaHref: string;
}

function hasValue(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

async function loadEvidenceFields(taskId: number): Promise<MissionProofSignal[]> {
  const fields = await query(
    `SELECT lf.id, lf.field_name, lf.field_unit, lr.value, rb.placeholder, rb.filled_value
     FROM lab_fields lf
     LEFT JOIN lab_results lr ON lr.field_id = lf.id
     LEFT JOIN resume_bullets rb ON rb.linked_field_id = lf.id
     WHERE lf.task_id = ?
     ORDER BY lf.order_num ASC`,
    [taskId]
  );

  return fields.map((field) => ({
    id: field.id as number,
    label: field.field_name as string,
    unit: (field.field_unit as string | null) ?? null,
    status: hasValue((field.value as string | null) ?? null) ? "captured" : "pending",
    value: (field.value as string | null) ?? null,
    proofLabel: (field.placeholder as string | null) ?? null,
  }));
}

export async function getLabProofSnapshot(
  taskId: number,
  taskTitle?: string | null
): Promise<LabProofSnapshot> {
  const signals = await loadEvidenceFields(taskId);
  const capturedSignals = signals.filter((signal) => signal.status === "captured");

  if (!taskTitle) {
    const task = await get("SELECT title FROM tasks WHERE id = ?", [taskId]);
    taskTitle = (task?.title as string | null) ?? "Current lab";
  }

  return {
    taskId,
    taskTitle: taskTitle ?? "Current lab",
    capturedCount: capturedSignals.length,
    totalCount: signals.length,
    signals,
    latestSignal: capturedSignals.at(-1) ?? null,
  };
}

async function getNearestProofLab(task: TaskRef): Promise<TaskRef | null> {
  const inPhase = await get(
    `SELECT id, title, type, scheduled_day, phase_id
     FROM tasks
     WHERE type = 'lab'
       AND scheduled_day IS NOT NULL
       AND phase_id = ?
       AND scheduled_day >= ?
     ORDER BY scheduled_day ASC, order_num ASC
     LIMIT 1`,
    [task.phase_id ?? 0, task.scheduled_day ?? 0]
  );

  if (inPhase) {
    return {
      id: inPhase.id as number,
      title: inPhase.title as string,
      type: inPhase.type as string,
      scheduled_day: (inPhase.scheduled_day as number | null) ?? null,
      phase_id: (inPhase.phase_id as number | null) ?? null,
    };
  }

  const nextAny = await get(
    `SELECT id, title, type, scheduled_day, phase_id
     FROM tasks
     WHERE type = 'lab'
       AND scheduled_day IS NOT NULL
       AND scheduled_day >= ?
     ORDER BY scheduled_day ASC, order_num ASC
     LIMIT 1`,
    [task.scheduled_day ?? 0]
  );

  if (!nextAny) return null;

  return {
    id: nextAny.id as number,
    title: nextAny.title as string,
    type: nextAny.type as string,
    scheduled_day: (nextAny.scheduled_day as number | null) ?? null,
    phase_id: (nextAny.phase_id as number | null) ?? null,
  };
}

function summarizeSignals(signals: MissionProofSignal[]): string {
  if (signals.length === 0) return "No evidence fields are configured yet.";
  if (signals.length === 1) return signals[0].label;
  if (signals.length === 2) return `${signals[0].label} and ${signals[1].label}`;
  return `${signals[0].label}, ${signals[1].label}, and ${signals[2].label}`;
}

export async function getMissionProof(task: TaskRef | null): Promise<MissionProof | null> {
  if (!task) return null;

  if (task.type === "lab") {
    const snapshot = await getLabProofSnapshot(task.id, task.title);
    const nextPending =
      snapshot.signals.find((signal) => signal.status === "pending") ??
      snapshot.signals[0] ??
      null;
    const linkedProof = snapshot.signals.find((signal) => signal.proofLabel);

    return {
      title: "Active proof checkpoint",
      summary: nextPending
        ? linkedProof
          ? `This lab becomes visible capability when you capture ${nextPending.label.toLowerCase()} and fill the linked proof statement ${linkedProof.proofLabel}.`
          : `This lab becomes visible capability when you capture ${nextPending.label.toLowerCase()} and record the result before leaving the session.`
        : "Every configured evidence signal for this lab has been captured. Clean up the explanation and lock the proof in.",
      statusLabel: `${snapshot.capturedCount}/${snapshot.totalCount || 1} evidence signals captured`,
      ctaLabel: "Open proof view",
      ctaHref: "/resume",
      signals: snapshot.signals.slice(0, 3),
    };
  }

  const proofLab = await getNearestProofLab(task);
  if (proofLab) {
    const snapshot = await getLabProofSnapshot(proofLab.id, proofLab.title);
    const linkedProof = snapshot.signals.find((signal) => signal.proofLabel);
    const daysUntil =
      typeof proofLab.scheduled_day === "number" && typeof task.scheduled_day === "number"
        ? Math.max(0, proofLab.scheduled_day - task.scheduled_day)
        : null;

    return {
      title: "Upcoming proof checkpoint",
      summary: linkedProof
        ? `This mission feeds into ${proofLab.title}. The evidence from that lab will support ${linkedProof.proofLabel}.`
        : `This mission feeds into ${proofLab.title}. The artifact will be measured by ${summarizeSignals(snapshot.signals.slice(0, 3)).toLowerCase()}.`,
      statusLabel:
        daysUntil === null
          ? `Next lab: ${proofLab.title}`
          : daysUntil === 0
            ? "Proof lab is queued now"
            : `Proof lab in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
      ctaLabel: "Preview proof lab",
      ctaHref: missionRouteForTask(proofLab),
      signals: snapshot.signals.slice(0, 3),
    };
  }

  return {
    title: "Proof path not mapped",
    summary:
      "This mission does not yet connect to a configured evidence checkpoint. Leave a design note or implementation summary so the work remains legible.",
    statusLabel: "Fallback evidence",
    ctaLabel: "Open proof view",
    ctaHref: "/resume",
    signals: [],
  };
}

export async function getRecentProofCapture(): Promise<RecentProofCapture | null> {
  const capture = await get(
    `SELECT lr.recorded_at, lr.value, lf.id as field_id, lf.field_name, lf.field_unit,
            t.id as task_id, t.title as task_title, rb.placeholder
     FROM lab_results lr
     JOIN lab_fields lf ON lr.field_id = lf.id
     JOIN tasks t ON lf.task_id = t.id
     LEFT JOIN resume_bullets rb ON rb.linked_field_id = lf.id
     WHERE lr.value IS NOT NULL AND trim(lr.value) != ''
     ORDER BY lr.recorded_at DESC
     LIMIT 1`
  );

  if (!capture) return null;

  return {
    taskId: capture.task_id as number,
    taskTitle: capture.task_title as string,
    fieldId: capture.field_id as number,
    fieldName: capture.field_name as string,
    fieldUnit: (capture.field_unit as string | null) ?? null,
    value: capture.value as string,
    recordedAt: capture.recorded_at as string,
    proofLabel: (capture.placeholder as string | null) ?? null,
    ctaHref: `/lab/${capture.task_id as number}`,
  };
}
