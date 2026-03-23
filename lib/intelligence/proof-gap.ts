import { query } from "../db";
import { ensureProofArtifactsSchema } from "../artifacts";
import { confidenceFromScore } from "./common";
import type { LearningSignal } from "./types";

export async function buildProofGapSignals(): Promise<LearningSignal[]> {
  await ensureProofArtifactsSchema();
  const rows = await query(
    `SELECT t.id as task_id,
            t.title as task_title,
            COUNT(lf.id) as total_fields,
            SUM(CASE WHEN lr.value IS NOT NULL AND trim(lr.value) != '' THEN 1 ELSE 0 END) as captured_fields,
            SUM(CASE WHEN pa.status IN ('ready', 'exported') THEN 1 ELSE 0 END) as ready_artifacts
     FROM tasks t
     JOIN lab_fields lf ON lf.task_id = t.id
     LEFT JOIN lab_results lr ON lr.field_id = lf.id
     LEFT JOIN proof_artifacts pa ON pa.field_id = lf.id
     WHERE t.type = 'lab'
     GROUP BY t.id, t.title
     HAVING captured_fields > 0 AND ready_artifacts = 0
     ORDER BY captured_fields DESC, t.id DESC
     LIMIT 4`
  );

  return rows.map((row) => {
    const captured = (row.captured_fields as number) ?? 0;
    const total = Math.max(1, (row.total_fields as number) ?? 1);
    return {
      signal_type: "proof_gap",
      topic: `task_${row.task_id as number}`,
      confidence: confidenceFromScore(0.45 + captured / total / 2),
      evidence: `"${row.task_title}" has ${captured}/${total} captured signals but no finalized proof artifact.`,
    };
  });
}
