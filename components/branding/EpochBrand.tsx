"use client";

import Link from "next/link";

interface EpochBrandProps {
  compact?: boolean;
  descriptor?: string;
  href?: string;
  showDescriptor?: boolean;
}

export function EpochBrand({
  compact = false,
  descriptor = "Focused Paths for AI Engineers",
  href = "/",
  showDescriptor = true,
}: EpochBrandProps) {
  return (
    <Link href={href} className="group inline-flex min-w-0 items-start">
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate font-display font-semibold tracking-tight text-ink transition-colors group-hover:text-teal ${
            compact ? "text-lg" : "text-xl"
          }`}
        >
          Epoch
        </span>
        {showDescriptor ? (
          <span className="mt-1 block text-[10px] leading-4 text-hint">
            {descriptor}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
