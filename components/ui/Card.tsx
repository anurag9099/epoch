"use client";

import Link from "next/link";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
}

export function Card({ children, className = "", onClick, href }: CardProps) {
  const base = "bg-surface border border-border-warm rounded-lg p-4 transition-colors";

  if (href) {
    return (
      <Link href={href} className={`block ${base} hover:border-border-hover cursor-pointer ${className}`}>
        {children}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button onClick={onClick} className={`w-full text-left ${base} hover:border-border-hover cursor-pointer ${className}`}>
        {children}
      </button>
    );
  }
  return <div className={`${base} ${className}`}>{children}</div>;
}
