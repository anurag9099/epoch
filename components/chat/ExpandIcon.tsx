"use client";

interface ExpandIconProps {
  expanded: boolean;
  size?: number;
}

export function ExpandIcon({ expanded, size = 16 }: ExpandIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {expanded ? (
        <>
          {/* Collapse: two squares with inward arrow */}
          <rect x="1" y="5" width="10" height="10" rx="1.5" />
          <path d="M5 5V2.5A1.5 1.5 0 016.5 1H13.5A1.5 1.5 0 0115 2.5V9.5A1.5 1.5 0 0113.5 11H11" />
          <path d="M11 5L8 8" />
          <path d="M11 8V5H8" fill="currentColor" stroke="none" />
        </>
      ) : (
        <>
          {/* Expand: two squares with outward arrow */}
          <rect x="1" y="5" width="10" height="10" rx="1.5" />
          <path d="M5 5V2.5A1.5 1.5 0 016.5 1H13.5A1.5 1.5 0 0115 2.5V9.5A1.5 1.5 0 0113.5 11H11" />
          <path d="M8 8L11 5" />
          <path d="M8 5V8H11" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}
