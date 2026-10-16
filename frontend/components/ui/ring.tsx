import { cn } from "@/lib/utils";

const R = 52;
const C = 2 * Math.PI * R;

/** Single-value progress ring (DESIGN.md §4 "Persona halka kartı"). */
export function Ring({
  value,
  color,
  size = 96,
  stroke = 10,
  label,
  children,
  className,
}: {
  value: number; // 0..1
  color: string;
  size?: number;
  stroke?: number;
  label: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={label}>
        <circle cx="60" cy="60" r={R} fill="none" stroke="hsl(var(--secondary))" strokeWidth={stroke} />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${v * C} ${C}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">{children}</div>
    </div>
  );
}

export interface Segment {
  value: number;
  color: string;
  label: string;
}

/** Ring split into consecutive slices with a small gap between them (DESIGN.md §4 "Segmentli halka"). */
export function SegmentRing({
  segments,
  size = 220,
  stroke = 12,
  children,
  className,
}: {
  segments: Segment[];
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
  className?: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const gap = segments.filter((s) => s.value > 0).length > 1 ? 2 : 0;
  // Each segment starts where the previous ones end.
  const offsets = segments.map((_, i) => segments.slice(0, i).reduce((sum, s) => sum + (s.value / total) * C, 0));
  const label = segments.map((s) => `${s.label} ${s.value}`).join(", ");

  return (
    <div className={cn("relative mx-auto aspect-square w-full", className)} style={{ maxWidth: size }}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={label}>
        <circle cx="60" cy="60" r={R} fill="none" stroke="hsl(var(--secondary))" strokeWidth={stroke} />
        {segments.map((s, i) => {
          const length = Math.max(0, (s.value / total) * C - gap);
          return (
            <circle
              key={s.label}
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${length} ${C - length}`}
              strokeDashoffset={-offsets[i]}
              className="transition-[stroke-dasharray] duration-700 ease-out"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 grid place-content-center gap-1 text-center">{children}</div>
    </div>
  );
}
