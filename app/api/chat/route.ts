import { NextRequest } from "next/server";
import { execute, query, get } from "@/lib/db";
import { buildSystemPrompt } from "@/lib/chat-context";
import { streamChat } from "@/lib/llm/provider";
import { trackEvent } from "@/lib/observer";
import { matchTopic } from "@/lib/topic-matcher";
import { summarizeSession } from "@/lib/unity-memory";
import type { ChatAttachment } from "@/lib/chat-attachments";
import { buildStoredUserMessage } from "@/lib/chat-attachments";
import { resolveChatAttachments } from "@/lib/document-extractor";
import type { LlmProvider } from "@/lib/llm/provider";

const VALID_PROVIDERS = new Set<LlmProvider>(["openai", "bedrock", "ollama"]);

function resolveProvider(provider: unknown): LlmProvider {
  if (typeof provider === "string" && VALID_PROVIDERS.has(provider as LlmProvider)) {
    return provider as LlmProvider;
  }
  const fromEnv = (process.env.LLM_PROVIDER || "openai").toLowerCase();
  if (VALID_PROVIDERS.has(fromEnv as LlmProvider)) {
    return fromEnv as LlmProvider;
  }
  return "openai";
}

function parseOptionalId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const { message, taskId, phaseId, attachments = [], session_id, provider, model } =
    await req.json();
  const selectedProvider = resolveProvider(provider);
  const selectedModel =
    typeof model === "string" && model.trim().length > 0
      ? model.trim()
      : process.env.LLM_MODEL ||
        (selectedProvider === "ollama"
          ? "gemma3:4b"
          : selectedProvider === "bedrock"
            ? process.env.BEDROCK_MODEL_ID || "anthropic.claude-sonnet-4-6"
            : "gpt-5.4");
  const storedModel = `${selectedProvider}:${selectedModel}`;
  const parsedTaskId = parseOptionalId(taskId);
  const parsedPhaseId = parseOptionalId(phaseId);
  const parsedSessionId = parseOptionalId(session_id);
  const safeAttachments = Array.isArray(attachments) ? (attachments as ChatAttachment[]) : [];
  const visibleMessage = typeof message === "string" ? message : "";
  const resolvedAttachments = await resolveChatAttachments(safeAttachments);

  if (typeof message !== "string" || (visibleMessage.trim().length === 0 && resolvedAttachments.length === 0)) {
    return new Response(JSON.stringify({ error: "Message required" }), {
      status: 400,
    });
  }

  // Validate incoming context to avoid foreign-key failures from stale local state.
  const validTask = parsedTaskId
    ? await get("SELECT id, phase_id FROM tasks WHERE id = ?", [parsedTaskId])
    : null;
  const validTaskId = validTask ? (validTask.id as number) : null;

  const validPhaseIdFromTask = validTask ? (validTask.phase_id as number) : null;
  const validPhase = parsedPhaseId
    ? await get("SELECT id FROM phases WHERE id = ?", [parsedPhaseId])
    : null;
  const validPhaseId = validPhaseIdFromTask ?? (validPhase ? (validPhase.id as number) : null);

  // Resolve or create session
  let sessionId = parsedSessionId;
  if (sessionId) {
    const existingSession = await get("SELECT id FROM chat_sessions WHERE id = ?", [sessionId]);
    if (!existingSession) {
      sessionId = null;
    }
  }

  if (!sessionId) {
    await execute(
      `INSERT INTO chat_sessions (title, phase_id, task_id, model)
       VALUES (?, ?, ?, ?)`,
      ["New conversation", validPhaseId, validTaskId, storedModel]
    );
    const newSession = await get(
      "SELECT id FROM chat_sessions ORDER BY id DESC LIMIT 1"
    );
    sessionId = (newSession?.id as number | undefined) ?? null;
  }

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Failed to create chat session" }), {
      status: 500,
    });
  }

  // Save user message
  await execute(
    "INSERT INTO chat_messages (session_id, phase_id, task_id, role, content, model) VALUES (?, ?, ?, 'user', ?, ?)",
    [sessionId, validPhaseId, validTaskId, buildStoredUserMessage(visibleMessage, resolvedAttachments), storedModel]
  );
  const userMessageRow = await get("SELECT id FROM chat_messages ORDER BY id DESC LIMIT 1");
  const userMessageId = userMessageRow?.id as number | undefined;

  // Track chat event with topic detection
  const chatTopic = matchTopic(message);
  await trackEvent("chat_question", {
    topic: chatTopic ?? undefined,
    phaseId: validPhaseId || undefined,
    taskId: validTaskId || undefined,
    payload: { hint: visibleMessage.split(/\s+/).slice(0, 3).join(" ") },
  });

  // Get recent history for this session (last 20 messages)
  const history = await query(
    `SELECT id, role, content FROM chat_messages
     WHERE session_id = ?
     ORDER BY created_at DESC LIMIT 20`,
    [sessionId]
  );

  // Reverse to chronological order
  const messages = history.reverse().map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content as string,
    attachments: m.id === userMessageId ? resolvedAttachments : undefined,
  }));

  // Build system prompt with full context
  const systemPrompt = await buildSystemPrompt({ phaseId: validPhaseId ?? undefined, taskId: validTaskId ?? undefined });

  // Create streaming response
  const encoder = new TextEncoder();
  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const generator = streamChat(
          selectedProvider,
          systemPrompt,
          messages,
          selectedModel
        );
        for await (const chunk of generator) {
          fullResponse += chunk;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
          );
        }

        // Save assistant response (including any search follow-up)
        await execute(
          "INSERT INTO chat_messages (session_id, phase_id, task_id, role, content, model) VALUES (?, ?, ?, 'assistant', ?, ?)",
          [sessionId, validPhaseId, validTaskId, fullResponse, storedModel]
        );

        // Summarize session for Unity memory
        try {
          await summarizeSession(sessionId, messages);
        } catch {
          /* non-critical */
        }

        // Auto-generate title from first user message if session title is still default
        const session = await get(
          "SELECT title FROM chat_sessions WHERE id = ?",
          [sessionId]
        );
        if (session?.title === "New conversation") {
          const autoTitle =
            visibleMessage.trim().length > 0
              ? visibleMessage.length > 40
                ? visibleMessage.slice(0, 37) + "..."
                : visibleMessage
              : resolvedAttachments[0]?.name || "New conversation";
          await execute(
            "UPDATE chat_sessions SET title = ?, updated_at = datetime('now') WHERE id = ?",
            [autoTitle, sessionId]
          );
        } else {
          // Just update the timestamp
          await execute(
            "UPDATE chat_sessions SET updated_at = datetime('now') WHERE id = ?",
            [sessionId]
          );
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ session_id: sessionId })}\n\n`
          )
        );
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      } catch (error: unknown) {
        const errMsg =
          error instanceof Error ? error.message : "Stream error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
