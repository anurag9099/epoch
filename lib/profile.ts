import { execute, get } from "./db";
import { flagshipPath } from "./path";

export interface LearnerProfile {
  id: number;
  learner_name: string;
  current_role: string;
  target_role: string;
  active_path_name: string;
  primary_specialization: string;
  weekly_hours: number;
  mission_statement: string;
}

const CREATE_PROFILE_SQL = `
CREATE TABLE IF NOT EXISTS learner_profile (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  learner_name TEXT NOT NULL DEFAULT 'Builder',
  current_role TEXT NOT NULL DEFAULT 'Software Engineer',
  target_role TEXT NOT NULL DEFAULT 'ML System Engineer',
  active_path_name TEXT NOT NULL DEFAULT 'ML Systems Path',
  primary_specialization TEXT NOT NULL DEFAULT 'Reinforcement Learning',
  weekly_hours INTEGER NOT NULL DEFAULT 10,
  mission_statement TEXT NOT NULL DEFAULT 'Build systems that train, align, and evaluate frontier models.',
  updated_at TEXT DEFAULT (datetime('now'))
);
`;

async function ensureProfileTable() {
  await execute(CREATE_PROFILE_SQL);
  await execute(
    `INSERT OR IGNORE INTO learner_profile
      (id, learner_name, current_role, target_role, active_path_name, primary_specialization, weekly_hours, mission_statement)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "Builder",
      "Software Engineer",
      flagshipPath.targetRole,
      flagshipPath.name,
      "Reinforcement Learning",
      flagshipPath.weeklyHours,
      "Build systems that train, align, and evaluate frontier models.",
    ]
  );
  await execute(
    `UPDATE learner_profile
     SET target_role = CASE
         WHEN target_role = 'AI Systems Engineer' THEN ?
         ELSE target_role
       END,
       active_path_name = CASE
         WHEN active_path_name = 'AI Systems Path' THEN ?
         ELSE active_path_name
       END,
       updated_at = datetime('now')
     WHERE id = 1`,
    [flagshipPath.targetRole, flagshipPath.name]
  );
}

export async function getLearnerProfile(): Promise<LearnerProfile> {
  await ensureProfileTable();
  const profile = await get("SELECT * FROM learner_profile WHERE id = 1");
  return {
    id: 1,
    learner_name: (profile?.learner_name as string) ?? "Builder",
    current_role: (profile?.current_role as string) ?? "Software Engineer",
    target_role: (profile?.target_role as string) ?? flagshipPath.targetRole,
    active_path_name: (profile?.active_path_name as string) ?? flagshipPath.name,
    primary_specialization: (profile?.primary_specialization as string) ?? "Reinforcement Learning",
    weekly_hours: (profile?.weekly_hours as number) ?? flagshipPath.weeklyHours,
    mission_statement:
      (profile?.mission_statement as string) ??
      "Build systems that train, align, and evaluate frontier models.",
  };
}
