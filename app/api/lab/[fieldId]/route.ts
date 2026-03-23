import { NextResponse } from "next/server";
import { execute, get } from "@/lib/db";
import { analyzeUserState } from "@/lib/analyzer";
import { trackEvent } from "@/lib/observer";
import { getLabProofSnapshot } from "@/lib/proof";
import { getProofArtifactDraft } from "@/lib/artifacts";

export async function POST(req: Request, { params }: { params: Promise<{ fieldId: string }> }) {
  const { fieldId } = await params;
  const body = await req.json();

  await execute(
    `INSERT INTO lab_results (field_id, value, terminal_output, notes, recorded_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(field_id) DO UPDATE SET value = ?, terminal_output = ?, notes = ?, recorded_at = datetime('now')`,
    [fieldId, body.value, body.terminal_output || null, body.notes || null,
     body.value, body.terminal_output || null, body.notes || null]
  );

  // Check if this field maps to a resume placeholder
  const field = await get("SELECT * FROM lab_fields WHERE id = ?", [fieldId]);
  if (field?.resume_placeholder) {
    await execute(
      "UPDATE resume_bullets SET filled_value = ?, status = 'filled' WHERE linked_field_id = ?",
      [body.value, fieldId]
    );
  }

  // Track lab result event
  const taskInfo = await get(
    "SELECT lf.task_id, t.phase_id, t.title FROM lab_fields lf JOIN tasks t ON lf.task_id = t.id WHERE lf.id = ?",
    [fieldId]
  );
  await trackEvent("lab_result", {
    taskId: taskInfo?.task_id as number | undefined,
    phaseId: taskInfo?.phase_id as number | undefined,
    payload: { field_id: Number(fieldId), value: body.value },
  });

  try {
    await analyzeUserState();
  } catch {
    /* non-critical */
  }

  const result = await get("SELECT * FROM lab_results WHERE field_id = ?", [fieldId]);
  const proof = taskInfo?.task_id
    ? await getLabProofSnapshot(
        taskInfo.task_id as number,
        (taskInfo.title as string | null) ?? null
      )
    : null;
  const artifactDraft = await getProofArtifactDraft(Number(fieldId));

  return NextResponse.json({
    result,
    capture: {
      fieldId: Number(fieldId),
      label: field?.field_name as string,
      value: body.value as string,
      unit: (field?.field_unit as string | null) ?? null,
      proofLabel: (field?.resume_placeholder as string | null) ?? null,
    },
    proof,
    artifactDraft,
  });
}
