import { query, execute } from "./db";

// Save a memory after a chat session
export async function saveMemory(
  memoryType: string, // 'fact', 'preference', 'commitment', 'confusion'
  content: string,
  sessionId?: number
) {
  // Check count — cap at 20
  const count = await query(
    "SELECT COUNT(*) as c FROM unity_memory WHERE is_active = 1"
  );
  const total = (count[0]?.c as number) ?? 0;

  if (total >= 20) {
    // Archive oldest
    await execute(
      "UPDATE unity_memory SET is_active = 0 WHERE id = (SELECT id FROM unity_memory WHERE is_active = 1 ORDER BY created_at ASC LIMIT 1)"
    );
  }

  await execute(
    "INSERT INTO unity_memory (memory_type, content, source_session_id) VALUES (?, ?, ?)",
    [memoryType, content, sessionId ?? null]
  );
}

// Get active memories for system prompt
export async function getMemories(): Promise<
  Array<{ memory_type: string; content: string }>
> {
  const rows = await query(
    "SELECT memory_type, content FROM unity_memory WHERE is_active = 1 ORDER BY created_at DESC LIMIT 20"
  );
  return rows as Array<{ memory_type: string; content: string }>;
}

// Generate memory summary from a chat session using LLM
export async function summarizeSession(
  sessionId: number,
  messages: Array<{ role: string; content: string }>
): Promise<void> {
  // Only summarize if session has 3+ exchanges (6+ messages)
  if (messages.length < 6) return;

  // Extract key facts from the conversation without calling LLM
  // Simple heuristic: look for patterns
  const userMessages = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content);

  // Detect confusions (questions asked multiple times)
  const topics = new Set<string>();
  for (const msg of userMessages) {
    const lower = msg.toLowerCase();
    if (
      lower.includes("?") ||
      lower.includes("explain") ||
      lower.includes("confused") ||
      lower.includes("don't understand")
    ) {
      // Extract a short topic from the question
      const words = lower
        .replace(/[?.,!]/g, "")
        .split(" ")
        .filter((w) => w.length > 3)
        .slice(0, 4);
      if (words.length > 0) topics.add(words.join(" "));
    }
  }

  for (const topic of Array.from(topics)) {
    await saveMemory("confusion", `User asked about: ${topic}`, sessionId);
  }

  // Detect preferences
  for (const msg of userMessages) {
    const lower = msg.toLowerCase();
    if (
      lower.includes("prefer") ||
      lower.includes("like") ||
      lower.includes("better")
    ) {
      await saveMemory("preference", msg.slice(0, 200), sessionId);
      break; // One preference per session max
    }
  }
}
