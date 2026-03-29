"use client";

import { useEffect, useState } from "react";

export function ProgressRing({
  done,
  total,
}: {
  done: number;
  total: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const radius = 40;
  const stroke = 5;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const pct = total > 0 ? done / total : 0;
  const offset = circumference - (mounted ? pct : 0) * circumference;
  const displayPct = Math.round(pct * 100);

  return (
    <div className="relative flex items-center justify-center" style={{ width: radius * 2, height: radius * 2 }}>
      <svg
        width={radius * 2}
        height={radius * 2}
        className="-rotate-90 absolute inset-0"
      >
        {/* Track */}
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          stroke="#EFEDE9"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          stroke="#E8622A"
          strokeWidth={stroke}
          strokeLinecap="square"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <div className="relative text-center">
        <p className="text-lg font-semibold leading-none" style={{ color: "var(--mantine-color-gray-9)" }}>{displayPct}%</p>
      </div>
    </div>
  );
}
