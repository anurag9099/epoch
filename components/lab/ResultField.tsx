"use client";

import { useRef, useState } from "react";
import { FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

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

interface ResultFieldProps {
  field: Field;
  onSaved?: () => void;
}

export function ResultField({ field, onSaved }: ResultFieldProps) {
  const [value, setValue] = useState(field.result?.value ?? "");
  const [saved, setSaved] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBlur = async () => {
    await fetch(`/api/lab/${field.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    setSaved(true);
    onSaved?.();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <label className="text-sm font-body font-medium text-ink">
          {field.field_name}
        </label>
        {field.field_unit && (
          <Badge variant="muted">{field.field_unit}</Badge>
        )}
        {field.resume_placeholder && (
          <Badge variant="teal">
            <FileText className="h-3 w-3" />
            Resume metric
          </Badge>
        )}
        {saved && (
          <span className="text-xs font-body text-hint animate-pulse ml-auto">
            Saved
          </span>
        )}
      </div>
      <input
        type="text"
        className="w-full min-h-[44px] bg-sunken border border-border-warm rounded-md p-3 text-base sm:text-sm font-body text-ink placeholder:text-hint focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-all duration-150"
        placeholder={field.placeholder_text ?? ""}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
      />
    </Card>
  );
}
