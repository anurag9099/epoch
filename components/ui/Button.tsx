"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";

interface ButtonProps {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  href?: string;
  className?: string;
  type?: "button" | "submit" | "reset";
}

export function Button({
  variant = "primary",
  children,
  onClick,
  disabled = false,
  loading = false,
  href,
  className = "",
  type = "button",
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-body text-xs transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-page";

  const variants = {
    primary: "bg-teal hover:bg-teal-hover text-white font-medium rounded-md px-4 py-2",
    secondary:
      "bg-surface hover:bg-sunken text-ink border border-border-warm rounded-md px-4 py-2",
  };

  const disabledStyles =
    disabled || loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer";

  const classes = `${base} ${variants[variant]} ${disabledStyles} ${className}`;

  const content = (
    <>
      {loading && (
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
      )}
      {children}
    </>
  );

  if (href && !disabled && !loading) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
    >
      {content}
    </button>
  );
}
