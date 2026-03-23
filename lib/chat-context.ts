import { query, get } from "./db";
import { getMemories } from "./unity-memory";
import { buildRecommendationContext, buildUnitySignalContext } from "./intelligence/presenter";

interface ChatContext {
  phaseId?: number;
  taskId?: number;
}

export async function buildSystemPrompt(ctx: ChatContext): Promise<string> {
  // Current state
  const streak = await get("SELECT * FROM streaks WHERE id = 1");
  const totalDone = await get(
    "SELECT COUNT(*) as c FROM tasks WHERE status = 'complete'"
  );
  const totalTasks = await get("SELECT COUNT(*) as c FROM tasks");

  // Compute current day
  const firstLog = await get("SELECT MIN(date) as d FROM daily_log");
  let currentDay = 1;
  if (firstLog?.d) {
    currentDay = Math.min(
      Math.floor(
        (Date.now() - new Date(firstLog.d as string).getTime()) / 86400000
      ) + 1,
      42
    );
  }

  // All phases with progress
  const phases = await query(`
    SELECT p.*,
      (SELECT COUNT(*) FROM tasks WHERE phase_id = p.id AND status = 'complete') as completed,
      (SELECT COUNT(*) FROM tasks WHERE phase_id = p.id) as total
    FROM phases p ORDER BY order_num
  `);
  const currentPhase = phases.find((p) => p.status === "active") || phases[0];

  // Current task context
  let taskContext = "";
  if (ctx.taskId) {
    const task = await get("SELECT * FROM tasks WHERE id = ?", [ctx.taskId]);
    if (task) {
      const phase = await get("SELECT name FROM phases WHERE id = ?", [
        task.phase_id,
      ]);
      taskContext = `
CURRENT TASK:
- Title: ${task.title}
- Type: ${task.type}
- Phase: ${phase?.name}
- Status: ${task.status}
- Description: ${(task.description as string || "N/A").slice(0, 200)}
- Notes: ${(task.notes as string || "None").slice(0, 150)}`;

      // Add lab results if lab task
      if (task.type === "lab") {
        const fields = await query(
          "SELECT lf.*, lr.value, lr.terminal_output FROM lab_fields lf LEFT JOIN lab_results lr ON lf.id = lr.field_id WHERE lf.task_id = ?",
          [ctx.taskId]
        );
        if (fields.length > 0) {
          taskContext += "\nLAB RESULTS:";
          for (const f of fields) {
            taskContext += `\n- ${f.field_name}: ${f.value || "not measured"} ${f.field_unit || ""}`;
          }
        }
      }
    }
  }

  // Recent quiz performance (last 3)
  const recentQuizzes = await query(`
    SELECT qr.*, t.title as task_title
    FROM quiz_results qr
    JOIN tasks t ON qr.task_id = t.id
    ORDER BY qr.attempted_at DESC LIMIT 3
  `);

  let quizContext = "";
  if (recentQuizzes.length > 0) {
    quizContext = "\nQUIZ PERFORMANCE:";
    for (const q of recentQuizzes) {
      quizContext += `\n- ${(q.task_title as string).slice(0, 40)}: ${q.score}/${q.total} ${q.passed ? "P" : "F"}`;
    }

    const lastFailed = recentQuizzes.find((q) => !q.passed);
    if (lastFailed) {
      const wrongAnswers = await query(
        `SELECT qa.user_answer, qq.question, qq.explanation
        FROM quiz_attempts qa
        JOIN quiz_questions qq ON qa.question_id = qq.id
        WHERE qa.result_id = ? AND qa.is_correct = 0 LIMIT 2`,
        [lastFailed.id]
      );
      if (wrongAnswers.length > 0) {
        quizContext += "\nWRONG ANSWERS:";
        for (const wa of wrongAnswers) {
          quizContext += `\n- Q: ${(wa.question as string).slice(0, 80)}... A: ${wa.user_answer}`;
        }
      }
    }
  }

  // --- NEW: Behavior profile from topic_scores + signals ---
  const strongTopics = await query(
    "SELECT topic, score FROM topic_scores WHERE score > 70 ORDER BY score DESC LIMIT 3"
  );
  const weakTopics = await query(
    "SELECT topic, score FROM topic_scores WHERE score < 50 ORDER BY score ASC LIMIT 3"
  );

  let behaviorProfile = "\nBEHAVIOR PROFILE:";
  if (strongTopics.length > 0) {
    behaviorProfile += `\n- Strong: ${strongTopics.map((t) => `${(t.topic as string).replace(/_/g, " ")}(${t.score})`).join(", ")}`;
  }
  if (weakTopics.length > 0) {
    behaviorProfile += `\n- Weak: ${weakTopics.map((t) => `${(t.topic as string).replace(/_/g, " ")}(${t.score})`).join(", ")}`;
  }

  const unitySignals = await buildUnitySignalContext();
  if (unitySignals.signalLines.length > 0) {
    behaviorProfile += "\n- Signals:";
    for (const line of unitySignals.signalLines) {
      behaviorProfile += ` [${line.slice(0, 88)}]`;
    }
  }

  // Study pattern from daily_log
  const studyPattern = await query(
    "SELECT date, tasks_completed, minutes_spent FROM daily_log ORDER BY date DESC LIMIT 7"
  );
  if (studyPattern.length > 0) {
    const totalMins = studyPattern.reduce((s, d) => s + ((d.minutes_spent as number) || 0), 0);
    const activeDays = studyPattern.filter((d) => (d.tasks_completed as number) > 0).length;
    behaviorProfile += `\n- Study: ${activeDays}/7 active days, ${totalMins}min total`;
  }

  // --- Feed items (latest 15 for better search coverage) ---
  const feedItems = await query(
    "SELECT title, source, summary, url FROM feed_items ORDER BY published_at DESC LIMIT 15"
  );
  let feedContext = "";
  if (feedItems.length > 0) {
    feedContext = "\nLENS FEED (the app's research page at /lens — NOT Lens.org):";
    for (const fi of feedItems) {
      feedContext += `\n- [${fi.source}] ${(fi.title as string).slice(0, 80)}`;
      if (fi.summary) feedContext += ` — ${(fi.summary as string).slice(0, 60)}`;
    }
  }

  // --- NEW: Active recommendations ---
  const recommendationContext = await buildRecommendationContext();
  let recsContext = "";
  if (recommendationContext.signals.length > 0) {
    recsContext = `\nACTIVE RECS: ${recommendationContext.headline} — ${recommendationContext.summary}`;
    for (const signal of recommendationContext.signals.slice(0, 3)) {
      recsContext += `\n- ${signal.label}: ${signal.topicLabel}`;
    }
  }

  // --- NEW: Recent notes ---
  const recentNotes = await query(
    "SELECT title, notes FROM tasks WHERE notes IS NOT NULL AND notes != '' ORDER BY completed_at DESC LIMIT 3"
  );
  let notesContext = "";
  if (recentNotes.length > 0) {
    notesContext = "\nRECENT NOTES:";
    for (const n of recentNotes) {
      notesContext += `\n- ${(n.title as string).slice(0, 30)}: ${(n.notes as string).slice(0, 80)}`;
    }
  }

  // --- NEW: Recently completed tasks ---
  const completedTasks = await query(
    "SELECT title FROM tasks WHERE status = 'complete' ORDER BY completed_at DESC LIMIT 10"
  );
  let completedContext = "";
  if (completedTasks.length > 0) {
    completedContext = `\nCOMPLETED(${completedTasks.length}): ${completedTasks.map((t) => (t.title as string).slice(0, 30)).join(" | ")}`;
  }

  // Phase progress summary (compact)
  let phaseProgress = "\nPHASES:";
  for (const p of phases) {
    const pct =
      (p.total as number) > 0
        ? Math.round(((p.completed as number) / (p.total as number)) * 100)
        : 0;
    phaseProgress += ` ${(p.name as string).slice(0, 15)}:${pct}%`;
  }

  // Pace info
  const total = (totalTasks?.c as number) || 1;
  const done = (totalDone?.c as number) || 0;
  const expectedPct = Math.round((currentDay / 42) * 100);
  const actualPct = Math.round((done / total) * 100);

  const progressPct = actualPct;

  // Resume targets (compact)
  const unfilledResume = await query(
    "SELECT placeholder FROM resume_bullets WHERE status = 'empty' LIMIT 3"
  );
  let resumeContext = "";
  if (unfilledResume.length > 0) {
    resumeContext = `\nUNFILLED RESUME: ${unfilledResume.map((b) => b.placeholder).join(", ")}`;
  }

  // Goals (compact)
  const goals = await query(
    "SELECT title, category FROM goals WHERE status = 'active' ORDER BY created_at DESC LIMIT 3"
  );
  let goalsContext = "";
  if (goals.length > 0) {
    goalsContext = `\nGOALS: ${goals.map((g) => `[${g.category}]${g.title}`).join(" | ")}`;
  }

  // Unity memory from previous sessions
  const memories = await getMemories();
  let memoryContext = "";
  if (memories.length > 0) {
    memoryContext = "\nUNITY'S MEMORY (from previous sessions):";
    for (const m of memories) {
      memoryContext += `\n- [${m.memory_type}] ${m.content}`;
    }
  }

  return `You are Unity — a hivemind study partner for Anurag who is preparing for the ML Systems Engineer (RL Engineering) role at Anthropic. You have access to his entire learning state.

You are NOT a generic assistant. You are his dedicated ML training coach who knows everything about his roadmap, his progress, his strengths, and his gaps.

PERSONALITY:
- Direct, technical, no fluff
- Push him to think — don't just give answers. Use Socratic method when appropriate.
- Reference his actual notes, results, and quiz performance when relevant
- Connect concepts to his real work at Scania (CSD classification, multi-agent platform)
- If he's behind schedule, say so clearly
- When he gets something wrong, make him work through it
- Speak like a senior ML engineer who's been through this training pipeline

STATE:
- Day ${currentDay}/42 | ${progressPct}% done (${done}/${total}) | Expected: ${expectedPct}%
- Streak: ${streak?.current_streak || 0}d (best: ${streak?.best_streak || 0})
- Phase: ${currentPhase?.name}
${phaseProgress}
${taskContext}
${quizContext}
${behaviorProfile}
UNITY FOCUS:
- ${unitySignals.focus}
- ${unitySignals.summary}
${feedContext}
${recsContext}
${notesContext}
${completedContext}
${resumeContext}
${goalsContext}
${memoryContext}

BACKGROUND:
Anurag is a Senior ML Engineer at Scania/VW Group. 10+ years building production AI systems. Gap: no hands-on distributed training or RLHF. Resume has [X] placeholders to fill from labs.

APP PAGES (this is the Epoch learning app — you live inside it):
- Dashboard (/) — hero focus card, stats, week calendar, phase progress
- Phases (/phases) — all 7 learning phases with task lists
- Lens (/lens) — the app's research page with 3 tabs: Latest (RSS feed), For You (personalized recommendations), Saved (bookmarks). THIS IS NOT Lens.org. When user says "Lens" they mean this page.
- Resume (/resume) — tracks [X] placeholder metrics
- Goals (/goals) — learning targets
- Learn (/learn/[id]) — video/reading tasks
- Lab (/lab/[id]) — hands-on coding labs with Monaco editor
- Quiz (/quiz/[id]) — knowledge tests

SCOPE — STRICT (non-negotiable):
- You ONLY discuss topics related to: machine learning, deep learning, distributed training, RLHF, PyTorch, transformers, NLP, LLMs, AI systems engineering, Python, CUDA, the user's roadmap, his Scania work, the Anthropic role, and directly related CS/math foundations.
- If the user asks about ANYTHING outside this scope (politics, sports, general trivia, personal advice unrelated to career, entertainment, etc.), respond ONLY with: "I'm focused on your ML training journey. Let's get back to it — what topic from your roadmap should we work on?"
- Do NOT answer off-topic questions even if asked nicely. Do NOT say "I can't answer that" — redirect back to learning.
- This is a study partner, not a general assistant.

WEB SEARCH — AUTO-TRIGGERED:
- When the user asks about a topic, paper, technique, or library that is NOT in your current context (feed items, notes, roadmap), respond with: [SEARCH_NEEDED: query terms here]
- The system will automatically fetch web results and include them in your context. You will then receive a follow-up with the search results.
- Do NOT tell the user to "search on Google" or "check arXiv" — the search happens automatically.
- When search results are provided (prefixed with [Web search results for...]), use them to give an informed answer. Cite specific papers or articles from the results.

RULES:
- If he asks about articles, papers, or feed content — search the LENS FEED items above first. Reference actual titles.
- If he asks "find me X in Lens" — search the feed items listed above for matches.
- If no match in feed and topic is in-scope, trigger [SEARCH_NEEDED: topic] to auto-search.
- If he asks a concept question, connect it to his current task when possible.
- If he's on a lab, help with practical implementation.
- If he mentions a number from a lab, sanity-check it.
- If he's stuck, give hints before full answers.
- Keep responses concise but technical. No padding.
- Use code blocks for any code, configs, or commands.
- When relevant, mention which resume [X] placeholder connects to what he's working on.
- Reference app pages by name (Lens, Phases, Dashboard) — you know the full app structure.`;
}
