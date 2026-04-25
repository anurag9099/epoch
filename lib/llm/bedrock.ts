import {
  BedrockRuntimeClient,
  ConverseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";
import type { ChatTurn } from "./provider";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  // Credentials: auto-resolved from environment
  // SSO login → picks up from ~/.aws/sso/cache
  // EC2 instance → picks up from instance profile
  // Explicit → set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY
  ...(process.env.AWS_ACCESS_KEY_ID
    ? {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      }
    : {}),
});

export async function* streamBedrock(
  systemPrompt: string,
  messages: ChatTurn[],
  model = process.env.BEDROCK_MODEL_ID || process.env.LLM_MODEL || "anthropic.claude-sonnet-4-6"
): AsyncGenerator<string> {
  const command = new ConverseStreamCommand({
    modelId: model,
    system: [{ text: systemPrompt }],
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: [{ text: m.content }],
    })),
    inferenceConfig: {
      maxTokens: 4096,
      temperature: 0.7,
    },
  });

  const response = await client.send(command);

  if (response.stream) {
    for await (const event of response.stream) {
      if (event.contentBlockDelta?.delta?.text) {
        yield event.contentBlockDelta.delta.text;
      }
    }
  }
}
