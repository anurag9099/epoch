"use client";

interface UnityLogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export function UnityLogo({ size = 24, className = "", animated = true }: UnityLogoProps) {
  const r = size / 2;
  const orbSize = size * 0.15;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-label="Unity"
    >
      <circle
        cx={r}
        cy={r}
        r={r * 0.6}
        fill="none"
        stroke="var(--teal)"
        strokeWidth={size * 0.06}
        strokeLinecap="round"
      />

      <circle cx={r} cy={r} r={orbSize} fill="var(--teal)">
        {animated && (
          <animate
            attributeName="r"
            values={`${orbSize};${orbSize * 1.3};${orbSize}`}
            dur="2s"
            repeatCount="indefinite"
          />
        )}
      </circle>

      {[0, 120, 240].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const orbitR = r * 0.6;
        const cx = r + Math.cos(rad) * orbitR;
        const cy = r + Math.sin(rad) * orbitR;
        const opacities = [0.9, 0.6, 0.35];
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={orbSize * 0.6}
            fill="var(--teal)"
            opacity={opacities[i]}
          >
            {animated && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={`${angle} ${r} ${r}`}
                to={`${angle + 360} ${r} ${r}`}
                dur="8s"
                repeatCount="indefinite"
              />
            )}
          </circle>
        );
      })}
    </svg>
  );
}
