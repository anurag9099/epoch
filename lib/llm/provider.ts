import { streamOpenAI } from "./openai";
import { streamBedrock } from "./bedrock";
import { streamOllama } from "./ollama";
import type { ChatAttachment } from "../chat-attachments";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
}

export type LlmProvider = "openai" | "bedrock" | "ollama";
type LegacyProvider = "gpt" | "opus";

interface StreamChatOptions {
  provider?: LlmProvider | LegacyProvider;
  model?: string;
}

export function streamChat(provider: LlmProvider | LegacyProvider, systemPrompt: string, messages: ChatTurn[], model?: string): AsyncGenerator<string>;
export function streamChat(systemPrompt: string, messages: ChatTurn[]): AsyncGenerator<string>;
export function streamChat(
  arg1: LlmProvider | LegacyProvider | string,
  arg2: string | ChatTurn[],
  arg3?: ChatTurn[],
  arg4?: string
): AsyncGenerator<string> {
  const resolveProvider = (provider?: LlmProvider | LegacyProvider): LlmProvider => {
    if (provider === "gpt") return "openai";
    if (provider === "opus") return "bedrock";
    if (provider === "openai" || provider === "bedrock" || provider === "ollama") return provider;

    const envProvider = (process.env.LLM_PROVIDER || "openai").toLowerCase();
    if (envProvider === "bedrock" || envProvider === "ollama") return envProvider;
    return "openai";
  };

  const runWithOptions = (
    systemPrompt: string,
    messages: ChatTurn[],
    options: StreamChatOptions = {}
  ) => {
    const provider = resolveProvider(options.provider);
    const model = options.model || process.env.LLM_MODEL;

    if (provider === "bedrock") {
      return streamBedrock(systemPrompt, messages, model);
    }
    if (provider === "ollama") {
      return streamOllama(systemPrompt, messages, model);
    }
    return streamOpenAI(systemPrompt, messages, model);
  };

  if (Array.isArray(arg2)) {
    return runWithOptions(arg1, arg2);
  }
  return runWithOptions(arg2, arg3 ?? [], { provider: arg1 as LlmProvider | LegacyProvider, model: arg4 });
}
