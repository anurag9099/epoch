import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        page:          "var(--bg-page)",
        surface:       "var(--bg-surface)",
        sunken:        "var(--bg-sunken)",
        video:         "var(--bg-video)",
        "border-warm": "var(--border)",
        "border-hover":"var(--border-hover)",
        ink:           "var(--text-ink)",
        muted:         "var(--text-muted)",
        hint:          "var(--text-hint)",
        disabled:      "var(--text-disabled)",
        teal:          "var(--teal)",
        "teal-dim":    "var(--teal-dim)",
        "teal-hover":  "var(--teal-hover)",
        rust:          "var(--rust)",
        "rust-dim":    "var(--rust-dim)",
        gold:          "var(--gold)",
        "gold-dim":    "var(--gold-dim)",
      },
      borderRadius: {
        sm: "3px",
        md: "6px",
        lg: "8px",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body:    ["var(--font-body)"],
        mono:    ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};
export default config;
