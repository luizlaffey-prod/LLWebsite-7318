'use client';

import { useMemo } from 'react';

interface Point {
  date: string;
  count: number;
}

interface Props {
  data: Point[];
  height?: number;
  className?: string;
}

/**
 * Minimal AURA-styled line chart. No dependency, no DOM heuristics — just
 * an SVG with a teal→violet gradient stroke + dot markers + an x-axis
 * label every Nth tick.
 */
export function LineChart({ data, height = 200, className }: Props) {
  const { width, points, ticks } = useMemo(() => {
    const w = 800;
    const max = Math.max(1, ...data.map((d) => d.count));
    const padX = 32;
    const padY = 20;
    const innerW = w - padX * 2;
    const innerH = height - padY * 2;
    const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;
    const pts = data.map((d, i) => {
      const x = padX + stepX * i;
      const y = padY + innerH - (d.count / max) * innerH;
      return { x, y, count: d.count, date: d.date };
    });
    const tickStride = Math.max(1, Math.ceil(data.length / 7));
    const tk = pts
      .map((p, i) => ({ ...p, show: i % tickStride === 0 || i === data.length - 1 }))
      .filter((p) => p.show);
    return { width: w, points: pts, ticks: tk };
  }, [data, height]);

  if (data.length === 0) return null;

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    path +
    ` L ${points[points.length - 1].x.toFixed(1)} ${height - 20} L ${points[0].x.toFixed(1)} ${height - 20} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-label="Audios per day"
    >
      <defs>
        <linearGradient id="aura-line-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00E5C8" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="aura-line-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00E5C8" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#00E5C8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#aura-line-area)" />
      <path d={path} fill="none" stroke="url(#aura-line-gradient)" strokeWidth={2} />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#00E5C8" />
      ))}
      {ticks.map((t, i) => (
        <text
          key={i}
          x={t.x}
          y={height - 4}
          fill="#4B5263"
          fontSize="10"
          textAnchor="middle"
        >
          {t.date.slice(5)}
        </text>
      ))}
    </svg>
  );
}
