"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { NotesEditor } from "@/components/learn/NotesEditor";
import { ResultField } from "./ResultField";
import { TerminalOutput } from "./TerminalOutput";

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

interface LabFormProps {
  task: Task;
  onStatusChange: (newStatus: string) => void;
  onResultSaved?: () => void;
}

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "complete", label: "Complete" },
];

export function LabForm({ task, onStatusChange, onResultSaved }: LabFormProps) {
  const [status, setStatus] = useState(task.status);

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    onStatusChange(newStatus);
  };

  const terminalField = task.fields?.[0];
  const terminalInitial = terminalField?.result?.terminal_output ?? "";

  return (
    <div className="space-y-6">
      {/* Status toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleStatusChange(opt.value)}
            className={`px-4 py-2 min-h-[44px] rounded-md text-sm font-body font-medium transition-all duration-150 cursor-pointer ${
              status === opt.value
                ? "bg-teal text-white"
                : "bg-surface text-muted border border-border-warm hover:bg-sunken"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Task description */}
      {task.description && (
        <Card>
          <div className="text-sm font-body text-muted whitespace-pre-wrap leading-relaxed">
            {task.description}
          </div>
        </Card>
      )}

      {/* Divider */}
      <hr className="border-border-warm" />

      {/* Measurements */}
      {task.fields && task.fields.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-display font-semibold text-ink">
            Measurements
          </h2>
          {task.fields.map((field) => (
            <ResultField key={field.id} field={field} onSaved={onResultSaved} />
          ))}
        </div>
      )}

      {/* Divider */}
      {terminalField && <hr className="border-border-warm" />}

      {/* Terminal Output */}
      {terminalField && (
        <Card>
          <TerminalOutput
            fieldId={terminalField.id}
            initialValue={terminalInitial}
          />
        </Card>
      )}

      {/* Divider */}
      <hr className="border-border-warm" />

      {/* Notes */}
      <Card>
        <NotesEditor
          initialValue={task.notes ?? ""}
          taskId={String(task.id)}
          field="notes"
        />
      </Card>
    </div>
  );
}
