import OpenAI from "openai";
import { buildImageAttachments, buildModelTextContext } from "@/lib/chat-attachments";
import type { ChatTurn } from "./provider";

let client: OpenAI | null = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return client;
}

export async function* streamOpenAI(
  systemPrompt: string,
  messages: ChatTurn[]
): AsyncGenerator<string> {
  const requestMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((message) => {
      if (message.role !== "user" || !message.attachments?.length) {
        return {
          role: message.role as "user" | "assistant",
          content: message.content,
        };
      }

      const parts: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      > = [];
      const textContext = buildModelTextContext(message.content, message.attachments);
      if (textContext.trim()) {
        parts.push({ type: "text", text: textContext });
      }

      for (const attachment of buildImageAttachments(message.attachments)) {
        parts.push({
          type: "image_url",
          image_url: { url: attachment.content },
        });
      }

      return {
        role: "user" as const,
        content: parts.length > 0 ? parts : message.content,
      };
    }),
  ];

  const stream = await getClient().chat.completions.create({
    model: "gpt-5.4",
    stream: true,
    messages: requestMessages as never,
    max_completion_tokens: 4096,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) yield text;
  }
}
