import { streamOpenAI } from "./openai";
import type { ChatAttachment } from "../chat-attachments";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
}

export function streamChat(provider: "gpt" | "opus", systemPrompt: string, messages: ChatTurn[]): AsyncGenerator<string>;
export function streamChat(systemPrompt: string, messages: ChatTurn[]): AsyncGenerator<string>;
export function streamChat(
  arg1: "gpt" | "opus" | string,
  arg2: string | ChatTurn[],
  arg3?: ChatTurn[]
): AsyncGenerator<string> {
  if (Array.isArray(arg2)) {
    return streamOpenAI(arg1, arg2);
  }
  return streamOpenAI(arg2, arg3 ?? []);
}
