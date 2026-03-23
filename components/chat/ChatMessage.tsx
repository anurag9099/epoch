"use client";
import { Copy, RotateCcw, Pencil, ThumbsUp, ThumbsDown } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { parseDisplayMessage, stripAttachmentContext } from "@/lib/chat-attachments";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  timestamp?: string;
  onEdit?: () => void;
  onRegenerate?: () => void;
}

export function ChatMessage({
  role, content, isStreaming, timestamp, onEdit, onRegenerate,
}: ChatMessageProps) {
  const isUser = role === "user";
  const visibleContent = isUser ? stripAttachmentContext(content) : content;
  const parsedUserMessage = isUser ? parseDisplayMessage(content) : { text: visibleContent, attachments: [] as string[] };

  const handleCopy = () => {
    navigator.clipboard.writeText(visibleContent);
  };

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} animate-fade-in`}>
      {/* Label */}
      <div className={`flex items-center gap-1 mb-1 ${isUser ? "flex-row-reverse" : ""}`}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--text-hint)" }}>
          {isUser ? "You" : "Unity"}
        </span>
      </div>

      {/* Bubble */}
      <div
        style={{
          maxWidth: "88%",
          padding: isUser ? "8px 14px" : "10px 14px",
          fontSize: 13,
          lineHeight: 1.55,
          fontFamily: "var(--font-body)",
          borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
          background: isUser ? "var(--teal)" : "var(--bg-surface)",
          color: isUser ? "#fff" : "var(--text-ink)",
          border: isUser ? "none" : "1px solid var(--border)",
        }}
      >
        {isUser ? (
          <div style={{ display: "grid", gap: parsedUserMessage.attachments.length > 0 ? 10 : 0 }}>
            {parsedUserMessage.text ? (
              <span style={{ whiteSpace: "pre-wrap" }}>{parsedUserMessage.text}</span>
            ) : null}
            {parsedUserMessage.attachments.length > 0 ? (
              <div style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 10, opacity: 0.82, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Attachments
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {parsedUserMessage.attachments.map((attachment) => (
                    <span
                      key={attachment}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 9px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.14)",
                        border: "1px solid rgba(255,255,255,0.18)",
                        fontSize: 11,
                        lineHeight: 1.2,
                      }}
                    >
                      <span style={{ fontSize: 12 }}>📎</span>
                      <span>{attachment}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <MarkdownRenderer content={visibleContent} />
        )}
        {isStreaming && !visibleContent && (
          <div style={{ display: "flex", gap: 4, padding: "4px 0" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: "50%", background: "var(--teal)",
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                opacity: 0.4,
              }} />
            ))}
          </div>
        )}
        {isStreaming && visibleContent && (
          <span style={{ display: "inline-block", width: 2, height: 14, background: "var(--teal)", marginLeft: 2, verticalAlign: "middle" }} className="animate-blink" />
        )}
      </div>

      {/* Action row */}
      {!isStreaming && visibleContent && (
        <div style={{
          display: "flex", alignItems: "center", gap: 2, marginTop: 3,
          opacity: 0.5, transition: "opacity 0.15s",
        }}
        className="hover:!opacity-100 group-hover:opacity-100"
        >
          {isUser && onEdit && (
            <button onClick={onEdit} style={{ display: "flex", alignItems: "center", gap: 3, fontFamily: "var(--font-body)", fontSize: 10, color: "var(--text-hint)", background: "transparent", border: "none", cursor: "pointer", padding: "2px 5px", borderRadius: 3 }}>
              <Pencil style={{ width: 10, height: 10 }} /> Edit
            </button>
          )}
          <button onClick={handleCopy} style={{ display: "flex", alignItems: "center", gap: 3, fontFamily: "var(--font-body)", fontSize: 10, color: "var(--text-hint)", background: "transparent", border: "none", cursor: "pointer", padding: "2px 5px", borderRadius: 3 }}>
            <Copy style={{ width: 10, height: 10 }} /> Copy
          </button>
          {!isUser && onRegenerate && (
            <button onClick={onRegenerate} style={{ display: "flex", alignItems: "center", gap: 3, fontFamily: "var(--font-body)", fontSize: 10, color: "var(--text-hint)", background: "transparent", border: "none", cursor: "pointer", padding: "2px 5px", borderRadius: 3 }}>
              <RotateCcw style={{ width: 10, height: 10 }} /> Retry
            </button>
          )}
          {!isUser && (
            <>
              <div style={{ width: 1, height: 10, background: "var(--border)", margin: "0 2px" }} />
              <button style={{ display: "flex", alignItems: "center", color: "var(--text-hint)", background: "transparent", border: "none", cursor: "pointer", padding: "2px 4px", borderRadius: 3, opacity: 0.5 }}>
                <ThumbsUp style={{ width: 10, height: 10 }} />
              </button>
              <button style={{ display: "flex", alignItems: "center", color: "var(--text-hint)", background: "transparent", border: "none", cursor: "pointer", padding: "2px 4px", borderRadius: 3, opacity: 0.5 }}>
                <ThumbsDown style={{ width: 10, height: 10 }} />
              </button>
            </>
          )}
          {timestamp && (
            <span style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--text-disabled)", marginLeft: 4 }}>
              {timestamp}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
