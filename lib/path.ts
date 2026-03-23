export const epochBrand = {
  name: "Epoch",
  descriptor: "Focused Paths for AI Engineers",
  promise: "Turn effort into visible capability",
} as const;

export const flagshipPath = {
  id: "ai-systems-engineer",
  name: "ML Systems Path",
  audience: "Software engineers moving into AI systems work",
  targetRole: "ML System Engineer",
  weeklyHours: 10,
  specializations: [
    {
      id: "core-systems",
      label: "Core Systems",
      description: "Training loops, distributed systems, profiling, and shipping model infrastructure.",
    },
    {
      id: "rl-specialization",
      label: "RL Specialization",
      description: "RLHF, preference optimization, reward modeling, and agent training loops.",
    },
    {
      id: "proof-building",
      label: "Proof Building",
      description: "Artifacts, benchmarks, OSS contributions, and portfolio-ready evidence.",
    },
  ],
} as const;

export function specializationForPhase(phaseId: number): string {
  if (phaseId >= 4 && phaseId <= 6) return "RL Specialization";
  if (phaseId === 7) return "Proof Building";
  return "Core Systems";
}

export function stageLabelForPhase(phaseId: number): string {
  if (phaseId <= 2) return "Foundations";
  if (phaseId === 3) return "Distributed Training";
  if (phaseId === 4) return "RLHF";
  if (phaseId === 5) return "Systems Performance";
  if (phaseId === 6) return "Agent Training";
  return "Portfolio";
}

export function missionRouteForTask(task: { id: number; type: string }): string {
  const route =
    task.type === "lab"
      ? "lab"
      : task.type === "quiz"
        ? "quiz"
        : "learn";
  return `/${route}/${task.id}`;
}
