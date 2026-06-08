import React from "react";

export default function ProgressRing({ value = 0, size = 120, stroke = 10, color = "#E60000", track = "#f1f1ef", label, sublabel }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(value, 0), 100) / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.7s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-extrabold text-2xl text-[var(--s2d-ink)]">{label ?? `${Math.round(value)}%`}</span>
        {sublabel && <span className="text-[11px] uppercase tracking-wider text-[var(--s2d-muted)] mt-0.5">{sublabel}</span>}
      </div>
    </div>
  );
}
