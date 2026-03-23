"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ChevronDown, Compass, ExternalLink, MessageSquare, PenSquare, Plus, PanelRightClose, PanelRightOpen } from "lucide-react";
import { ExpandIcon } from "./ExpandIcon";
import { UnityLogo } from "./UnityLogo";
import { ChatMessage } from "./ChatMessage";
import { ChatInput, Attachment } from "./ChatInput";
import { buildDisplayMessage, stripAttachmentContext } from "@/lib/chat-attachments";

interface Message {
  id?: number;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  created_at?: string;
}

interface Session {
  id: number;
  title: string;
  message_count?: number;
  updated_at?: string;
}

interface ContextInfo {
  taskId?: string;
  phaseId?: string;
  taskType?: string;
}

function parseContext(pathname: string): ContextInfo {
  const taskMatch = pathname.match(/^\/(learn|lab|quiz)\/(\d+)/);
  if (taskMatch) return { taskId: taskMatch[2], taskType: taskMatch[1] };
  const phaseMatch = pathname.match(/^\/phases\/(\d+)/);
  if (phaseMatch) return { phaseId: phaseMatch[1] };
  return {};
}

interface Prompt {
  icon: string;
  label: string;
  message: string;
  description?: string;
}

interface UnityContext {
  currentDay: number;
  mission: {
    id: number;
    title: string;
    type: string;
    route: string;
    stageLabel: string;
    specializationLabel: string;
    phaseName: string | null;
  } | null;
  focus: {
    focus: string;
    summary: string;
    signalLines: string[];
  };
  signals: Array<{
    signalType: string;
    topic: string;
    label: string;
    topicLabel: string;
    evidence: string;
    confidence: number;
    href: string | null;
  }>;
  nudge: {
    type: string;
    message: string;
    urgency: "low" | "medium" | "high";
    cta?: { label: string; href: string };
  } | null;
  tools: {
    webSearchEnabled: boolean;
  };
}

function getSuggestedPrompts(pathname: string, taskType?: string, unityContext?: UnityContext | null): Prompt[] {
  const missionTitle = unityContext?.mission?.title;
  if (pathname.startsWith("/quiz")) return [
    {
      icon: "\u{1F4A1}",
      label: "Explain that question",
      message: "Can you explain the concept behind the last question I got wrong?",
      description: "Tighten the exact weak concept before moving on.",
    },
    {
      icon: "\u{1F504}",
      label: "Recover this concept",
      message: "I'm struggling with this topic. Can you break it down step by step and connect it to my current path?",
      description: "Stay on the weak point instead of broadening out.",
    },
  ];
  if (taskType === "learn" || pathname.startsWith("/learn")) return [
    {
      icon: "\u{1F4D6}",
      label: "Explain this concept",
      message: "Explain the key concept being discussed here and tie it to my current mission.",
      description: "Ground the theory in the active mission.",
    },
    {
      icon: "\u{270D}\u{FE0F}",
      label: "Key takeaways",
      message: "What are the 3 most important takeaways I should remember for my path?",
      description: "Compress the material to what matters now.",
    },
    {
      icon: "\u{1F9E0}",
      label: "Quiz me on this",
      message: "Give me 3 quick questions to test my understanding of this material.",
      description: "Check understanding before moving on.",
    },
  ];
  if (taskType === "lab" || pathname.startsWith("/lab")) return [
    {
      icon: "\u{1F527}",
      label: "Help me debug",
      message: "I'm stuck on this lab. Help me troubleshoot the exact blocker without solving the whole thing for me.",
      description: "Use Unity to unblock, not to outsource the lab.",
    },
    {
      icon: "\u{1F4CA}",
      label: "Check my results",
      message: "Are my lab results reasonable? What should I expect and what looks suspicious?",
      description: "Sanity-check the output before you move on.",
    },
    {
      icon: "\u{1F9FE}",
      label: "Turn into proof",
      message: `How do I turn ${missionTitle ?? "this lab"} into visible capability proof?`,
      description: "Keep the work connected to evidence.",
    },
  ];
  return [
    {
      icon: "\u{1F3AF}",
      label: "Plan next block",
      message: missionTitle
        ? `I am on "${missionTitle}". What is the next 20-minute block I should do?`
        : "Based on my progress, what should I prioritize today?",
      description: "Get one bounded next move.",
    },
    {
      icon: "\u{1F9FE}",
      label: "Turn into proof",
      message: missionTitle
        ? `How do I convert "${missionTitle}" into visible capability proof?`
        : "How do I turn my current work into visible capability?",
      description: "Stay outcome-driven, not just activity-driven.",
    },
    {
      icon: "\u{1F4A1}",
      label: "Explain a concept",
      message: "I want to understand a concept better, but keep it tied to my current path.",
      description: "Learn the concept without drifting off-path.",
    },
  ];
}

function formatTime(iso?: string): string {
  if (!iso) return "";
  try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

function formatSessionDate(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch { return ""; }
}

function getLocalStorageKey(pathname: string) {
  return `epoch_unity_${pathname}`;
}

interface UnityHeaderStatus {
  text: string;
  color: string;
  detail?: string;
  action?: { label: string; href: string };
}

interface PanelFrame {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function ChatPanel({ mode = "both" }: { mode?: "both" | "desktop" | "mobile" }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [overlayClosing, setOverlayClosing] = useState(false);
  const [overlayFrame, setOverlayFrame] = useState<PanelFrame | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [contextInfo, setContextInfo] = useState<ContextInfo>({});
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [showSessionList, setShowSessionList] = useState(false);
  const [activeSessionTitle, setActiveSessionTitle] = useState("New conversation");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [restoredSession, setRestoredSession] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [unityContext, setUnityContext] = useState<UnityContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionListRef = useRef<HTMLDivElement>(null);
  const desktopSlotRef = useRef<HTMLDivElement>(null);
  const overlayAnimationFrameRef = useRef<number | null>(null);
  const showDesktop = mode === "both" || mode === "desktop";
  const showMobile = mode === "both" || mode === "mobile";
  const isLabRoute = pathname.startsWith("/lab/");
  const overlayActive = expanded || overlayClosing;
  const forcedRail = showDesktop && viewportWidth > 0 && viewportWidth < 1240 && !isLabRoute;
  const effectiveDesktopCollapsed = desktopCollapsed || forcedRail;
  const desktopPanelWidth =
    viewportWidth >= 1880
      ? 360
      : viewportWidth >= 1680
        ? 332
        : viewportWidth >= 1480
          ? 308
          : viewportWidth >= 1280
            ? 284
            : 272;

  useEffect(() => {
    if (!showDesktop || typeof window === "undefined") return;

    const updateViewportWidth = () => setViewportWidth(window.innerWidth);
    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);
    return () => window.removeEventListener("resize", updateViewportWidth);
  }, [showDesktop]);

  useEffect(() => {
    if (!showDesktop || typeof document === "undefined") return;
    const root = document.documentElement;
    const nextWidth = (() => {
      if (isLabRoute) return "0px";
      if (effectiveDesktopCollapsed) return "88px";
      return `${desktopPanelWidth}px`;
    })();
    root.style.setProperty("--unity-panel-width", nextWidth);
    return () => {
      root.style.setProperty("--unity-panel-width", "600px");
    };
  }, [desktopPanelWidth, effectiveDesktopCollapsed, isLabRoute, pathname, showDesktop, viewportWidth]);

  const clearOverlayAnimationFrame = useCallback(() => {
    if (overlayAnimationFrameRef.current !== null) {
      cancelAnimationFrame(overlayAnimationFrameRef.current);
      overlayAnimationFrameRef.current = null;
    }
  }, []);

  const getExpandedFrame = useCallback((): PanelFrame | null => {
    if (typeof window === "undefined") return null;
    const width = Math.min(760, window.innerWidth - 56);
    const height = Math.min(Math.round(window.innerHeight * 0.92), window.innerHeight - 36);
    const top = Math.max(18, Math.round(window.innerHeight * 0.04));
    const left = Math.round((window.innerWidth - width) / 2);
    return { top, left, width, height };
  }, []);

  const getDockedFrame = useCallback((): PanelFrame | null => {
    const rect = desktopSlotRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  }, []);

  const scheduleOverlayFrame = useCallback((nextFrame: PanelFrame) => {
    clearOverlayAnimationFrame();
    overlayAnimationFrameRef.current = requestAnimationFrame(() => {
      overlayAnimationFrameRef.current = requestAnimationFrame(() => {
        setOverlayFrame(nextFrame);
        overlayAnimationFrameRef.current = null;
      });
    });
  }, [clearOverlayAnimationFrame]);

  const openExpandedPanel = useCallback(() => {
    const sourceFrame = getDockedFrame();
    const targetFrame = getExpandedFrame();

    setOverlayClosing(false);
    setExpanded(true);

    if (!targetFrame) {
      setOverlayFrame(null);
      return;
    }

    if (sourceFrame) {
      setOverlayFrame(sourceFrame);
      scheduleOverlayFrame(targetFrame);
      return;
    }

    setOverlayFrame(targetFrame);
  }, [getDockedFrame, getExpandedFrame, scheduleOverlayFrame]);

  const closeExpandedPanel = useCallback(() => {
    const sourceFrame = getDockedFrame();

    if (!sourceFrame) {
      clearOverlayAnimationFrame();
      setOverlayClosing(false);
      setExpanded(false);
      setOverlayFrame(null);
      return;
    }

    setOverlayClosing(true);
    setOverlayFrame((currentFrame) => currentFrame ?? getExpandedFrame());
    scheduleOverlayFrame(sourceFrame);
  }, [clearOverlayAnimationFrame, getDockedFrame, getExpandedFrame, scheduleOverlayFrame]);

  useEffect(() => {
    return () => clearOverlayAnimationFrame();
  }, [clearOverlayAnimationFrame]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showSessionList) return;
    const handler = (e: MouseEvent) => {
      if (sessionListRef.current && !sessionListRef.current.contains(e.target as Node)) {
        setShowSessionList(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSessionList]);

  // Update context on navigation (but don't reset chat)
  useEffect(() => {
    setContextInfo(parseContext(pathname));
    setExpanded(false);
    setOverlayClosing(false);
    setOverlayFrame(null);
    setShowSessionList(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    const fetchUnityContext = async () => {
      try {
        const res = await fetch("/api/unity/context");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setUnityContext(data);
      } catch {
        if (!cancelled) setUnityContext(null);
      }
    };

    fetchUnityContext();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // localStorage persistence — save messages on change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const key = getLocalStorageKey(pathname);
        const toSave = messages.map(m => ({ ...m, isStreaming: false }));
        localStorage.setItem(key, JSON.stringify(toSave));
      } catch { /* ignore */ }
    }
  }, [messages, pathname]);

  // Create session ONLY on first mount, not on every navigation
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Try restoring from localStorage
    try {
      const key = getLocalStorageKey(pathname);
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setRestoredSession(true);
        }
      }
    } catch { /* ignore */ }

    const ctx = parseContext(pathname);
    createNewSession(ctx);
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/chat/sessions");
      const data = await res.json();
      if (Array.isArray(data)) setSessions(data);
    } catch { /* ignore */ }
  };

  const createNewSession = async (ctx?: ContextInfo) => {
    try {
      const body: Record<string, unknown> = {};
      if (ctx?.taskId) body.task_id = Number(ctx.taskId);
      if (ctx?.phaseId) body.phase_id = Number(ctx.phaseId);
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const session = await res.json();
      if (session?.id) {
        setActiveSessionId(session.id);
        setActiveSessionTitle("New conversation");
        setMessages([]);
        fetchSessions();
      }
    } catch { /* ignore */ }
  };

  const loadSession = async (sessionId: number) => {
    try {
      const res = await fetch(`/api/chat/history?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.messages && Array.isArray(data.messages)) {
        setMessages(data.messages.map((m: Message) => ({ ...m, isStreaming: false })));
      }
      if (data.session) {
        setActiveSessionTitle(data.session.title || "New conversation");
      }
      setActiveSessionId(sessionId);
      setShowSessionList(false);
    } catch { /* ignore */ }
  };

  const handleNewChat = () => {
    // Clear localStorage for this page
    try { localStorage.removeItem(getLocalStorageKey(pathname)); } catch { /* ignore */ }
    setRestoredSession(false);
    setEditingIndex(null);
    setInputValue("");
    createNewSession(parseContext(pathname));
    setShowSessionList(false);
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showSessionList) setShowSessionList(false);
        else if (overlayActive) closeExpandedPanel();
        else if (mobileOpen) setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [closeExpandedPanel, mobileOpen, overlayActive, showSessionList]);

  useEffect(() => {
    if (!expanded || overlayClosing) return;
    const nextFrame = getExpandedFrame();
    if (nextFrame) setOverlayFrame(nextFrame);
  }, [expanded, getExpandedFrame, overlayClosing, viewportWidth]);

  const handleSend = useCallback(
    async (text: string, attachments?: Attachment[]) => {
      if (isLoading) return;
      const normalizedAttachments = attachments ?? [];
      const displayMessage = buildDisplayMessage(text, normalizedAttachments);

      if (editingIndex !== null) {
        const truncated = messages.slice(0, editingIndex);
        setMessages([
          ...truncated,
          { role: "user", content: displayMessage },
          { role: "assistant", content: "", isStreaming: true },
        ]);
        setEditingIndex(null);
        setInputValue("");
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: displayMessage },
          { role: "assistant", content: "", isStreaming: true },
        ]);
      }
      setIsLoading(true);

      try {
        abortRef.current = new AbortController();
        const body: Record<string, unknown> = { message: text, attachments: normalizedAttachments };
        if (contextInfo.taskId) body.taskId = Number(contextInfo.taskId);
        if (contextInfo.phaseId) body.phaseId = Number(contextInfo.phaseId);
        if (activeSessionId) body.session_id = activeSessionId;

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) throw new Error("Failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const payload = trimmed.slice(6);

            if (payload === "[DONE]") {
              setMessages((prev) => {
                const u = [...prev];
                const l = u[u.length - 1];
                if (l?.role === "assistant") u[u.length - 1] = { ...l, isStreaming: false };
                return u;
              });
              break;
            }

            try {
              const p = JSON.parse(payload);
              if (p.text) {
                setMessages((prev) => {
                  const u = [...prev];
                  const l = u[u.length - 1];
                  if (l?.role === "assistant") u[u.length - 1] = { ...l, content: l.content + p.text };
                  return u;
                });
              }
              if (p.session_id && !activeSessionId) setActiveSessionId(p.session_id);
              if (p.error) {
                setMessages((prev) => {
                  const u = [...prev];
                  const l = u[u.length - 1];
                  if (l?.role === "assistant") u[u.length - 1] = { ...l, content: `Error: ${p.error}`, isStreaming: false };
                  return u;
                });
              }
            } catch { /* skip */ }
          }
        }

        if (activeSessionTitle === "New conversation") {
          const titleSource = text.trim() || normalizedAttachments[0]?.name || "New conversation";
          if (titleSource.length > 0) {
            setActiveSessionTitle(titleSource.length > 40 ? titleSource.slice(0, 37) + "..." : titleSource);
          }
        }
        fetchSessions();
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // Mark as stopped
          setMessages((prev) => {
            const u = [...prev];
            const l = u[u.length - 1];
            if (l?.role === "assistant") u[u.length - 1] = { ...l, content: l.content + " \u2014 stopped", isStreaming: false };
            return u;
          });
          return;
        }
        setMessages((prev) => {
          const u = [...prev];
          const l = u[u.length - 1];
          if (l?.role === "assistant") u[u.length - 1] = { ...l, content: "Connection error.", isStreaming: false };
          return u;
        });
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [contextInfo, isLoading, activeSessionId, activeSessionTitle, editingIndex, messages]
  );

  const handleWebSearch = useCallback(async (query: string) => {
    try {
      const res = await fetch(`/api/web-search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const searchContext = data.results.map((r: { title: string; snippet: string; url: string }) =>
          `• ${r.title}: ${r.snippet} (${r.url})`
        ).join("\n");
        handleSend(`[Web search results for "${query}"]\n\n${searchContext}\n\nBased on these results, help me understand the topic.`);
      } else {
        handleSend(`I searched the web for "${query}" but didn't find clear results. Can you help me with this topic from your knowledge?`);
      }
    } catch {
      handleSend(`I tried to search for "${query}" but the search failed. Can you help me with this topic?`);
    }
  }, [handleSend]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleEdit = useCallback((index: number) => {
    const msg = messages[index];
    if (msg?.role === "user") {
      setEditingIndex(index);
      setInputValue(stripAttachmentContext(msg.content));
    }
  }, [messages]);

  const handleRegenerate = useCallback(() => {
    // Find the last user message and re-send
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        const userMsg = stripAttachmentContext(messages[i].content);
        // Truncate to that user message (remove the assistant reply)
        const truncated = messages.slice(0, i);
        setMessages(truncated);
        // Small delay to let state update, then send
        setTimeout(() => {
          handleSend(userMsg);
        }, 50);
        break;
      }
    }
  }, [messages, handleSend]);

  // Compute status subtitle
  const getStatusSubtitle = (): UnityHeaderStatus => {
    if (isLoading) return { text: "Thinking...", color: "var(--teal)" };

    const actionableNudge =
      unityContext?.nudge &&
      (unityContext.nudge.urgency === "high" || unityContext.nudge.urgency === "medium")
        ? unityContext.nudge
        : null;

    if (actionableNudge) {
      return {
        text: actionableNudge.urgency === "high" ? "Action needed" : "Notice",
        color: actionableNudge.urgency === "high" ? "var(--rust)" : "var(--gold)",
        detail: actionableNudge.message,
        action: actionableNudge.cta,
      };
    }

    const focus = unityContext?.focus?.focus?.trim();
    if (focus) {
      return {
        text: focus.length > 36 ? `${focus.slice(0, 33)}...` : focus,
        color: "var(--teal)",
        detail: unityContext?.focus?.summary,
      };
    }
    return {
      text: "Focused on your path",
      color: "var(--text-hint)",
      detail: "Unity stays narrow on the active mission and keeps the learner moving toward visible capability.",
    };
  };

  const status = getStatusSubtitle();
  const suggestedPrompts = getSuggestedPrompts(pathname, contextInfo.taskType, unityContext);

  /* --- Panel internals --- */
  const panelInternals = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-3 pt-4 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
        {/* Row 1: Unity title + controls */}
        <div className="flex items-center gap-1.5">
          <UnityLogo size={16} animated={false} />
          <div className="flex flex-col">
            <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--text-ink)", lineHeight: 1 }}>
              Unity
            </span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: status.color, lineHeight: 1.3 }}>
              {status.text}
            </span>
          </div>
          <div className="flex-1" />

          {/* Chat history dropdown */}
          <div className="relative" ref={sessionListRef}>
            <button
              type="button"
              onClick={() => setShowSessionList(!showSessionList)}
              className="flex items-center gap-1 px-2 py-1 rounded-md border cursor-pointer transition-colors"
              style={{
                background: "var(--bg-sunken)",
                borderColor: "var(--border)",
                fontFamily: "var(--font-body)",
                fontSize: 10,
                color: "var(--text-muted)",
                maxWidth: 140,
              }}
            >
              <span className="truncate">{activeSessionTitle}</span>
              <ChevronDown className="h-2.5 w-2.5 shrink-0" style={{ color: "var(--text-hint)" }} />
            </button>

            {showSessionList && (
              <div
                className="absolute top-full right-0 mt-1 w-60 overflow-hidden z-50 max-h-64 overflow-y-auto rounded-lg border"
                style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
              >
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs cursor-pointer hover:opacity-80 transition-opacity border-b"
                  style={{ fontFamily: "var(--font-body)", color: "var(--teal)", borderColor: "var(--border)" }}
                >
                  <Plus className="h-3 w-3" /> New conversation
                </button>
                {sessions.length === 0 && (
                  <div className="px-3 py-3 text-center" style={{ fontSize: 11, fontFamily: "var(--font-body)", color: "var(--text-hint)" }}>
                    No previous sessions
                  </div>
                )}
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => loadSession(s.id)}
                    className="flex flex-col w-full px-3 py-2 text-left cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: s.id === activeSessionId ? "var(--bg-sunken)" : undefined }}
                  >
                    <span className="truncate w-full" style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-ink)" }}>
                      {s.title}
                    </span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--text-hint)" }}>
                      {formatSessionDate(s.updated_at)}
                      {s.message_count ? ` \u00B7 ${s.message_count} msgs` : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleNewChat}
            className="p-1 rounded-md hover:bg-[var(--bg-sunken)] transition-colors cursor-pointer"
            style={{ color: "var(--text-hint)" }}
            title="New conversation"
          >
            <PenSquare className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              clearOverlayAnimationFrame();
              setOverlayClosing(false);
              setExpanded(false);
              setOverlayFrame(null);
              setDesktopCollapsed(true);
            }}
            className="hidden md:flex items-center justify-center cursor-pointer transition-colors"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-hint)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-sunken)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            title="Collapse Unity"
            disabled={forcedRail}
          >
            <PanelRightClose className="h-3.5 w-3.5" />
          </button>

          {/* Expand/collapse -- desktop only */}
          <button
            type="button"
            onClick={() => {
              if (overlayActive) closeExpandedPanel();
              else openExpandedPanel();
            }}
            className="hidden md:flex items-center justify-center cursor-pointer transition-colors"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-hint)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-sunken)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            title={overlayActive ? "Standard width" : "Expand width"}
          >
            <ExpandIcon expanded={overlayActive} size={14} />
          </button>
        </div>

        {(status.detail || status.action) ? (
          <div
            style={{
              marginTop: 10,
              display: "grid",
              gap: 8,
              padding: "10px 11px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--bg-page)",
            }}
          >
            {status.detail ? (
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  lineHeight: 1.55,
                }}
              >
                {status.detail}
              </div>
            ) : null}
            {status.action ? (
              <Link
                href={status.action.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  width: "fit-content",
                  textDecoration: "none",
                  fontFamily: "var(--font-body)",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--teal)",
                }}
              >
                {status.action.label}
                <ExternalLink style={{ width: 12, height: 12 }} />
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {restoredSession && messages.length > 0 && (
          <div className="text-center py-1">
            <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--text-disabled)", background: "var(--bg-sunken)", padding: "2px 8px", borderRadius: 10 }}>
              Restored from last session
            </span>
          </div>
        )}
        {messages.length === 0 && (
          <div style={{ display: "grid", gap: 12, alignContent: "start", minHeight: "100%" }}>
            <div
              style={{
                display: "grid",
                gap: 10,
                padding: "14px 14px 12px",
                borderRadius: 16,
                border: "1px solid var(--border)",
                background: "linear-gradient(180deg, var(--bg-page) 0%, var(--bg-surface) 100%)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <UnityLogo size={24} animated={false} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--text-ink)" }}>
                    {unityContext?.focus?.focus ?? "Stay on the path"}
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.55 }}>
                    {unityContext?.focus?.summary ?? "Unity keeps the learner focused, grounded, and moving toward visible capability."}
                  </div>
                </div>
              </div>

              {unityContext?.mission ? (
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    padding: "11px 12px",
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-hint)" }}>
                        Current mission
                      </div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--text-ink)", marginTop: 2 }}>
                        {unityContext.mission.title}
                      </div>
                    </div>
                    <Link
                      href={unityContext.mission.route}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        textDecoration: "none",
                        color: "var(--teal)",
                        fontFamily: "var(--font-body)",
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Open <ExternalLink style={{ width: 12, height: 12 }} />
                    </Link>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {[unityContext.mission.stageLabel, unityContext.mission.specializationLabel, unityContext.mission.phaseName].filter(Boolean).map((label) => (
                      <span
                        key={label}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "5px 8px",
                          borderRadius: 999,
                          background: "var(--bg-page)",
                          border: "1px solid var(--border)",
                          fontFamily: "var(--font-body)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {unityContext?.signals?.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {unityContext.signals.slice(0, 3).map((signal) => {
                    const chip = (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 9px",
                          borderRadius: 999,
                          border: "1px solid var(--border)",
                          background: "var(--bg-page)",
                          fontFamily: "var(--font-body)",
                          fontSize: 11,
                          color: "var(--text-ink)",
                        }}
                      >
                        <span style={{ color: "var(--teal)", fontWeight: 600 }}>{signal.label}</span>
                        <span style={{ color: "var(--text-muted)" }}>{signal.topicLabel}</span>
                      </span>
                    );

                    return signal.href ? (
                      <Link key={`${signal.signalType}-${signal.topic}`} href={signal.href} style={{ textDecoration: "none" }}>
                        {chip}
                      </Link>
                    ) : (
                      <span key={`${signal.signalType}-${signal.topic}`}>{chip}</span>
                    );
                  })}
                </div>
              ) : null}

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 9px",
                    borderRadius: 999,
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    fontFamily: "var(--font-body)",
                    fontSize: 11,
                    color: "var(--text-muted)",
                  }}
                >
                  <Compass style={{ width: 12, height: 12, color: "var(--teal)" }} />
                  Web search enabled
                </span>
                {unityContext?.nudge?.cta ? (
                  <Link
                    href={unityContext.nudge.cta.href}
                    style={{
                      textDecoration: "none",
                      fontFamily: "var(--font-body)",
                      fontSize: 12,
                      color: "var(--teal)",
                      fontWeight: 600,
                    }}
                  >
                    {unityContext.nudge.cta.label}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage
            key={`${msg.role}-${i}`}
            role={msg.role}
            content={msg.content}
            isStreaming={msg.isStreaming}
            timestamp={formatTime(msg.created_at)}
            onEdit={msg.role === "user" ? () => handleEdit(i) : undefined}
            onRegenerate={msg.role === "assistant" && !msg.isStreaming ? handleRegenerate : undefined}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Stop button */}
      {isLoading && (
        <div className="shrink-0 flex justify-center pb-2">
          <button
            type="button"
            onClick={handleStop}
            className="cursor-pointer transition-opacity hover:opacity-80"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 14px",
              borderRadius: 20,
              background: "var(--rust-dim)",
              color: "var(--rust)",
              border: "1px solid rgba(196, 92, 42, 0.2)",
              fontFamily: "var(--font-body)",
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            <span style={{ fontSize: 8 }}>{"\u25A0"}</span> Stop generating
          </button>
        </div>
      )}

      {/* Suggested prompts */}
      {messages.length === 0 && (
        <div className="shrink-0 px-3 pb-2 flex flex-col gap-1.5">
          {suggestedPrompts.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => handleSend(p.message)}
              disabled={isLoading}
              className="flex items-start gap-2.5 w-full text-left px-3 py-2.5 rounded-lg border cursor-pointer transition-all disabled:opacity-40 group"
              style={{
                background: "var(--bg-page)",
                borderColor: "var(--border)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--teal)"; e.currentTarget.style.background = "var(--bg-sunken)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-page)"; }}
            >
              <span style={{ fontSize: 14, lineHeight: 1, marginTop: 1 }}>{p.icon}</span>
              <div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 500, color: "var(--text-ink)" }}>
                  {p.label}
                </div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--text-hint)", marginTop: 1 }}>
                  {p.description ?? (p.message.length > 60 ? p.message.slice(0, 57) + "..." : p.message)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={isLoading}
        initialValue={inputValue}
        onValueChange={setInputValue}
        onWebSearch={handleWebSearch}
      />
    </div>
  );

  const desktopPanelStyle: React.CSSProperties = {
    height: "100%",
    borderRadius: 22,
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    overflow: "hidden",
    boxShadow: "0 16px 40px rgba(17, 22, 28, 0.08)",
    transition: "box-shadow 160ms ease",
  };

  const desktopRailStyle: React.CSSProperties = {
    height: "100%",
    borderRadius: 22,
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    boxShadow: "0 16px 40px rgba(17, 22, 28, 0.08)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 0 14px",
    cursor: "pointer",
  };

  const overlayPanelStyle: React.CSSProperties | null = overlayActive && overlayFrame
    ? {
        ...desktopPanelStyle,
        position: "fixed",
        top: overlayFrame.top,
        left: overlayFrame.left,
        width: overlayFrame.width,
        height: overlayFrame.height,
        zIndex: 230,
        boxShadow: "0 28px 72px rgba(17, 22, 28, 0.22)",
        transition:
          "top 220ms cubic-bezier(0.22, 1, 0.36, 1), left 220ms cubic-bezier(0.22, 1, 0.36, 1), width 220ms cubic-bezier(0.22, 1, 0.36, 1), height 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1), border-radius 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: "top, left, width, height, box-shadow",
      }
    : null;

  return (
    <>
      {showDesktop && (
        <div
          ref={desktopSlotRef}
          className="hidden md:block global-unity-panel"
          style={{ position: "relative", minWidth: 0, height: "calc(100vh - (var(--shell-padding) * 2))" }}
        >
          {effectiveDesktopCollapsed && !overlayActive ? (
            <button
              type="button"
              onClick={() => {
                if (forcedRail) {
                  openExpandedPanel();
                  return;
                }
                setDesktopCollapsed(false);
              }}
              className="flex h-full w-full"
              style={desktopRailStyle}
              aria-label={forcedRail ? "Open Unity overlay" : "Expand Unity"}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                <UnityLogo size={44} />
                <span
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    fontFamily: "var(--font-body)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    letterSpacing: "0.08em",
                  }}
                >
                  Unity
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <PanelRightOpen className="h-4 w-4" style={{ color: "var(--text-hint)" }} />
              </div>
            </button>
          ) : (
            <div
              className="flex h-full flex-col"
              style={overlayPanelStyle ?? desktopPanelStyle}
              onTransitionEnd={(event) => {
                if (event.target !== event.currentTarget) return;
                if (!overlayActive) return;
                if (overlayClosing) {
                  setOverlayClosing(false);
                  setExpanded(false);
                  setOverlayFrame(null);
                }
              }}
            >
              {panelInternals}
            </div>
          )}
        </div>
      )}

      {showDesktop && overlayActive && (
        <>
          <button
            type="button"
            aria-label="Close expanded Unity"
            className="hidden md:block global-unity-panel"
            onClick={closeExpandedPanel}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              left: "calc(var(--shell-padding) + var(--shell-sidebar-width) + var(--shell-gap))",
              zIndex: 220,
              background: expanded && !overlayClosing ? "rgba(17, 22, 28, 0.22)" : "rgba(17, 22, 28, 0)",
              transition: "background 180ms ease",
              cursor: "pointer",
            }}
          />
        </>
      )}

      {/* Mobile: FAB + full-screen overlay */}
      {showMobile && <div className="md:hidden global-unity-panel">
        {!mobileOpen && (
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="fixed right-4 bottom-20 z-50 w-12 h-12 flex items-center justify-center cursor-pointer transition-colors"
            style={{ background: "var(--teal)", borderRadius: 12 }}
            aria-label="Open Unity"
          >
            <MessageSquare className="h-5 w-5 text-white" />
          </button>
        )}

        {mobileOpen && (
          <div className="fixed inset-0 z-50 animate-fade-in" style={{ background: "var(--bg-surface)" }}>
            <div className="absolute top-3 right-3 z-10">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-md cursor-pointer transition-colors"
                style={{ color: "var(--text-hint)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {panelInternals}
          </div>
        )}
      </div>}
    </>
  );
}
