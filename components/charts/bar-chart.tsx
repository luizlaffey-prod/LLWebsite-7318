'use client';

interface Bar {
  label: string;
  value: number;
}

interface Props {
  data: Bar[];
  className?: string;
}

/**
 * Horizontal bar list using AURA's gradient. Best for top-N enumerations
 * where the labels can be long (e.g. article titles).
 */
export function BarChart({ data, className }: Props) {
  if (data.length === 0) return null;
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <ul className={className}>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <li key={i} className="mb-3 last:mb-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-text-primary">{d.label}</span>
              <span className="shrink-0 text-xs tabular-nums text-text-muted">
                {d.value}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(135deg, #00E5C8 0%, #8B5CF6 100%)',
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
