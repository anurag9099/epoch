import "server-only";

import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { promisify } from "node:util";

import type { ChatAttachment } from "@/lib/chat-attachments";

const execFileAsync = promisify(execFile);
const UNSUPPORTED_NOTE =
  "Attachment uploaded, but Unity could not extract readable text from it. Ask the learner to paste the relevant section or use web search on the exact topic.";
const EMPTY_EXTRACT_NOTE =
  "Attachment uploaded, but no readable text could be extracted. If this file is scanned, image-based, or mostly visual, paste the key section manually.";
const OFFICE_DOCUMENT_EXTENSIONS = new Set([".pdf", ".docx", ".pptx", ".xlsx"]);
const TEXTISH_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".cpp",
  ".css",
  ".csv",
  ".go",
  ".html",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".py",
  ".rb",
  ".rs",
  ".sh",
  ".sql",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);

function getExtension(name: string) {
  return extname(name).toLowerCase();
}

function isImageAttachment(attachment: ChatAttachment) {
  return attachment.type.startsWith("image/");
}

function normalizeWhitespace(value: string) {
  return value
    .replace(/\u0000/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(parseInt(dec, 10))
    );
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+)?(?:;(base64))?,([\s\S]*)$/);
  if (!match) return null;

  const mimeType = match[1] ?? "";
  const encoded = match[3] ?? "";
  const buffer = match[2] === "base64"
    ? Buffer.from(encoded, "base64")
    : Buffer.from(decodeURIComponent(encoded), "utf8");

  return { mimeType, buffer };
}

function decodeUtf8Attachment(content: string) {
  const parsed = parseDataUrl(content);
  if (!parsed) return normalizeWhitespace(content);
  return normalizeWhitespace(parsed.buffer.toString("utf8"));
}

function isLikelyTextAttachment(attachment: ChatAttachment) {
  const extension = getExtension(attachment.name);
  return (
    TEXTISH_EXTENSIONS.has(extension) ||
    attachment.type.startsWith("text/") ||
    attachment.type.includes("json") ||
    attachment.type.includes("javascript") ||
    attachment.type.includes("typescript") ||
    attachment.type.includes("xml") ||
    attachment.type.includes("yaml")
  );
}

async function withTempFile<T>(buffer: Buffer, ext: string, fn: (filePath: string) => Promise<T>) {
  const dir = await mkdtemp(join(tmpdir(), "epoch-attachment-"));
  const filePath = join(dir, `source${ext || ".bin"}`);
  await writeFile(filePath, buffer);
  try {
    return await fn(filePath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function listZipEntries(filePath: string) {
  const { stdout } = await execFileAsync("unzip", ["-Z1", filePath], { maxBuffer: 8 * 1024 * 1024 });
  return stdout
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function readZipEntry(filePath: string, entry: string) {
  const { stdout } = await execFileAsync("unzip", ["-p", filePath, entry], { maxBuffer: 8 * 1024 * 1024 });
  return stdout;
}

function sortNumberedEntries(entries: string[]) {
  return [...entries].sort((a, b) => {
    const aNum = Number((a.match(/(\d+)(?=\.xml$)/)?.[1] ?? "0"));
    const bNum = Number((b.match(/(\d+)(?=\.xml$)/)?.[1] ?? "0"));
    return aNum - bNum || a.localeCompare(b);
  });
}

function extractWordXmlText(xml: string) {
  return normalizeWhitespace(
    decodeXmlEntities(
      xml
        .replace(/<w:tab\/>/g, "\t")
        .replace(/<w:br\/>/g, "\n")
        .replace(/<w:cr\/>/g, "\n")
        .replace(/<\/w:p>/g, "\n")
        .replace(/<\/w:tr>/g, "\n")
        .replace(/<[^>]+>/g, " ")
    )
  );
}

function extractSlideXmlText(xml: string) {
  return normalizeWhitespace(
    decodeXmlEntities(
      xml
        .replace(/<a:br\/>/g, "\n")
        .replace(/<\/a:p>/g, "\n")
        .replace(/<[^>]+>/g, " ")
    )
  );
}

function extractTextRuns(xml: string) {
  const runs = Array.from(xml.matchAll(/<t(?:\s+xml:space="preserve")?>([\s\S]*?)<\/t>/g));
  if (runs.length === 0) return "";
  return normalizeWhitespace(decodeXmlEntities(runs.map((run) => run[1]).join(" ")));
}

function parseSharedStrings(xml: string) {
  const entries = Array.from(xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g));
  return entries.map((entry) => extractTextRuns(entry[1]));
}

function extractSheetText(xml: string, sharedStrings: string[]) {
  const rows = Array.from(xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g));
  const renderedRows: string[] = [];

  for (const row of rows) {
    const cells = Array.from(row[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g));
    const renderedCells: string[] = [];

    for (const cell of cells) {
      const attrs = cell[1];
      const body = cell[2];
      const ref = attrs.match(/r="([^"]+)"/)?.[1] ?? "";
      const cellType = attrs.match(/t="([^"]+)"/)?.[1] ?? "";

      let value = "";
      if (cellType === "s") {
        const index = Number(body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "-1");
        value = sharedStrings[index] ?? "";
      } else if (cellType === "inlineStr") {
        value = extractTextRuns(body);
      } else if (cellType === "b") {
        const boolValue = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
        value = boolValue === "1" ? "TRUE" : "FALSE";
      } else {
        value = normalizeWhitespace(
          decodeXmlEntities(
            (body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "") ||
              extractTextRuns(body)
          )
        );
      }

      if (!value) continue;
      renderedCells.push(ref ? `${ref}: ${value}` : value);
    }

    if (renderedCells.length > 0) {
      renderedRows.push(renderedCells.join(" | "));
    }
  }

  return normalizeWhitespace(renderedRows.join("\n"));
}

async function extractPdfText(buffer: Buffer, ext: string) {
  return withTempFile(buffer, ext, async (filePath) => {
    const { stdout } = await execFileAsync(
      "pdftotext",
      ["-enc", "UTF-8", "-nopgbrk", filePath, "-"],
      { maxBuffer: 12 * 1024 * 1024 }
    );
    return normalizeWhitespace(stdout);
  });
}

async function extractDocxText(buffer: Buffer, ext: string) {
  return withTempFile(buffer, ext, async (filePath) => {
    const entries = await listZipEntries(filePath);
    const docEntries = entries.filter((entry) =>
      /^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/.test(entry)
    );

    const parts: string[] = [];
    for (const entry of docEntries) {
      const xml = await readZipEntry(filePath, entry);
      const text = extractWordXmlText(xml);
      if (!text) continue;
      if (entry === "word/document.xml") {
        parts.push(text);
      } else {
        const label = entry
          .replace(/^word\//, "")
          .replace(/\.xml$/, "")
          .replace(/(\D)(\d+)/g, "$1 $2");
        parts.push(`${label}\n${text}`);
      }
    }

    return normalizeWhitespace(parts.join("\n\n"));
  });
}

async function extractPptxText(buffer: Buffer, ext: string) {
  return withTempFile(buffer, ext, async (filePath) => {
    const entries = await listZipEntries(filePath);
    const slides = sortNumberedEntries(
      entries.filter((entry) => /^ppt\/slides\/slide\d+\.xml$/.test(entry))
    );

    const parts: string[] = [];
    for (const slide of slides) {
      const xml = await readZipEntry(filePath, slide);
      const text = extractSlideXmlText(xml);
      if (!text) continue;
      const slideNumber = slide.match(/slide(\d+)\.xml$/)?.[1] ?? "?";
      parts.push(`Slide ${slideNumber}\n${text}`);
    }

    return normalizeWhitespace(parts.join("\n\n"));
  });
}

async function extractXlsxText(buffer: Buffer, ext: string) {
  return withTempFile(buffer, ext, async (filePath) => {
    const entries = await listZipEntries(filePath);
    const sharedStringsEntry = entries.find((entry) => entry === "xl/sharedStrings.xml");
    const sharedStrings = sharedStringsEntry
      ? parseSharedStrings(await readZipEntry(filePath, sharedStringsEntry))
      : [];

    const sheets = sortNumberedEntries(
      entries.filter((entry) => /^xl\/worksheets\/sheet\d+\.xml$/.test(entry))
    );

    const parts: string[] = [];
    for (const sheet of sheets) {
      const xml = await readZipEntry(filePath, sheet);
      const text = extractSheetText(xml, sharedStrings);
      if (!text) continue;
      const sheetNumber = sheet.match(/sheet(\d+)\.xml$/)?.[1] ?? "?";
      parts.push(`Sheet ${sheetNumber}\n${text}`);
    }

    return normalizeWhitespace(parts.join("\n\n"));
  });
}

async function extractBinaryDocumentText(attachment: ChatAttachment) {
  const parsed = parseDataUrl(attachment.content);
  if (!parsed) return "";

  const extension = getExtension(attachment.name);
  switch (extension) {
    case ".pdf":
      return extractPdfText(parsed.buffer, extension);
    case ".docx":
      return extractDocxText(parsed.buffer, extension);
    case ".pptx":
      return extractPptxText(parsed.buffer, extension);
    case ".xlsx":
      return extractXlsxText(parsed.buffer, extension);
    default:
      return decodeUtf8Attachment(attachment.content);
  }
}

export async function resolveChatAttachments(attachments: ChatAttachment[]) {
  return Promise.all(
    attachments.map(async (attachment) => {
      if (isImageAttachment(attachment)) return attachment;

      try {
        const extension = getExtension(attachment.name);
        const content = attachment.content.startsWith("data:")
          ? OFFICE_DOCUMENT_EXTENSIONS.has(extension)
            ? await extractBinaryDocumentText(attachment)
            : isLikelyTextAttachment(attachment)
              ? decodeUtf8Attachment(attachment.content)
              : UNSUPPORTED_NOTE
          : normalizeWhitespace(attachment.content);

        return {
          ...attachment,
          content: content || (OFFICE_DOCUMENT_EXTENSIONS.has(extension) ? EMPTY_EXTRACT_NOTE : UNSUPPORTED_NOTE),
        };
      } catch {
        return {
          ...attachment,
          content: UNSUPPORTED_NOTE,
        };
      }
    })
  );
}
