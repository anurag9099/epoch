"use client";

import { Moon, SunMedium } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

interface ThemeToggleProps {
  compact?: boolean;
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const icon = theme === "dark" ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />;
  const label = theme === "dark" ? "Light" : "Dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className={`inline-flex items-center rounded-xl border transition-colors ${
        compact ? "justify-center h-10 w-10" : "gap-2 px-3 py-2"
      }`}
      style={{
        borderColor: "var(--border)",
        background: "var(--bg-page)",
        color: "var(--text-muted)",
      }}
    >
      {icon}
      {compact ? <span className="sr-only">{label}</span> : <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>}
    </button>
  );
}
