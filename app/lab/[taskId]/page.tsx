"use client";

// Split-screen IDE lab page.
// 3 panes: Lab Guide (left) | Code Editor (center) | Unity Chat (right)
// Full viewport height. No outer scroll.

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Play,
  ExternalLink,
  Copy,
  Clock,
  ArrowUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TimeLoggerModal } from "@/components/ui/TimeLoggerModal";
import { useToast } from "@/components/ui/Toast";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { UnityLogo } from "@/components/chat/UnityLogo";
import { MissionSessionStatus } from "@/components/telemetry/MissionSessionStatus";
import {
  FinalizeProofModal,
  type FinalizeProofDraft,
} from "@/components/proof/FinalizeProofModal";
import labConfigsData from "@/data/lab-configs.json";

// Dynamic import Monaco to avoid SSR issues
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#16120e",
          color: "#5a5248",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
        }}
      >
        Loading editor...
      </div>
    ),
  }
);

/* ── Types ── */
interface FieldResult {
  value: string;
  terminal_output: string | null;
  notes: string | null;
}
interface Field {
  id: number;
  field_name: string;
  field_unit: string | null;
  placeholder_text: string | null;
  resume_placeholder: string | null;
  result: FieldResult | null;
}
interface Phase {
  id: number;
  name: string;
}
interface Task {
  id: number;
  type: string;
  title: string;
  description: string | null;
  notes: string | null;
  status: string;
  prevTaskId: number | null;
  nextTaskId: number | null;
  phase: Phase;
  fields: Field[];
}

interface LabProofSignal {
  id: number;
  label: string;
  unit: string | null;
  status: "captured" | "pending";
  value: string | null;
  proofLabel: string | null;
}

interface LabProofSnapshot {
  taskId: number;
  taskTitle: string;
  capturedCount: number;
  totalCount: number;
  signals: LabProofSignal[];
  latestSignal: LabProofSignal | null;
}

interface LabProofCapture {
  fieldId: number;
  label: string;
  value: string;
  unit: string | null;
  proofLabel: string | null;
}

interface LabMeasurementSaveResponse {
  result: FieldResult & { field_id: number };
  capture: LabProofCapture;
  proof: LabProofSnapshot | null;
  artifactDraft: FinalizeProofDraft | null;
}

interface ProofArtifactRecord {
  id: number;
  taskId: number;
  taskTitle: string;
  fieldId: number | null;
  fieldName: string | null;
  fieldUnit: string | null;
  title: string;
  proofStatement: string;
  explanation: string | null;
  evidenceSummary: string | null;
  metricLabel: string | null;
  metricValue: string | null;
  metricUnit: string | null;
  repoUrl: string | null;
  artifactUrl: string | null;
  status: "draft" | "ready" | "exported";
  updatedAt: string;
}

interface LabStep {
  id: number;
  title: string;
  description: string;
  hint: string;
  videoTimestamp: number | null;
  codeMarker: string;
}
interface Measurement {
  key: string;
  label: string;
  target: string;
  unit: string;
  parsePattern: string;
}
interface LabConfig {
  id: string;
  title: string;
  requiresGPU: boolean;
  videoTaskId: number;
  files: string[];
  defaultFile: string;
  steps: LabStep[];
  measurements: Measurement[];
  checklist: string[];
  starterCode: Record<string, string>;
}

interface RunHistoryEntry {
  timestamp: string;
  output: string;
  duration: string;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  model?: string;
  isStreaming?: boolean;
}

const labConfigs = labConfigsData as Record<string, LabConfig>;

interface GeneratedLabConfig {
  title: string;
  objective: string;
  requiresGPU: boolean;
  steps: Array<{
    id: number;
    title: string;
    description: string;
    hint: string;
    code: string;
  }>;
  measurements: Array<{
    key: string;
    label: string;
    target: string;
    unit: string;
  }>;
  checklist: string[];
  files: string[];
  starterCode: Record<string, string>;
}

function toLabConfig(gen: GeneratedLabConfig, taskId: string): LabConfig {
  return {
    id: `gen-${taskId}`,
    title: gen.title,
    requiresGPU: gen.requiresGPU,
    videoTaskId: 0,
    files: gen.files ?? ["train.py"],
    defaultFile: gen.files?.[0] ?? "train.py",
    steps: gen.steps.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      hint: s.hint,
      videoTimestamp: null,
      codeMarker: "",
    })),
    measurements: gen.measurements.map((m) => ({
      ...m,
      parsePattern: "",
    })),
    checklist: gen.checklist,
    starterCode: gen.starterCode ?? {},
  };
}

const CHECKPOINT_PREFIX = "epoch_lab_";

function hasFieldValue(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function deriveLabProofSnapshot(task: Task | null): LabProofSnapshot | null {
  if (!task?.fields?.length) return null;

  const signals = task.fields.map((field) => ({
    id: field.id,
    label: field.field_name,
    unit: field.field_unit,
    status: hasFieldValue(field.result?.value ?? null) ? "captured" : "pending",
    value: field.result?.value ?? null,
    proofLabel: field.resume_placeholder ?? null,
  })) satisfies LabProofSignal[];

  const capturedSignals = signals.filter((signal) => signal.status === "captured");

  return {
    taskId: task.id,
    taskTitle: task.title,
    capturedCount: capturedSignals.length,
    totalCount: signals.length,
    signals,
    latestSignal: capturedSignals.at(-1) ?? null,
  };
}

/* ── Debounce helper ── */
function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
}

/* ── Section label ── */
function SectionLabel({
  children,
  color,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      style={{
        fontFamily: "var(--font-body)",
        fontSize: 9,
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        color: color ?? "var(--text-hint)",
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════ */
export default function LabIDEPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;
  const toast = useToast();

  // ── Task state ──
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Lab config (static or dynamically generated) ──
  const [config, setConfig] = useState<LabConfig | null>(labConfigs[taskId] ?? null);
  const [generatingConfig, setGeneratingConfig] = useState(false);

  // ── Editor state ──
  const [activeFile, setActiveFile] = useState(config?.defaultFile ?? "train.py");
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [savedIndicator, setSavedIndicator] = useState(false);

  // ── Output state ──
  const [output, setOutput] = useState("");
  const [outputTab, setOutputTab] = useState<"output" | "history">("output");
  const [runHistory, setRunHistory] = useState<RunHistoryEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // ── Guide state ──
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [checklist, setChecklist] = useState<boolean[]>([]);
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [labProof, setLabProof] = useState<LabProofSnapshot | null>(null);
  const [latestProofCapture, setLatestProofCapture] = useState<LabProofCapture | null>(null);
  const [artifacts, setArtifacts] = useState<ProofArtifactRecord[]>([]);
  const [finalizeProofOpen, setFinalizeProofOpen] = useState(false);
  const [finalizeDraft, setFinalizeDraft] = useState<FinalizeProofDraft | null>(null);

  // ── Completion ──
  const [showTimeLogger, setShowTimeLogger] = useState(false);
  const [warnChecklist, setWarnChecklist] = useState(false);

  // ── Unity chat state (inline) ──
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const chatModel = "gpt" as const;
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Checkpoint key ──
  const checkpointKey = `${CHECKPOINT_PREFIX}${taskId}`;

  /* ── Fetch task ── */
  const fetchArtifacts = useCallback(async () => {
    try {
      const res = await fetch(`/api/proof-artifacts?taskId=${taskId}`);
      const data = await res.json();
      setArtifacts(data.artifacts ?? []);
    } catch {
      /* ignore */
    }
  }, [taskId]);

  const fetchTask = useCallback(() => {
    setLoading(true);
    fetch(`/api/tasks/${taskId}`)
      .then((r) => r.json())
      .then((data) => {
        setTask(data);
        setLoading(false);
        setNotes(data.notes ?? "");
        setLabProof(deriveLabProofSnapshot(data));
      })
      .catch(() => setLoading(false));
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  useEffect(() => {
    fetchArtifacts();
  }, [fetchArtifacts]);

  /* ── Check for generated config if no static config ── */
  useEffect(() => {
    if (labConfigs[taskId]) return; // static config exists
    fetch(`/api/lab/generate-config?taskId=${taskId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.config) {
          setConfig(toLabConfig(data.config, taskId));
        }
      })
      .catch(() => { /* ignore */ });
  }, [taskId]);

  /* ── Generate lab config on demand ── */
  const handleGenerateConfig = async () => {
    setGeneratingConfig(true);
    try {
      const res = await fetch("/api/lab/generate-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: Number(taskId) }),
      });
      const data = await res.json();
      if (data.config) {
        setConfig(toLabConfig(data.config, taskId));
      }
    } catch {
      /* ignore */
    } finally {
      setGeneratingConfig(false);
    }
  };

  /* ── Initialize file contents from config or checkpoint ── */
  useEffect(() => {
    if (!config) return;

    // Try loading checkpoint
    try {
      const saved = localStorage.getItem(checkpointKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.fileContents) {
          setFileContents(parsed.fileContents);
          if (parsed.activeFile) setActiveFile(parsed.activeFile);
          if (parsed.completedSteps)
            setCompletedSteps(new Set(parsed.completedSteps));
          if (parsed.measurements) setMeasurements(parsed.measurements);
          if (parsed.notes) setNotes(parsed.notes);
          if (parsed.output) setOutput(parsed.output);
          if (parsed.runHistory) setRunHistory(parsed.runHistory);
          return;
        }
      }
    } catch {
      /* ignore */
    }

    // Fall back to starter code
    setFileContents(config.starterCode ?? {});
    setChecklist(new Array(config.checklist?.length ?? 3).fill(false));
  }, [config, checkpointKey]);

  /* ── Initialize checklist from config ── */
  useEffect(() => {
    if (config?.checklist) {
      setChecklist(new Array(config.checklist.length).fill(false));
    }
  }, [config]);

  /* ── Save checkpoint (debounced) ── */
  const saveCheckpoint = useCallback(() => {
    try {
      localStorage.setItem(
        checkpointKey,
        JSON.stringify({
          fileContents,
          activeFile,
          completedSteps: Array.from(completedSteps),
          measurements,
          notes,
          output,
          runHistory,
          savedAt: new Date().toISOString(),
        })
      );
      setSavedIndicator(true);
      setTimeout(() => setSavedIndicator(false), 1500);
    } catch {
      /* quota exceeded */
    }
  }, [
    checkpointKey,
    fileContents,
    activeFile,
    completedSteps,
    measurements,
    notes,
    output,
    runHistory,
  ]);

  const debouncedSave = useDebouncedCallback(saveCheckpoint, 1000);

  // Auto-save on file content changes
  useEffect(() => {
    if (Object.keys(fileContents).length > 0) {
      debouncedSave();
    }
  }, [fileContents, debouncedSave]);

  /* ── Handle editor change ── */
  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (value === undefined) return;
      setFileContents((prev) => ({ ...prev, [activeFile]: value }));
    },
    [activeFile]
  );

  /* ── Monaco theme setup ── */
  const handleEditorBeforeMount = useCallback(
    (monaco: { editor: { defineTheme: (name: string, theme: unknown) => void } }) => {
      monaco.editor.defineTheme("epoch-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "keyword", foreground: "c49a3c" },
          { token: "identifier", foreground: "7abfb0" },
          { token: "string", foreground: "a8c47a" },
          { token: "comment", foreground: "5a5248" },
          { token: "number", foreground: "d4a96a" },
          { token: "type", foreground: "c49a3c" },
          { token: "delimiter", foreground: "8a8278" },
          { token: "variable", foreground: "c8c0b0" },
        ],
        colors: {
          "editor.background": "#16120e",
          "editor.foreground": "#c8c0b0",
          "editor.lineHighlightBackground": "#1e1a14",
          "editorLineNumber.foreground": "#5a5248",
          "editorLineNumber.activeForeground": "#8a8278",
          "editor.selectionBackground": "#2a7c6f44",
          "editor.inactiveSelectionBackground": "#2a7c6f22",
          "editorCursor.foreground": "#c49a3c",
          "editorIndentGuide.background": "#2a2520",
          "editorIndentGuide.activeBackground": "#3a3530",
          "editorWidget.background": "#1a1610",
          "editorWidget.border": "#2a2520",
          "editorSuggestWidget.background": "#1a1610",
        },
      });
    },
    []
  );

  /* ── Placeholder run ── */
  const handleRun = useCallback(() => {
    setIsRunning(true);
    setOutputTab("output");
    setOutput("Running...\n");

    // Simulate run with a delay
    setTimeout(() => {
      const simulatedOutput = [
        `$ python ${activeFile}`,
        "",
        "--- Simulated Output ---",
        "Note: This is a placeholder. For real execution:",
        config?.requiresGPU
          ? "  Use 'Open in Colab' for GPU-accelerated runs."
          : "  Use a local Python environment.",
        "",
        "To paste real output, use the terminal output section",
        "in the Lab Guide panel, or share it with Unity.",
        `\nFinished at ${new Date().toLocaleTimeString()}`,
      ].join("\n");

      setOutput(simulatedOutput);
      setIsRunning(false);

      setRunHistory((prev) => {
        const entry: RunHistoryEntry = {
          timestamp: new Date().toLocaleTimeString(),
          output: simulatedOutput,
          duration: "simulated",
        };
        return [entry, ...prev].slice(0, 5);
      });
    }, 1500);
  }, [activeFile, config?.requiresGPU]);

  /* ── Copy code & open Colab ── */
  const handleOpenColab = useCallback(() => {
    const code = fileContents[activeFile] ?? "";
    navigator.clipboard.writeText(code).then(() => {
      toast.success("Code copied to clipboard");
      window.open(
        "https://colab.research.google.com/#create=true&language=python",
        "_blank"
      );
    });
  }, [fileContents, activeFile, toast]);

  /* ── Mark complete ── */
  const handleMarkComplete = async () => {
    if (!checklist.every(Boolean)) {
      setWarnChecklist(true);
      return;
    }
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "complete" }),
    });
    setShowTimeLogger(true);
  };

  /* ── Save notes ── */
  const saveNotes = async () => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  };

  const openFinalizeProof = useCallback(
    async (fieldId: number) => {
      try {
        const res = await fetch(`/api/proof-artifacts?fieldId=${fieldId}`);
        const data = await res.json();
        if (!data.artifact) {
          toast.error("Capture a measurable result before finalizing proof.");
          return;
        }
        setFinalizeDraft(data.artifact);
        setFinalizeProofOpen(true);
      } catch {
        toast.error("Unable to load proof draft.");
      }
    },
    [toast]
  );

  const saveProofArtifact = useCallback(
    async (payload: {
      fieldId: number;
      title: string;
      proofStatement: string;
      explanation: string;
      evidenceSummary: string;
      repoUrl: string;
      artifactUrl: string;
      status: "draft" | "ready" | "exported";
    }) => {
      const res = await fetch("/api/proof-artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error((data.error as string | undefined) ?? "Unable to save artifact");
      }

      const artifact = data.artifact as ProofArtifactRecord;
      setArtifacts((prev) => {
        const next = prev.filter((item) => item.fieldId !== artifact.fieldId);
        return [artifact, ...next];
      });
      if (typeof artifact.fieldId === "number") {
        setFinalizeDraft({
          fieldId: artifact.fieldId,
          title: artifact.title,
          proofStatement: artifact.proofStatement,
          explanation: artifact.explanation,
          evidenceSummary: artifact.evidenceSummary,
          repoUrl: artifact.repoUrl,
          artifactUrl: artifact.artifactUrl,
          status: artifact.status,
          metricLabel: artifact.metricLabel,
          metricValue: artifact.metricValue,
          metricUnit: artifact.metricUnit,
        });
      }
      toast.success(
        artifact.status === "ready" || artifact.status === "exported"
          ? "Proof artifact marked ready"
          : "Proof artifact saved as draft"
      );
    },
    [toast]
  );

  /* ── Save measurement ── */
  const saveMeasurement = async (field: Field, value: string) => {
    setMeasurements((prev) => ({ ...prev, [field.field_name]: value }));
    const res = await fetch(`/api/lab/${field.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    const data = (await res.json()) as LabMeasurementSaveResponse;

    setTask((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: prev.fields.map((item) =>
          item.id === field.id
            ? {
                ...item,
                result: data.result
                  ? {
                      value: data.result.value,
                      terminal_output: data.result.terminal_output ?? null,
                      notes: data.result.notes ?? null,
                    }
                  : item.result,
              }
            : item
        ),
      };
    });

    if (data.proof) {
      setLabProof(data.proof);
    }
    setLatestProofCapture(data.capture);
    if (data.artifactDraft) {
      setFinalizeDraft(data.artifactDraft);
    }
    toast.success(
      data.capture?.proofLabel ? "Result saved and proof draft is ready" : "Result saved"
    );
  };

  /* ── Scroll chat to bottom ── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  /* ── Unity chat send (inline, with code context) ── */
  const handleChatSend = useCallback(
    async (text: string) => {
      if (chatLoading) return;

      setChatMessages((prev) => [
        ...prev,
        { role: "user", content: text, model: chatModel },
        { role: "assistant", content: "", model: chatModel, isStreaming: true },
      ]);
      setChatLoading(true);

      try {
        abortRef.current = new AbortController();
        const body: Record<string, unknown> = {
          message: text,
          model: chatModel,
          taskId: Number(taskId),
          labContext: {
            activeFile,
            code: fileContents[activeFile] ?? "",
            output: output,
          },
        };

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
              setChatMessages((prev) => {
                const u = [...prev];
                const l = u[u.length - 1];
                if (l?.role === "assistant")
                  u[u.length - 1] = { ...l, isStreaming: false };
                return u;
              });
              break;
            }

            try {
              const p = JSON.parse(payload);
              if (p.text) {
                setChatMessages((prev) => {
                  const u = [...prev];
                  const l = u[u.length - 1];
                  if (l?.role === "assistant")
                    u[u.length - 1] = { ...l, content: l.content + p.text };
                  return u;
                });
              }
              if (p.error) {
                setChatMessages((prev) => {
                  const u = [...prev];
                  const l = u[u.length - 1];
                  if (l?.role === "assistant")
                    u[u.length - 1] = {
                      ...l,
                      content: `Error: ${p.error}`,
                      isStreaming: false,
                    };
                  return u;
                });
              }
            } catch {
              /* skip */
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setChatMessages((prev) => {
          const u = [...prev];
          const l = u[u.length - 1];
          if (l?.role === "assistant")
            u[u.length - 1] = {
              ...l,
              content: "Connection error. Please try again.",
              isStreaming: false,
            };
          return u;
        });
      } finally {
        setChatLoading(false);
        abortRef.current = null;
      }
    },
    [chatModel, chatLoading, taskId, activeFile, fileContents, output]
  );

  /* ── Quick action prompts for Unity ── */
  const getQuickActions = useCallback(() => {
    if (output.toLowerCase().includes("error") || output.toLowerCase().includes("traceback")) {
      return [
        { label: "Debug this error", message: "I got an error in my code. Can you help me debug it?" },
        { label: "Explain the traceback", message: "Can you explain what this traceback means and how to fix it?" },
      ];
    }
    if (output && output !== "") {
      return [
        { label: "Check my results", message: "Are my results reasonable? What should I expect?" },
        { label: "What's next?", message: "My code ran successfully. What should I do next?" },
      ];
    }
    return [
      { label: "Help me start", message: "I'm starting this lab. What's the best approach?" },
      { label: "Explain this code", message: "Can you explain what the current code does step by step?" },
      { label: "Debug help", message: "I'm stuck. Can you help me troubleshoot?" },
    ];
  }, [output]);

  /* ── Loading state ── */
  if (loading) {
    return (
      <>
        <style>{`.global-unity-panel { display: none !important; }`}</style>
        <div
          className="animate-pulse"
          style={{
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-page)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "var(--text-hint)",
            }}
          >
            Loading lab environment...
          </div>
        </div>
      </>
    );
  }

  if (!task) {
    return (
      <>
        <style>{`.global-unity-panel { display: none !important; }`}</style>
        <div style={{ padding: 40 }}>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              color: "var(--text-muted)",
            }}
          >
            This lab hasn&apos;t been written yet. Check back soon.
          </p>
        </div>
      </>
    );
  }

  // Show generate button if no config exists (neither static nor generated)
  if (!config && !generatingConfig) {
    return (
      <>
        <style>{`.global-unity-panel { display: none !important; }`}</style>
        <div
          style={{
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-page)",
            gap: 16,
          }}
        >
          <UnityLogo size={36} />
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 500,
              color: "var(--text-ink)",
            }}
          >
            {task.title}
          </p>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 12,
              color: "var(--text-muted)",
              maxWidth: 400,
              textAlign: "center",
            }}
          >
            No lab environment configured yet. Unity can generate a hands-on coding lab for this task.
          </p>
          <button
            onClick={handleGenerateConfig}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              fontWeight: 500,
              padding: "10px 24px",
              borderRadius: 8,
              border: "none",
              background: "var(--teal)",
              color: "#fff",
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
          >
            Generate Lab Environment
          </button>
        </div>
      </>
    );
  }

  if (generatingConfig) {
    return (
      <>
        <style>{`.global-unity-panel { display: none !important; }`}</style>
        <div
          className="animate-pulse"
          style={{
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-page)",
            gap: 16,
          }}
        >
          <UnityLogo size={36} animated />
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            Unity is creating your lab...
          </p>
        </div>
      </>
    );
  }

  const isComplete = task.status === "complete";
  const steps = config?.steps ?? [];
  const checklistItems = config?.checklist ?? [
    "Code ran and produced expected output",
    "Results recorded in measurements",
    "I can explain the key concepts",
  ];
  const configMeasurements = config?.measurements ?? [];
  const files = config?.files ?? ["train.py"];
  const artifactsByField = new Map(
    artifacts
      .filter((artifact) => typeof artifact.fieldId === "number")
      .map((artifact) => [artifact.fieldId as number, artifact])
  );
  const readyArtifacts = artifacts.filter(
    (artifact) => artifact.status === "ready" || artifact.status === "exported"
  );
  const latestArtifact = artifacts[0] ?? null;

  return (
    <>
      {/* Keep the desktop shell, hide only the global Unity rail, and let lab use the full main canvas. */}
      <style>{`
        .global-unity-panel { display: none !important; }
        @media (min-width: 768px) {
          body:has(.lab-ide-root) .epoch-desktop-shell {
            grid-template-columns: var(--shell-sidebar-width) minmax(0, 1fr) 0px !important;
          }
          body:has(.lab-ide-root) .epoch-desktop-main,
          main:has(.lab-ide-root) {
            padding: 0 !important;
            max-width: none !important;
            width: 100% !important;
            height: calc(100vh - (var(--shell-padding) * 2)) !important;
            overflow: hidden !important;
          }
          main:has(.lab-ide-root) > div {
            padding: 0 !important;
            max-width: none !important;
            height: 100% !important;
          }
        }
        .lab-ide-body {
          display: grid;
          grid-template-columns: clamp(300px, 24vw, 360px) minmax(0, 1fr) clamp(300px, 24vw, 340px);
          flex: 1;
          min-height: 0;
        }
        @media (max-width: 1100px) {
          .lab-ide-body {
            grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
          }
          .lab-ide-chat-pane {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="lab-ide-root"
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "var(--bg-page)",
        }}
      >
        {/* ═══ TOPBAR ═══ */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            height: 44,
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-surface)",
            flexShrink: 0,
            gap: 12,
          }}
        >
          {/* Left: breadcrumb */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "var(--font-body)",
              fontSize: 11,
              color: "var(--text-hint)",
              flexShrink: 0,
            }}
          >
            <Link
              href={`/phases/${task.phase.id}`}
              style={{ color: "var(--text-hint)", textDecoration: "none" }}
            >
              {task.phase.name}
            </Link>
            <span style={{ color: "var(--text-disabled)" }}>/</span>
            <span
              style={{
                color: "var(--text-muted)",
                maxWidth: 200,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {task.title}
            </span>
          </nav>

          <MissionSessionStatus compact />

          {/* Center: file tabs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flex: 1,
              justifyContent: "center",
            }}
          >
            {files.map((file) => (
              <button
                key={file}
                onClick={() => setActiveFile(file)}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  padding: "4px 12px",
                  borderRadius: 4,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  background:
                    activeFile === file ? "#16120e" : "transparent",
                  color:
                    activeFile === file ? "#c8c0b0" : "var(--text-hint)",
                }}
              >
                {file}
              </button>
            ))}
            {savedIndicator && (
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 10,
                  color: "var(--teal)",
                  marginLeft: 8,
                }}
              >
                Saved
              </span>
            )}
          </div>

          {/* Right: actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}
          >
            {config?.requiresGPU && (
              <button
                onClick={handleOpenColab}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontFamily: "var(--font-body)",
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "4px 10px",
                  borderRadius: 5,
                  border: "1px solid var(--border)",
                  background: "var(--bg-page)",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <ExternalLink style={{ width: 12, height: 12 }} />
                Open in Colab
              </button>
            )}
            <Button
              variant="secondary"
              href={task.prevTaskId ? `/lab/${task.prevTaskId}` : undefined}
              disabled={!task.prevTaskId}
              className="!px-2 !py-1 !text-[10px]"
            >
              <ChevronLeft style={{ width: 12, height: 12 }} />
              Prev
            </Button>
            {isComplete ? (
              <Badge variant="teal">
                <CheckCircle2 style={{ width: 12, height: 12 }} /> Done
              </Badge>
            ) : (
              <Button
                onClick={handleMarkComplete}
                className="!px-3 !py-1 !text-[10px]"
              >
                <CheckCircle2 style={{ width: 12, height: 12 }} />
                Complete
              </Button>
            )}
            <Button
              variant="secondary"
              href={task.nextTaskId ? `/lab/${task.nextTaskId}` : undefined}
              disabled={!task.nextTaskId}
              className="!px-2 !py-1 !text-[10px]"
            >
              Next
              <ChevronRight style={{ width: 12, height: 12 }} />
            </Button>
          </div>
        </div>

        {/* ═══ 3-PANE LAYOUT ═══ */}
        <div className="lab-ide-body">
          {/* ─── PANE 1: Lab Guide (280px) ─── */}
          <div
            style={{
              minWidth: 0,
              overflowY: "auto",
              background: "var(--bg-page)",
              borderRight: "1px solid var(--border)",
              padding: "20px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {/* Objective card */}
            <div
              style={{
                background: "rgba(42,124,111,0.04)",
                borderLeft: "4px solid var(--teal)",
                borderRadius: 8,
                padding: "12px 14px",
              }}
            >
              <SectionLabel color="var(--teal)">Objective</SectionLabel>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 12,
                  color: "var(--text-ink)",
                  lineHeight: 1.55,
                }}
              >
                {task.description ?? `Complete: ${task.title.toLowerCase()}`}
              </div>
            </div>

            {labProof && (
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  display: "grid",
                  gap: 10,
                }}
              >
                <SectionLabel color="var(--teal)">Capability Proof</SectionLabel>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.55 }}>
                  {labProof.capturedCount}/{labProof.totalCount || 1} evidence signals captured for this lab.
                </div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.55 }}>
                  {readyArtifacts.length} ready artifact{readyArtifacts.length === 1 ? "" : "s"} · {artifacts.length - readyArtifacts.length} draft
                </div>
                {latestProofCapture ? (
                  <div
                    style={{
                      background: "var(--teal-dim)",
                      border: "1px solid rgba(42,124,111,0.12)",
                      borderRadius: 6,
                      padding: "8px 9px",
                      display: "grid",
                      gap: 4,
                    }}
                  >
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--teal)" }}>
                      Latest capture
                    </div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-ink)", lineHeight: 1.5 }}>
                      {latestProofCapture.label}: <span style={{ fontWeight: 600 }}>{latestProofCapture.value}</span>
                      {latestProofCapture.unit ? ` ${latestProofCapture.unit}` : ""}
                    </div>
                    {latestProofCapture.proofLabel ? (
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--text-hint)", lineHeight: 1.5 }}>
                        Linked proof: {latestProofCapture.proofLabel}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => openFinalizeProof(latestProofCapture.fieldId)}
                      style={{
                        marginTop: 2,
                        alignSelf: "flex-start",
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        fontFamily: "var(--font-body)",
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--teal)",
                        cursor: "pointer",
                      }}
                    >
                      Finalize proof
                    </button>
                  </div>
                ) : null}
                {latestArtifact ? (
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      padding: "8px 9px",
                      background: "var(--bg-page)",
                      display: "grid",
                      gap: 4,
                    }}
                  >
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-hint)" }}>
                      Latest artifact
                    </div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500, color: "var(--text-ink)", lineHeight: 1.5 }}>
                      {latestArtifact.title}
                    </div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--text-hint)", lineHeight: 1.45 }}>
                      {latestArtifact.status === "ready" || latestArtifact.status === "exported" ? "Ready to show" : "Draft in progress"}
                    </div>
                  </div>
                ) : null}
                <div style={{ display: "grid", gap: 7 }}>
                  {labProof.signals.slice(0, 3).map((signal) => (
                    <div
                      key={signal.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "flex-start",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        padding: "8px 9px",
                        background: "var(--bg-page)",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500, color: "var(--text-ink)" }}>
                          {signal.label}
                        </div>
                        <div style={{ marginTop: 2, fontFamily: "var(--font-body)", fontSize: 9, color: "var(--text-hint)", lineHeight: 1.45 }}>
                          {signal.proofLabel ?? signal.unit ?? "Evidence signal"}
                        </div>
                      </div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: signal.status === "captured" ? "var(--teal)" : "var(--gold)", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {signal.status === "captured" ? signal.value ?? "Captured" : "Pending"}
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  href="/resume"
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--teal)",
                    textDecoration: "none",
                  }}
                >
                  Open proof locker
                </Link>
              </div>
            )}

            {/* Step stepper */}
            {steps.length > 0 && (
              <div>
                <SectionLabel>Steps</SectionLabel>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {steps.map((step, i) => {
                    const isDone = completedSteps.has(i);
                    const isActive = activeStep === i;
                    return (
                      <div key={step.id} style={{ display: "flex", gap: 10 }}>
                        {/* Circle + connector */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            flexShrink: 0,
                            width: 22,
                          }}
                        >
                          <button
                            onClick={() => {
                              const s = new Set(completedSteps);
                              if (isDone) s.delete(i);
                              else s.add(i);
                              setCompletedSteps(s);
                              setActiveStep(i);
                            }}
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: isDone
                                ? "none"
                                : isActive
                                ? "2px solid var(--teal)"
                                : "2px solid var(--border)",
                              background: isDone
                                ? "var(--teal)"
                                : "var(--bg-page)",
                              transition: "all 0.15s",
                            }}
                          >
                            {isDone ? (
                              <Check
                                style={{
                                  width: 10,
                                  height: 10,
                                  color: "#fff",
                                }}
                              />
                            ) : (
                              <span
                                style={{
                                  fontFamily: "var(--font-body)",
                                  fontSize: 9,
                                  fontWeight: 600,
                                  color: isActive
                                    ? "var(--teal)"
                                    : "var(--text-hint)",
                                }}
                              >
                                {i + 1}
                              </span>
                            )}
                          </button>
                          {i < steps.length - 1 && (
                            <div
                              style={{
                                width: 2,
                                flex: 1,
                                background: isDone
                                  ? "var(--teal)"
                                  : "var(--border)",
                                marginTop: 3,
                                marginBottom: 3,
                                borderRadius: 1,
                                minHeight: 16,
                              }}
                            />
                          )}
                        </div>

                        {/* Step content */}
                        <div
                          style={{
                            flex: 1,
                            paddingBottom: 16,
                            cursor: "pointer",
                          }}
                          onClick={() => setActiveStep(i)}
                        >
                          <div
                            style={{
                              fontFamily: "var(--font-body)",
                              fontSize: 12,
                              fontWeight: 500,
                              color: isActive
                                ? "var(--text-ink)"
                                : "var(--text-muted)",
                              marginBottom: 3,
                            }}
                          >
                            {step.title}
                          </div>

                          {/* Expanded content for active step */}
                          {isActive && (
                            <>
                              <div
                                style={{
                                  fontFamily: "var(--font-body)",
                                  fontSize: 11,
                                  color: "var(--text-muted)",
                                  lineHeight: 1.55,
                                  marginBottom: 8,
                                }}
                              >
                                {step.description}
                              </div>

                              {step.videoTimestamp !== null && (
                                <Link
                                  href={`/learn/${config?.videoTaskId ?? taskId}`}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontFamily: "var(--font-body)",
                                    fontSize: 10,
                                    color: "var(--teal)",
                                    textDecoration: "none",
                                    marginBottom: 8,
                                  }}
                                >
                                  <Clock
                                    style={{ width: 10, height: 10 }}
                                  />
                                  Watch video at{" "}
                                  {Math.floor(step.videoTimestamp / 60)}:
                                  {String(step.videoTimestamp % 60).padStart(
                                    2,
                                    "0"
                                  )}
                                </Link>
                              )}

                              {/* Hint box */}
                              <div
                                style={{
                                  background: "var(--gold-dim)",
                                  border: "1px solid rgba(176,141,60,0.15)",
                                  borderRadius: 6,
                                  padding: "6px 10px",
                                  display: "flex",
                                  gap: 6,
                                  alignItems: "flex-start",
                                }}
                              >
                                <AlertTriangle
                                  style={{
                                    width: 10,
                                    height: 10,
                                    color: "var(--gold)",
                                    flexShrink: 0,
                                    marginTop: 2,
                                  }}
                                />
                                <span
                                  style={{
                                    fontFamily: "var(--font-body)",
                                    fontSize: 10,
                                    color: "var(--text-muted)",
                                    lineHeight: 1.5,
                                  }}
                                >
                                  {step.hint}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Measurements */}
            {(task.fields?.length > 0 || configMeasurements.length > 0) && (
              <div>
                <SectionLabel>Measurements</SectionLabel>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 8,
                  }}
                >
                  {task.fields?.map((field) => {
                    const cm = configMeasurements.find(
                      (m) => m.label === field.field_name
                    );
                    const fieldArtifact = artifactsByField.get(field.id);
                    const currentValue =
                      measurements[field.field_name] ??
                      field.result?.value ??
                      "";
                    const isCaptured = hasFieldValue(currentValue);
                    const isLatestCapture = latestProofCapture?.fieldId === field.id;
                    return (
                      <div
                        key={field.id}
                        style={{
                          background: isLatestCapture ? "var(--teal-dim)" : "var(--bg-surface)",
                          border: isLatestCapture
                            ? "1px solid rgba(42,124,111,0.18)"
                            : isCaptured
                              ? "1px solid rgba(42,124,111,0.12)"
                              : "1px solid var(--border)",
                          borderRadius: 6,
                          padding: "10px 12px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-body)",
                              fontSize: 11,
                              fontWeight: 500,
                              color: "var(--text-ink)",
                            }}
                          >
                            {field.field_name}
                          </span>
                          {field.field_unit && (
                            <span
                              style={{
                                fontFamily: "var(--font-body)",
                                fontSize: 8,
                                color: "var(--text-hint)",
                                background: "var(--bg-sunken)",
                                borderRadius: 3,
                                padding: "1px 4px",
                              }}
                            >
                              {field.field_unit}
                            </span>
                          )}
                          {field.resume_placeholder && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 2,
                                fontFamily: "var(--font-body)",
                                fontSize: 8,
                                color: "var(--teal)",
                                background: "var(--teal-dim)",
                                borderRadius: 3,
                                padding: "1px 4px",
                              }}
                            >
                              <FileText
                                style={{ width: 8, height: 8 }}
                              />
                              Resume
                            </span>
                          )}
                          {fieldArtifact && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 2,
                                fontFamily: "var(--font-body)",
                                fontSize: 8,
                                color:
                                  fieldArtifact.status === "ready" || fieldArtifact.status === "exported"
                                    ? "var(--teal)"
                                    : "var(--gold)",
                                background:
                                  fieldArtifact.status === "ready" || fieldArtifact.status === "exported"
                                    ? "var(--teal-dim)"
                                    : "var(--gold-dim)",
                                borderRadius: 3,
                                padding: "1px 4px",
                              }}
                            >
                              {fieldArtifact.status === "ready" || fieldArtifact.status === "exported"
                                ? "Artifact ready"
                                : "Artifact draft"}
                            </span>
                          )}
                          <span
                            style={{
                              marginLeft: "auto",
                              fontFamily: "var(--font-body)",
                              fontSize: 8,
                              color: isCaptured ? "var(--teal)" : "var(--text-hint)",
                              background: isCaptured ? "var(--teal-dim)" : "var(--bg-sunken)",
                              borderRadius: 3,
                              padding: "1px 4px",
                            }}
                          >
                            {isCaptured ? "Captured" : "Pending"}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={currentValue}
                          onChange={(e) =>
                            setMeasurements((prev) => ({
                              ...prev,
                              [field.field_name]: e.target.value,
                            }))
                          }
                          onBlur={(e) =>
                            saveMeasurement(field, e.target.value)
                          }
                          placeholder={
                            field.placeholder_text ?? "Enter value..."
                          }
                          style={{
                            width: "100%",
                            minHeight: 30,
                            background: "var(--bg-page)",
                            border: "1px solid var(--border)",
                            borderRadius: 5,
                            padding: "4px 8px",
                            fontSize: 12,
                            fontFamily: "var(--font-body)",
                            color: "var(--text-ink)",
                            outline: "none",
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor =
                              "var(--teal)";
                          }}
                          onBlurCapture={(e) => {
                            e.currentTarget.style.borderColor =
                              "var(--border)";
                          }}
                        />
                        {cm?.target && (
                          <div
                            style={{
                              fontFamily: "var(--font-body)",
                              fontSize: 9,
                              color: "var(--teal)",
                              marginTop: 4,
                            }}
                          >
                            {cm.target}
                          </div>
                        )}
                        {isLatestCapture && latestProofCapture ? (
                          <div
                            style={{
                              fontFamily: "var(--font-body)",
                              fontSize: 9,
                              color: "var(--teal)",
                              marginTop: 5,
                              lineHeight: 1.45,
                            }}
                          >
                            Captured now. {latestProofCapture.proofLabel
                              ? `Linked proof updated: ${latestProofCapture.proofLabel}`
                              : "Dashboard and proof locker now reflect this signal."}
                          </div>
                        ) : null}
                        {isCaptured && (
                          <button
                            type="button"
                            onClick={() => openFinalizeProof(field.id)}
                            style={{
                              marginTop: 8,
                              border: "none",
                              background: "transparent",
                              padding: 0,
                              fontFamily: "var(--font-body)",
                              fontSize: 10,
                              fontWeight: 600,
                              color: "var(--teal)",
                              cursor: "pointer",
                            }}
                          >
                            {fieldArtifact ? "Edit proof artifact" : "Finalize proof"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Completion checklist */}
            {!isComplete && (
              <div
                style={{
                  background: "rgba(42,124,111,0.04)",
                  border: "1px solid rgba(42,124,111,0.15)",
                  borderRadius: 8,
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 9,
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    color: "var(--teal)",
                    marginBottom: 10,
                  }}
                >
                  Before you mark complete
                </div>
                {checklistItems.map((item, i) => (
                  <label
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      marginBottom: 8,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checklist[i] ?? false}
                      onChange={() => {
                        const c = [...checklist];
                        c[i] = !c[i];
                        setChecklist(c);
                        setWarnChecklist(false);
                      }}
                      style={{
                        width: 13,
                        height: 13,
                        marginTop: 1,
                        accentColor: "var(--teal)",
                        borderRadius: 2,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: 11,
                        color: "var(--text-muted)",
                        lineHeight: 1.5,
                      }}
                    >
                      {item}
                    </span>
                  </label>
                ))}
                {warnChecklist && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 2,
                    }}
                  >
                    <AlertTriangle
                      style={{
                        width: 10,
                        height: 10,
                        color: "var(--gold)",
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: 10,
                        color: "var(--gold)",
                      }}
                    >
                      Complete all checks first
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <SectionLabel>Notes</SectionLabel>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
                placeholder={"What did you learn?\nAny key numbers?"}
                style={{
                  width: "100%",
                  minHeight: 80,
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "8px 10px",
                  fontFamily: "var(--font-body)",
                  fontSize: 11,
                  color: "var(--text-ink)",
                  resize: "vertical",
                  outline: "none",
                  lineHeight: 1.55,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--teal)";
                }}
              />
            </div>
          </div>

          {/* ─── PANE 2: Code Editor (flex:1) ─── */}
          <div
            style={{
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              background: "#16120e",
              borderRight: "1px solid var(--border)",
            }}
          >
            {/* Editor */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <MonacoEditor
                language="python"
                theme="epoch-dark"
                value={fileContents[activeFile] ?? "# Start coding..."}
                onChange={handleEditorChange}
                beforeMount={handleEditorBeforeMount}
                options={{
                  fontSize: 13,
                  fontFamily: "var(--font-mono)",
                  lineHeight: 22,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  padding: { top: 12, bottom: 12 },
                  lineNumbers: "on",
                  renderLineHighlight: "line",
                  overviewRulerLanes: 0,
                  hideCursorInOverviewRuler: true,
                  overviewRulerBorder: false,
                  scrollbar: {
                    verticalScrollbarSize: 4,
                    horizontalScrollbarSize: 4,
                  },
                  tabSize: 4,
                  insertSpaces: true,
                  wordWrap: "off",
                  automaticLayout: true,
                }}
              />
            </div>

            {/* Output panel (~160px) */}
            <div
              style={{
                height: 160,
                flexShrink: 0,
                borderTop: "1px solid #2a2520",
                display: "flex",
                flexDirection: "column",
                background: "#12100c",
              }}
            >
              {/* Output tabs + run button */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 12px",
                  height: 32,
                  borderBottom: "1px solid #2a2520",
                  flexShrink: 0,
                  gap: 0,
                }}
              >
                {(["output", "history"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setOutputTab(tab)}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      padding: "0 10px",
                      height: "100%",
                      border: "none",
                      borderBottom:
                        outputTab === tab
                          ? "2px solid var(--teal)"
                          : "2px solid transparent",
                      background: "transparent",
                      color:
                        outputTab === tab ? "#c8c0b0" : "#5a5248",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {tab}
                  </button>
                ))}

                <div style={{ flex: 1 }} />

                {/* Copy output */}
                {output && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(output);
                      toast.success("Output copied");
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#5a5248",
                      cursor: "pointer",
                      padding: 4,
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Copy output"
                  >
                    <Copy style={{ width: 12, height: 12 }} />
                  </button>
                )}

                {/* Run button */}
                {config?.requiresGPU ? (
                  <button
                    onClick={handleOpenColab}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      padding: "3px 10px",
                      borderRadius: 4,
                      border: "1px solid #2a2520",
                      background: "#1e1a14",
                      color: "#c49a3c",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <ExternalLink style={{ width: 10, height: 10 }} />
                    Colab
                  </button>
                ) : (
                  <button
                    onClick={handleRun}
                    disabled={isRunning}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      padding: "3px 10px",
                      borderRadius: 4,
                      border: "none",
                      background: isRunning
                        ? "#2a2520"
                        : "var(--teal)",
                      color: isRunning ? "#5a5248" : "#fff",
                      cursor: isRunning ? "not-allowed" : "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <Play style={{ width: 10, height: 10 }} />
                    {isRunning ? "Running..." : "Run"}
                  </button>
                )}
              </div>

              {/* Output content */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "8px 12px",
                }}
              >
                {outputTab === "output" ? (
                  <pre
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "#a89888",
                      lineHeight: 1.6,
                      margin: 0,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {output || (
                      <span style={{ color: "#5a5248", fontStyle: "italic" }}>
                        {config?.requiresGPU
                          ? "Copy code to Colab, run there, then paste output here or share with Unity."
                          : 'Click "Run" to execute, or paste real output here.'}
                      </span>
                    )}
                  </pre>
                ) : (
                  <div>
                    {runHistory.length === 0 ? (
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "#5a5248",
                          fontStyle: "italic",
                        }}
                      >
                        No runs yet.
                      </span>
                    ) : (
                      runHistory.map((entry, i) => (
                        <div
                          key={i}
                          style={{
                            marginBottom: 8,
                            paddingBottom: 8,
                            borderBottom:
                              i < runHistory.length - 1
                                ? "1px solid #2a2520"
                                : "none",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 4,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: 10,
                                color: "#5a5248",
                              }}
                            >
                              {entry.timestamp}
                            </span>
                            <span
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: 10,
                                color: "#c49a3c",
                              }}
                            >
                              {entry.duration}
                            </span>
                            <button
                              onClick={() => {
                                setOutput(entry.output);
                                setOutputTab("output");
                              }}
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: 9,
                                color: "var(--teal)",
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                            >
                              view
                            </button>
                          </div>
                          <pre
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 10,
                              color: "#8a8278",
                              lineHeight: 1.5,
                              margin: 0,
                              whiteSpace: "pre-wrap",
                              maxHeight: 40,
                              overflow: "hidden",
                            }}
                          >
                            {entry.output.slice(0, 100)}
                            {entry.output.length > 100 ? "..." : ""}
                          </pre>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── PANE 3: Unity Chat (300px) ─── */}
          <div
            className="lab-ide-chat-pane"
            style={{
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              background: "var(--bg-surface)",
              overflow: "hidden",
            }}
          >
            {/* Chat header */}
            <div
              style={{
                padding: "12px 14px 10px",
                borderBottom: "1px solid var(--border)",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <UnityLogo size={16} animated={false} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-ink)",
                    }}
                  >
                    Unity
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 9,
                      color: "var(--text-hint)",
                      marginTop: -1,
                    }}
                  >
                    Watching your session
                  </div>
                </div>
              </div>
            </div>

            {/* Chat messages */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "12px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {chatMessages.length === 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: 1,
                    textAlign: "center",
                    padding: "20px 0",
                    gap: 8,
                  }}
                >
                  <UnityLogo size={28} />
                  <p
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 11,
                      color: "var(--text-muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    I can see your code and output.
                    <br />
                    Ask me anything about this lab.
                  </p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <ChatMessage
                  key={`${msg.role}-${i}`}
                  role={msg.role}
                  content={msg.content}
                  isStreaming={msg.isStreaming}
                />
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Quick actions */}
            {chatMessages.length === 0 && (
              <div
                style={{
                  padding: "0 12px 8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                {getQuickActions().map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleChatSend(action.message)}
                    disabled={chatLoading}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                      background: "var(--bg-page)",
                      fontFamily: "var(--font-body)",
                      fontSize: 11,
                      color: "var(--text-muted)",
                      cursor: chatLoading ? "not-allowed" : "pointer",
                      transition: "all 0.15s",
                      opacity: chatLoading ? 0.5 : 1,
                    }}
                  >
                    <ArrowUp
                      style={{
                        width: 10,
                        height: 10,
                        color: "var(--teal)",
                        transform: "rotate(45deg)",
                      }}
                    />
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* Chat input */}
            <ChatInput onSend={handleChatSend} disabled={chatLoading} />
          </div>
        </div>
      </div>

      <FinalizeProofModal
        isOpen={finalizeProofOpen}
        draft={finalizeDraft}
        onClose={() => setFinalizeProofOpen(false)}
        onSave={saveProofArtifact}
      />

      {/* Time logger modal */}
      <TimeLoggerModal
        isOpen={showTimeLogger}
        onClose={() => {
          setShowTimeLogger(false);
          fetchTask();
        }}
        onSubmit={() => {
          setShowTimeLogger(false);
          toast.success("Lab completed!");
          if (task?.nextTaskId) router.push(`/lab/${task.nextTaskId}`);
          else fetchTask();
        }}
      />
    </>
  );
}
