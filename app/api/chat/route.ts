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

export async function POST(req: NextRequest) {
  const { message, taskId, phaseId, attachments = [], session_id } =
    await req.json();
  const model = "gpt-5.4";
  const safeAttachments = Array.isArray(attachments) ? (attachments as ChatAttachment[]) : [];
  const visibleMessage = typeof message === "string" ? message : "";
  const resolvedAttachments = await resolveChatAttachments(safeAttachments);

  if (typeof message !== "string" || (visibleMessage.trim().length === 0 && resolvedAttachments.length === 0)) {
    return new Response(JSON.stringify({ error: "Message required" }), {
      status: 400,
    });
  }

  // Resolve or create session
  let sessionId = session_id;
  if (!sessionId) {
    await execute(
      `INSERT INTO chat_sessions (title, phase_id, task_id, model)
       VALUES (?, ?, ?, ?)`,
      ["New conversation", phaseId || null, taskId || null, model]
    );
    const newSession = await get(
      "SELECT id FROM chat_sessions ORDER BY id DESC LIMIT 1"
    );
    sessionId = newSession?.id;
  }

  // Save user message
  await execute(
    "INSERT INTO chat_messages (session_id, phase_id, task_id, role, content, model) VALUES (?, ?, ?, 'user', ?, ?)",
    [sessionId, phaseId || null, taskId || null, buildStoredUserMessage(visibleMessage, resolvedAttachments), model]
  );
  const userMessageRow = await get("SELECT id FROM chat_messages ORDER BY id DESC LIMIT 1");
  const userMessageId = userMessageRow?.id as number | undefined;

  // Track chat event with topic detection
  const chatTopic = matchTopic(message);
  await trackEvent("chat_question", {
    topic: chatTopic ?? undefined,
    phaseId: phaseId || undefined,
    taskId: taskId || undefined,
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
  const systemPrompt = await buildSystemPrompt({ phaseId, taskId });

  // Create streaming response
  const encoder = new TextEncoder();
  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const generator = streamChat(
          systemPrompt,
          messages
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
          [sessionId, phaseId || null, taskId || null, fullResponse, model]
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
