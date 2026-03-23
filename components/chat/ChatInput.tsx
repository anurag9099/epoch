"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import NextImage from "next/image";
import { ArrowUp, Paperclip, ImageIcon, Globe, X } from "lucide-react";
import type { ChatAttachment } from "@/lib/chat-attachments";

export type Attachment = ChatAttachment;

interface ChatInputProps {
  onSend: (message: string, attachments?: Attachment[]) => void;
  disabled?: boolean;
  initialValue?: string;
  onValueChange?: (value: string) => void;
  onWebSearch?: (query: string) => void;
}

const MAX_ATTACHMENTS = 4;
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const TEXT_FILE_EXTENSIONS = new Set([
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
const OFFICE_DOCUMENT_EXTENSIONS = new Set([".pdf", ".docx", ".pptx", ".xlsx"]);

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx).toLowerCase() : "";
}

function getFileIcon(type: string, name: string): string {
  const ext = getExtension(name);
  if (type.startsWith("image/")) return "🖼";
  if (type.includes("python") || ext === ".py") return "🐍";
  if (type.includes("json")) return "{}";
  if (type.includes("csv")) return "📊";
  if (ext === ".docx") return "📝";
  if (ext === ".pptx") return "📽";
  if (ext === ".xlsx") return "📈";
  if (type.includes("pdf") || ext === ".pdf") return "📄";
  return "📎";
}

function shouldReadAsText(file: File, isImage: boolean) {
  if (isImage || file.type.startsWith("image/")) return false;

  const ext = getExtension(file.name);
  if (OFFICE_DOCUMENT_EXTENSIONS.has(ext)) return false;

  return (
    file.type.startsWith("text/") ||
    file.type.includes("json") ||
    file.type.includes("javascript") ||
    file.type.includes("typescript") ||
    file.type.includes("xml") ||
    file.type.includes("yaml") ||
    TEXT_FILE_EXTENSIONS.has(ext)
  );
}

export function ChatInput({ onSend, disabled, initialValue, onValueChange, onWebSearch }: ChatInputProps) {
  const [value, setValue] = useState(initialValue || "");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (initialValue !== undefined) setValue(initialValue);
  }, [initialValue]);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 40), 120)}px`;
  }, []);

  useEffect(() => { adjustHeight(); }, [value, adjustHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    onValueChange?.(e.target.value);
  };

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || disabled) return;
    onSend(trimmed, attachments.length > 0 ? attachments : undefined);
    setValue("");
    setAttachments([]);
    setUploadError(null);
    onValueChange?.("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [value, attachments, disabled, onSend, onValueChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle paste for images
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        if (attachments.length >= MAX_ATTACHMENTS) {
          setUploadError(`Unity supports up to ${MAX_ATTACHMENTS} attachments at once.`);
          return;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          setUploadError(`${file.name} is too large. Keep files under 25MB.`);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          setUploadError(null);
          setAttachments(prev => [...prev, {
            name: `screenshot-${Date.now()}.png`,
            type: file.type,
            size: file.size,
            content: reader.result as string,
          }]);
        };
        reader.readAsDataURL(file);
      }
    }
  }, [attachments.length]);

  const readFiles = useCallback((files: FileList | File[], isImage: boolean) => {
    if (!files) return;
    setUploadError(null);

    const availableSlots = MAX_ATTACHMENTS - attachments.length;
    if (availableSlots <= 0) {
      setUploadError(`Unity supports up to ${MAX_ATTACHMENTS} attachments at once.`);
      return;
    }

    for (const file of Array.from(files).slice(0, availableSlots)) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploadError(`${file.name} is too large. Keep files under 25MB.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [...prev, {
          name: file.name,
          type: file.type || (isImage ? "image/png" : "text/plain"),
          size: file.size,
          content: reader.result as string,
        }]);
      };
      if (!shouldReadAsText(file, isImage)) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    }
  }, [attachments.length]);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, isImage: boolean) => {
    const files = e.target.files;
    if (!files) return;
    readFiles(files, isImage);
    e.target.value = "";
  }, [readFiles]);

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const clearAttachments = () => {
    setAttachments([]);
    setUploadError(null);
  };

  const handleWebSearch = () => {
    if (searchQuery.trim() && onWebSearch) {
      onWebSearch(searchQuery.trim());
      setSearchQuery("");
      setShowSearchInput(false);
    }
  };

  const canSend = (value.trim().length > 0 || attachments.length > 0) && !disabled;
  const charCount = value.length;

  return (
    <div style={{
      padding: "8px 12px 10px",
      borderTop: "1px solid var(--border)",
      flexShrink: 0,
      background: "var(--bg-surface)",
    }}>
      {uploadError ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 8,
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid rgba(196, 92, 42, 0.22)",
            background: "var(--rust-dim)",
            color: "var(--rust)",
            fontFamily: "var(--font-body)",
            fontSize: 11,
          }}
        >
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            style={{ border: "none", background: "transparent", color: "inherit", cursor: "pointer", padding: 0 }}
            aria-label="Dismiss attachment error"
          >
            <X style={{ width: 12, height: 12 }} />
          </button>
        </div>
      ) : null}

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-hint)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Attachments
            </span>
            <button
              type="button"
              onClick={clearAttachments}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--text-hint)",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontSize: 11,
                padding: 0,
              }}
            >
              Clear all
            </button>
          </div>
          {attachments.map((att, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--bg-page)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "6px 10px",
            }}>
              {att.type.startsWith("image/") ? (
                <NextImage
                  src={att.content}
                  alt={att.name}
                  width={32}
                  height={32}
                  unoptimized
                  style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                />
              ) : (
                <span style={{ fontSize: 14 }}>{getFileIcon(att.type, att.name)}</span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {att.name}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-hint)" }}>
                  {formatSize(att.size)}
                </div>
              </div>
              <button onClick={() => removeAttachment(i)} style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 20, height: 20, borderRadius: 4, border: "none",
                background: "transparent", color: "var(--text-hint)", cursor: "pointer",
              }}>
                <X style={{ width: 12, height: 12 }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Web search input (shown when search button clicked) */}
      {showSearchInput && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
          background: "var(--bg-page)", border: "1px solid var(--teal)",
          borderRadius: 8, padding: "4px 8px",
        }}>
          <Globe style={{ width: 12, height: 12, color: "var(--teal)", flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleWebSearch(); if (e.key === "Escape") setShowSearchInput(false); }}
            placeholder="Search the web..."
            autoFocus
            style={{
              flex: 1, border: "none", background: "transparent", outline: "none",
              fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-ink)",
            }}
          />
          <button onClick={handleWebSearch} style={{
            fontFamily: "var(--font-body)", fontSize: 10, color: "var(--teal)",
            background: "transparent", border: "none", cursor: "pointer", padding: "2px 6px",
          }}>Search</button>
          <button onClick={() => setShowSearchInput(false)} style={{
            color: "var(--text-hint)", background: "transparent", border: "none", cursor: "pointer",
          }}>
            <X style={{ width: 12, height: 12 }} />
          </button>
        </div>
      )}

      {/* Input container */}
      <div style={{
        borderRadius: 10,
        border: `1px solid ${isDragging ? "var(--teal)" : focused ? "var(--teal)" : "var(--border)"}`,
        background: "var(--bg-page)",
        transition: "border-color 0.15s",
        overflow: "hidden",
        boxShadow: isDragging ? "0 0 0 3px rgba(42, 124, 111, 0.08)" : "none",
      }}>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files?.length) {
              readFiles(e.dataTransfer.files, false);
            }
          }}
        >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onPaste={handlePaste}
          disabled={disabled}
          placeholder="Ask Unity..."
          rows={2}
          style={{
            display: "block", width: "100%", minHeight: 40, maxHeight: 120,
            padding: "8px 12px 4px", fontSize: 13, fontFamily: "var(--font-body)",
            color: "var(--text-ink)", background: "transparent", border: "none",
            resize: "none", outline: "none", lineHeight: 1.5,
          }}
        />
        </div>

        {/* Bottom toolbar */}
        <div style={{
          display: "flex", alignItems: "center", padding: "2px 8px 6px", gap: 2,
        }}>
          {/* Tool buttons — left side */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach file (.py, .txt, .json, .csv, .md, .pdf, .docx, .pptx, .xlsx)"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: 6, border: "none",
              background: "transparent", color: "var(--text-hint)", cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-sunken)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-hint)"; }}
          >
            <Paperclip style={{ width: 14, height: 14 }} />
          </button>

          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            title="Attach image or screenshot"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: 6, border: "none",
              background: "transparent", color: "var(--text-hint)", cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-sunken)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-hint)"; }}
          >
            <ImageIcon style={{ width: 14, height: 14 }} />
          </button>

          <button
            type="button"
            onClick={() => setShowSearchInput(!showSearchInput)}
            title="Search the web"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: 6, border: "none",
              background: showSearchInput ? "var(--teal-dim)" : "transparent",
              color: showSearchInput ? "var(--teal)" : "var(--text-hint)",
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { if (!showSearchInput) { e.currentTarget.style.background = "var(--bg-sunken)"; e.currentTarget.style.color = "var(--text-muted)"; } }}
            onMouseLeave={(e) => { if (!showSearchInput) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-hint)"; } }}
          >
            <Globe style={{ width: 14, height: 14 }} />
          </button>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Character count */}
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-disabled)",
            opacity: charCount > 0 ? 1 : 0, transition: "opacity 0.15s", marginRight: 4,
          }}>
            {charCount}
          </span>
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 10,
              color: "var(--text-disabled)",
              marginRight: 6,
            }}
          >
            Shift+Enter for newline
          </span>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: canSend ? "var(--teal)" : "var(--bg-sunken)",
              color: canSend ? "#fff" : "var(--text-disabled)",
              border: "none", cursor: canSend ? "pointer" : "not-allowed",
              transition: "background 0.15s",
            }}
            aria-label="Send message"
          >
            <ArrowUp style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".py,.txt,.csv,.json,.md,.pdf,.docx,.pptx,.xlsx"
        multiple
        onChange={(e) => handleFileSelect(e, false)}
        style={{ display: "none" }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileSelect(e, true)}
        style={{ display: "none" }}
      />
    </div>
  );
}
