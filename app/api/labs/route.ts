import { NextResponse } from "next/server";
import { listCanonicalLabs } from "@/lib/labs";

export const dynamic = "force-dynamic";

export async function GET() {
  const labs = await listCanonicalLabs();

  const enriched = labs.map((lab) => {
    const phaseNum = lab.phase_id;
    let difficulty = "beginner";
    if (phaseNum >= 3 && phaseNum <= 5) difficulty = "intermediate";
    if (phaseNum >= 6) difficulty = "advanced";

    const phaseStatus = lab.phase_status;
    const isLocked = phaseStatus === "locked";

    const title = lab.title.toLowerCase();
    const requiresGPU =
      title.includes("train") ||
      title.includes("fine-tune") ||
      title.includes("fsdp") ||
      title.includes("ddp") ||
      title.includes("deepspeed") ||
      title.includes("distributed") ||
      title.includes("ppo") ||
      title.includes("dpo") ||
      title.includes("grpo");

    return {
      id: lab.id,
      title: lab.title,
      description: lab.description ?? "Hands-on practice lab",
      difficulty,
      status: isLocked
        ? "locked" as const
        : lab.status === "complete"
          ? "completed"
          : lab.status === "in_progress"
            ? "in-progress"
            : "not-started",
      runtime: requiresGPU ? "gpu" : "browser",
      durationMin: lab.estimated_minutes || 30,
      durationMax: (lab.estimated_minutes || 30) + 15,
      category:
        phaseNum <= 2
          ? "foundations"
          : phaseNum <= 4
            ? "training"
            : phaseNum <= 6
              ? "systems"
              : "portfolio",
      phaseId: lab.phase_id,
      phaseName: lab.phase_name,
      requiresGPU,
    };
  });

  return NextResponse.json(enriched);
}
