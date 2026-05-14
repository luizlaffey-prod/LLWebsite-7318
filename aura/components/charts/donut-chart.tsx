'use client';

interface Slice {
  label: string;
  value: number;
}

interface Props {
  data: Slice[];
  size?: number;
  className?: string;
}

const COLORS = ['#00E5C8', '#8B5CF6', '#3B82F6', '#F59E0B', '#EF4444', '#10B981'];

function polar(cx: number, cy: number, r: number, angle: number) {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

function arcPath(cx: number, cy: number, r: number, inner: number, a0: number, a1: number) {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const [ix1, iy1] = polar(cx, cy, inner, a1);
  const [ix0, iy0] = polar(cx, cy, inner, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return [
    `M ${x0} ${y0}`,
    `A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`,
    `L ${ix1} ${iy1}`,
    `A ${inner} ${inner} 0 ${large} 0 ${ix0} ${iy0}`,
    'Z',
  ].join(' ');
}

export function DonutChart({ data, size = 180, className }: Props) {
  const total = data.reduce((acc, s) => acc + s.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  const inner = r * 0.62;

  if (total === 0) {
    return (
      <div className={className} style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1C2030" strokeWidth={2} />
        </svg>
      </div>
    );
  }

  let cursor = -Math.PI / 2;

  return (
    <div className={className}>
      <div className="flex items-center gap-6">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {data.map((s, i) => {
            const angle = (s.value / total) * Math.PI * 2;
            const a0 = cursor;
            const a1 = cursor + angle;
            cursor = a1;
            return (
              <path
                key={i}
                d={arcPath(cx, cy, r, inner, a0, a1)}
                fill={COLORS[i % COLORS.length]}
              />
            );
          })}
          <text
            x={cx}
            y={cy + 4}
            textAnchor="middle"
            fill="#E8EAF0"
            fontSize="20"
            fontWeight={600}
          >
            {total}
          </text>
          <text
            x={cx}
            y={cy + 22}
            textAnchor="middle"
            fill="#9CA3AF"
            fontSize="10"
          >
            total
          </text>
        </svg>

        <ul className="space-y-2 text-sm">
          {data.map((s, i) => {
            const pct = Math.round((s.value / total) * 100);
            return (
              <li key={i} className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span className="uppercase text-text-primary">{s.label}</span>
                <span className="text-text-muted text-xs tabular-nums">
                  {pct}% · {s.value}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
