export interface ChatAttachment {
  name: string;
  type: string;
  size: number;
  content: string;
}

const HIDDEN_ATTACHMENT_BLOCK_START = "\n\n<epoch_attachment_context>";
const HIDDEN_ATTACHMENT_BLOCK_END = "\n</epoch_attachment_context>";
const TOTAL_TEXT_ATTACHMENT_LIMIT = 60000;
const MIN_TEXT_ATTACHMENT_LIMIT = 8000;

function normalizeText(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function isImageAttachment(attachment: ChatAttachment) {
  return attachment.type.startsWith("image/");
}

function textAttachments(attachments: ChatAttachment[]) {
  return attachments.filter((attachment) => !isImageAttachment(attachment));
}

export function summarizeAttachments(attachments: ChatAttachment[]) {
  if (!attachments.length) return "";
  return attachments
    .map((attachment) => `- ${attachment.name} · ${formatSize(attachment.size)}`)
    .join("\n");
}

export function buildDisplayMessage(text: string, attachments: ChatAttachment[] = []) {
  const trimmed = normalizeText(text);
  if (!attachments.length) return trimmed;

  const summary = summarizeAttachments(attachments);
  if (!summary) return trimmed;

  if (!trimmed) {
    return `Attachments:\n${summary}`;
  }

  return `${trimmed}\n\nAttachments:\n${summary}`;
}

export function buildStoredUserMessage(text: string, attachments: ChatAttachment[] = []) {
  const display = buildDisplayMessage(text, attachments);
  const attachedText = textAttachments(attachments);
  if (!attachedText.length) return display;

  const perAttachmentLimit = Math.max(
    MIN_TEXT_ATTACHMENT_LIMIT,
    Math.floor(TOTAL_TEXT_ATTACHMENT_LIMIT / attachedText.length)
  );

  const hiddenContext = attachedText
    .map((attachment) => {
      const normalized = normalizeText(attachment.content);
      const content = normalized.slice(0, perAttachmentLimit);
      const truncated = normalized.length > perAttachmentLimit ? "\n[truncated]" : "";
      return `FILE: ${attachment.name}\nTYPE: ${attachment.type || "text/plain"}\nCONTENT:\n${content}${truncated}`;
    })
    .join("\n\n---\n\n");

  return `${display}${HIDDEN_ATTACHMENT_BLOCK_START}\n${hiddenContext}${HIDDEN_ATTACHMENT_BLOCK_END}`;
}

export function stripAttachmentContext(content: string) {
  return content.replace(
    new RegExp(`${HIDDEN_ATTACHMENT_BLOCK_START}[\\s\\S]*?${HIDDEN_ATTACHMENT_BLOCK_END}`, "g"),
    ""
  ).trim();
}

export function parseDisplayMessage(content: string) {
  const visible = stripAttachmentContext(content);
  const attachmentMarker = "\n\nAttachments:\n";
  const attachmentOnlyMarker = "Attachments:\n";

  if (visible.startsWith(attachmentOnlyMarker)) {
    return {
      text: "",
      attachments: visible
        .slice(attachmentOnlyMarker.length)
        .split("\n")
        .map((line) => line.replace(/^- /, "").trim())
        .filter(Boolean),
    };
  }

  if (!visible.includes(attachmentMarker)) {
    return { text: visible, attachments: [] as string[] };
  }

  const [text, attachmentLines] = visible.split(attachmentMarker);
  return {
    text: text.trim(),
    attachments: attachmentLines
      .split("\n")
      .map((line) => line.replace(/^- /, "").trim())
      .filter(Boolean),
  };
}

export function buildModelTextContext(text: string, attachments: ChatAttachment[] = []) {
  return buildStoredUserMessage(text, attachments);
}

export function buildImageAttachments(attachments: ChatAttachment[] = []) {
  return attachments.filter((attachment) => isImageAttachment(attachment) && attachment.content.startsWith("data:"));
}
