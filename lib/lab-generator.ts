import { execute, get } from "./db";
import { streamChat } from "./llm/provider";

interface GeneratedConfig {
  title: string;
  objective: string;
  requiresGPU: boolean;
  steps: Array<{
    id: number;
    title: string;
    description: string;
    hint: string;
    code: string;
  }>;
  measurements: Array<{
    key: string;
    label: string;
    target: string;
    unit: string;
  }>;
  checklist: string[];
  files: string[];
  starterCode: Record<string, string>;
}

// Mode A: Generate config for existing lab that lacks one
export async function generateLabConfig(
  taskId: number
): Promise<GeneratedConfig | null> {
  // Check if already generated
  const existing = await get(
    "SELECT config_json FROM generated_lab_configs WHERE task_id = ?",
    [taskId]
  );
  if (existing) return JSON.parse(existing.config_json as string);

  // Get task info
  const task = await get("SELECT * FROM tasks WHERE id = ?", [taskId]);
  if (!task) return null;

  const phase = await get("SELECT name FROM phases WHERE id = ?", [
    task.phase_id,
  ]);

  // Generate via LLM
  const prompt = `Generate a hands-on coding lab config for an ML engineer.

Lab: "${task.title}"
Phase: "${phase?.name}"
Description: "${task.description ?? "N/A"}"

Return ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
  "title": "${task.title}",
  "objective": "one sentence starting with 'By the end of this lab...'",
  "requiresGPU": true or false,
  "steps": [
    {
      "id": 1,
      "title": "step title",
      "description": "1-2 sentences explaining what to do",
      "hint": "common pitfall or tip",
      "code": "starter python code with TODO comments where user fills in"
    }
  ],
  "measurements": [
    { "key": "metric_name", "label": "Human Label", "target": "Target: value", "unit": "unit" }
  ],
  "checklist": ["self-assessment item 1", "item 2", "item 3"],
  "files": ["train.py"],
  "starterCode": { "train.py": "full starter code with TODO markers" }
}

Generate 3-4 steps. Code should be scaffolded with TODO comments — NOT complete. Force the user to think.
Include 2-3 measurement fields with realistic targets.`;

  let fullResponse = "";
  try {
    const generator = streamChat("gpt", prompt, [
      { role: "user", content: "Generate the lab config." },
    ]);
    for await (const chunk of generator) {
      fullResponse += chunk;
    }

    // Parse JSON from response (handle potential markdown wrapping)
    let jsonStr = fullResponse;
    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const config = JSON.parse(jsonStr) as GeneratedConfig;

    // Save to DB
    await execute(
      "INSERT INTO generated_lab_configs (task_id, config_json, generated_by) VALUES (?, ?, 'gpt')",
      [taskId, JSON.stringify(config)]
    );

    return config;
  } catch (err) {
    console.error("Lab generation failed:", err);
    return null;
  }
}

// Mode B: Create NEW lab from gap signal
export async function createGapLab(
  topic: string,
  phaseId: number,
  evidence: string
): Promise<number | null> {
  // Check if we already have a generated lab for this topic
  const existing = await get(
    "SELECT t.id FROM tasks t JOIN generated_lab_configs g ON t.id = g.task_id WHERE t.title LIKE ?",
    [`%${topic}%`]
  );
  if (existing) return existing.id as number;

  // Get max order_num for the phase
  const maxOrder = await get(
    "SELECT MAX(order_num) as m FROM tasks WHERE phase_id = ?",
    [phaseId]
  );
  const nextOrder = ((maxOrder?.m as number) ?? 0) + 1;

  // Generate config via LLM
  const prompt = `Create a focused 20-minute practice lab for an ML engineer who is weak on: ${topic}
Evidence: ${evidence}

Return ONLY valid JSON:
{
  "title": "Practice: [descriptive title about ${topic}]",
  "objective": "one sentence",
  "requiresGPU": false,
  "steps": [
    {
      "id": 1,
      "title": "step title",
      "description": "1-2 sentences",
      "hint": "tip",
      "code": "scaffolded python code with TODO"
    }
  ],
  "measurements": [
    { "key": "metric_name", "label": "Human Label", "target": "Target: value", "unit": "unit" }
  ],
  "checklist": ["self-assessment item 1", "item 2", "item 3"],
  "files": ["practice.py"],
  "starterCode": { "practice.py": "scaffolded code with TODOs" }
}`;

  let fullResponse = "";
  try {
    const generator = streamChat("gpt", prompt, [
      { role: "user", content: "Generate the practice lab." },
    ]);
    for await (const chunk of generator) {
      fullResponse += chunk;
    }

    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const config = JSON.parse(jsonMatch[0]);

    // Create new task
    await execute(
      "INSERT INTO tasks (phase_id, type, title, description, status, order_num) VALUES (?, 'lab', ?, ?, 'todo', ?)",
      [phaseId, config.title, config.objective, nextOrder]
    );

    const newTask = await get("SELECT id FROM tasks ORDER BY id DESC LIMIT 1");
    if (!newTask) return null;
    const taskId = newTask.id as number;

    // Save generated config
    await execute(
      "INSERT INTO generated_lab_configs (task_id, config_json, generated_by) VALUES (?, ?, 'gpt')",
      [taskId, JSON.stringify(config)]
    );

    // Create recommendation
    await execute(
      `INSERT INTO recommendations (source, title, url, content_type, reason, topic, priority)
       VALUES ('system', ?, ?, 'lab', ?, ?, 0.9)`,
      [
        config.title,
        `/lab/${taskId}`,
        `Created because you scored low on ${topic}. ${evidence}`,
        topic,
      ]
    );

    return taskId;
  } catch (err) {
    console.error("Gap lab generation failed:", err);
    return null;
  }
}
