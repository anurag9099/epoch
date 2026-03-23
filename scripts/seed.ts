import fs from "fs";
import path from "path";
import { execute, execRaw } from "../lib/db";
import { SCHEMA_SQL } from "../lib/schema";

// Read JSON files using fs to avoid import resolution issues with tsx
const dataDir = path.join(__dirname, "..", "data");

function loadJSON<T>(filename: string): T {
  const raw = fs.readFileSync(path.join(dataDir, filename), "utf-8");
  return JSON.parse(raw) as T;
}

interface Phase {
  id: number;
  name: string;
  slug: string;
  description: string;
  order_num: number;
  start_week: number;
  end_week: number;
  gate_check_text: string | null;
  status: string;
}

interface Task {
  id: number;
  phase_id: number;
  type: string;
  title: string;
  description: string | null;
  content_url: string | null;
  estimated_minutes: number | null;
  order_num: number;
  scheduled_day: number | null;
}

interface QuizQuestion {
  phase_id: number;
  question: string;
  type: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string;
  order_num: number;
}

interface VideoSegment {
  task_id: number;
  label: string;
  order_num: number;
}

interface LabField {
  phase_id: number;
  lab_title: string;
  field_name: string;
  field_unit: string;
  placeholder_text: string | null;
  resume_placeholder: string | null;
  order_num: number;
}

interface ResumeBullet {
  id: number;
  bullet_text: string;
  placeholder: string;
}

const phases = loadJSON<Phase[]>("phases.json");
const tasks = loadJSON<Task[]>("tasks.json");
const quizQuestions = loadJSON<QuizQuestion[]>("quiz-questions.json");
const videoSegments = loadJSON<VideoSegment[]>("video-segments.json");
const labFields = loadJSON<LabField[]>("lab-fields.json");
const resumeBullets = loadJSON<ResumeBullet[]>("resume-bullets.json");

async function seed() {
  console.log("Dropping existing tables...");

  const tables = [
    "unity_memory",
    "generated_lab_configs",
    "saved_items",
    "recommendations",
    "topic_scores",
    "user_signals",
    "user_events",
    "chat_messages",
    "chat_sessions",
    "quiz_attempts",
    "quiz_results",
    "quiz_questions",
    "task_segments",
    "lab_results",
    "proof_artifacts",
    "resume_bullets",
    "lab_fields",
    "feed_items",
    "daily_log",
    "streaks",
    "goals",
    "learner_profile",
    "tasks",
    "phases",
  ];

  // Drop indexes first
  const indexes = [
    "idx_tasks_phase",
    "idx_tasks_status",
    "idx_tasks_day",
    "idx_segments_task",
    "idx_quiz_q_task",
    "idx_lab_fields_task",
    "idx_artifacts_task",
    "idx_artifacts_status",
    "idx_feed_source",
    "idx_feed_published",
    "idx_daily_log_date",
    "idx_quiz_results_task",
    "idx_quiz_attempts_result",
    "idx_chat_phase",
    "idx_chat_task",
    "idx_chat_session",
    "idx_goals_status",
    "idx_events_type",
    "idx_events_topic",
    "idx_events_created",
    "idx_signals_type",
    "idx_signals_topic",
    "idx_signals_active",
    "idx_topic_scores_topic",
    "idx_recommendations_status",
    "idx_recommendations_topic",
    "idx_saved_feed",
    "idx_generated_labs_task",
    "idx_unity_memory_active",
    "idx_profile_specialization",
  ];

  for (const idx of indexes) {
    await execute(`DROP INDEX IF EXISTS ${idx}`);
  }

  for (const table of tables) {
    await execute(`DROP TABLE IF EXISTS ${table}`);
  }

  console.log("Creating schema...");
  await execRaw(SCHEMA_SQL);

  // Insert phases
  for (const p of phases) {
    await execute(
      "INSERT INTO phases (id, name, slug, description, order_num, start_week, end_week, gate_check_text, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        p.id,
        p.name,
        p.slug,
        p.description,
        p.order_num,
        p.start_week,
        p.end_week,
        p.gate_check_text ?? null,
        p.status,
      ]
    );
  }
  console.log(`  Phases: ${phases.length}`);

  await execute(
    `INSERT INTO learner_profile
      (id, learner_name, current_role, target_role, active_path_name, primary_specialization, weekly_hours, mission_statement)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "Builder",
      "Software Engineer",
      "ML System Engineer",
      "ML Systems Path",
      "Reinforcement Learning",
      10,
      "Build systems that train, align, and evaluate frontier models.",
    ]
  );

  // Insert tasks
  for (const t of tasks) {
    await execute(
      "INSERT INTO tasks (id, phase_id, type, title, description, content_url, estimated_minutes, order_num, scheduled_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        t.id,
        t.phase_id,
        t.type,
        t.title,
        t.description ?? null,
        t.content_url ?? null,
        t.estimated_minutes ?? null,
        t.order_num,
        t.scheduled_day ?? null,
      ]
    );
  }
  console.log(`  Tasks: ${tasks.length}`);

  // Insert video segments
  for (const s of videoSegments) {
    await execute(
      "INSERT INTO task_segments (task_id, label, order_num) VALUES (?, ?, ?)",
      [s.task_id, s.label, s.order_num]
    );
  }
  console.log(`  Video segments: ${videoSegments.length}`);

  // Insert quiz questions — map phase_id to the quiz task for that phase
  let quizInserted = 0;
  for (const q of quizQuestions) {
    const quizTask = tasks.find(
      (t) => t.phase_id === q.phase_id && t.type === "quiz"
    );
    if (!quizTask) {
      console.warn(
        `  Warning: No quiz task found for phase ${q.phase_id}, skipping question`
      );
      continue;
    }
    await execute(
      "INSERT INTO quiz_questions (task_id, question, type, options_json, correct_answer, explanation, order_num) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        quizTask.id,
        q.question,
        q.type,
        q.options ? JSON.stringify(q.options) : null,
        q.correct_answer,
        q.explanation,
        q.order_num,
      ]
    );
    quizInserted++;
  }
  console.log(`  Quiz questions: ${quizInserted}`);

  // Insert lab fields — match to lab tasks by phase and title keywords
  let labFieldId = 0;
  const labFieldMap: Record<string, number> = {}; // resume_placeholder -> field id

  for (const f of labFields) {
    // Find a lab task in this phase that matches the lab_title
    // Try matching by first two words of lab_title
    const titleWords = f.lab_title.split(" ").slice(0, 2).join(" ").toLowerCase();
    let labTask = tasks.find(
      (t) =>
        t.phase_id === f.phase_id &&
        t.type === "lab" &&
        t.title.toLowerCase().includes(titleWords)
    );

    // Fallback: any lab task in the same phase
    if (!labTask) {
      labTask = tasks.find(
        (t) => t.phase_id === f.phase_id && t.type === "lab"
      );
    }

    if (!labTask) {
      console.warn(
        `  Warning: No lab task found for field "${f.field_name}" in phase ${f.phase_id}, skipping`
      );
      continue;
    }

    labFieldId++;
    await execute(
      "INSERT INTO lab_fields (id, task_id, field_name, field_unit, placeholder_text, resume_placeholder, order_num) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        labFieldId,
        labTask.id,
        f.field_name,
        f.field_unit || null,
        f.placeholder_text || null,
        f.resume_placeholder || null,
        f.order_num,
      ]
    );

    if (f.resume_placeholder) {
      labFieldMap[f.resume_placeholder] = labFieldId;
    }
  }
  console.log(`  Lab fields: ${labFieldId}`);

  // Insert resume bullets and attempt to link to lab fields
  for (const b of resumeBullets) {
    let linkedFieldId: number | null = null;

    // Try substring matching between bullet placeholder and lab field resume_placeholder
    for (const [placeholder, fieldId] of Object.entries(labFieldMap)) {
      const bulletWords = b.placeholder
        .split(" ")
        .slice(0, 3)
        .join(" ")
        .toLowerCase();
      const fieldWords = placeholder
        .split(" ")
        .slice(0, 3)
        .join(" ")
        .toLowerCase();

      if (
        b.placeholder.toLowerCase().includes(fieldWords) ||
        placeholder.toLowerCase().includes(bulletWords)
      ) {
        linkedFieldId = fieldId;
        break;
      }
    }

    await execute(
      "INSERT INTO resume_bullets (id, bullet_text, placeholder, linked_field_id) VALUES (?, ?, ?, ?)",
      [b.id, b.bullet_text, b.placeholder, linkedFieldId]
    );
  }
  console.log(`  Resume bullets: ${resumeBullets.length}`);

  // Initialize streaks singleton
  await execute(
    "INSERT INTO streaks (id, current_streak, best_streak) VALUES (1, 0, 0)"
  );
  console.log("  Streaks: initialized");

  // Seed topic scores from taxonomy
  const taxonomy = loadJSON<{ topics: Array<{ id: string; phase: number }> }>("topic-taxonomy.json");
  for (const t of taxonomy.topics) {
    await execute(
      "INSERT INTO topic_scores (topic, score, phase_id) VALUES (?, 50, ?)",
      [t.id, t.phase]
    );
  }
  console.log(`  Topic scores: ${taxonomy.topics.length}`);

  console.log("\nSeed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
