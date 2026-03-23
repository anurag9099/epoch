import fs from "fs";
import path from "path";

interface TopicEntry {
  id: string;
  label: string;
  phase: number;
  aliases: string[];
}

let taxonomy: TopicEntry[] | null = null;

function loadTaxonomy(): TopicEntry[] {
  if (!taxonomy) {
    const data = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data", "topic-taxonomy.json"), "utf-8")
    );
    taxonomy = data.topics;
  }
  return taxonomy!;
}

/**
 * Match text against topic aliases. Returns topic id or null.
 */
export function matchTopic(text: string): string | null {
  const topics = loadTaxonomy();
  const lower = text.toLowerCase();

  // Exact alias match first
  for (const t of topics) {
    for (const alias of t.aliases) {
      if (lower.includes(alias.toLowerCase())) {
        return t.id;
      }
    }
  }

  // Label match
  for (const t of topics) {
    if (lower.includes(t.label.toLowerCase())) {
      return t.id;
    }
  }

  return null;
}

/**
 * Get topic id for a phase_id (returns first topic in that phase).
 */
export function topicForPhase(phaseId: number): string | null {
  const topics = loadTaxonomy();
  const match = topics.find((t) => t.phase === phaseId);
  return match?.id ?? null;
}
