"use client";

interface BadgeProps {
  variant?: "teal" | "rust" | "gold" | "muted";
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<NonNullable<BadgeProps["variant"]>, string> = {
  teal: "bg-teal-dim text-teal",
  rust: "bg-rust-dim text-rust",
  gold: "bg-gold-dim text-gold",
  muted: "bg-sunken text-hint",
};

export function Badge({
  variant = "muted",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-[10px] font-body font-medium inline-flex items-center gap-1 ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
