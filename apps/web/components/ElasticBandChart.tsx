'use client';

import { useMemo } from 'react';
import type { ElasticBandSummary } from '@/lib/types';

interface Props {
  summary: ElasticBandSummary;
  activeIteration: number; // 1-based; 0 means "all iterations overlaid"
  onSelectStrength?: (strength: number) => void;
}

const W = 720;
const H = 320;
const M = { top: 24, right: 24, bottom: 44, left: 56 };

export default function ElasticBandChart({ summary, activeIteration, onSelectStrength }: Props) {
  const iterations = summary.elastic_search_result?.iterations ?? [];
  const validRange = summary.valid_range;
  const maxDist = summary.max_dreamsim_distance ?? null;

  // Collect every (strength, distance) pair seen across all iterations to compute extents
  const allPoints = useMemo(() => {
    const pts: { strength: number; distance: number; iter: number }[] = [];
    iterations.forEach((it, idx) => {
      (it.reference_distances ?? []).forEach((rd) =>
        pts.push({ strength: rd.strength, distance: rd.dreamsim_to_reference, iter: idx + 1 }),
      );
    });
    return pts;
  }, [iterations]);

  if (!iterations.length || allPoints.length === 0) {
    return <div className="text-sm text-ink-400">no iteration data in summary</div>;
  }

  const xs = allPoints.map((p) => p.strength);
  const ys = allPoints.map((p) => Math.max(0, p.distance));
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = 0;
  const yMax = Math.max(maxDist ?? 0, ...ys) * 1.05;

  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;
  const xScale = (x: number) =>
    M.left + ((x - xMin) / Math.max(1e-9, xMax - xMin)) * innerW;
  const yScale = (y: number) =>
    M.top + innerH - ((y - yMin) / Math.max(1e-9, yMax - yMin)) * innerH;

  // x-axis ticks: use the union of all unique strengths
  const xTicks = Array.from(new Set(xs)).sort((a, b) => a - b);
  const yTicks = makeTicks(yMin, yMax, 5);

  const visibleIterations =
    activeIteration === 0 ? iterations : iterations.filter((_, i) => i + 1 === activeIteration);

  const palette = [
    '#7aa2ff',
    '#a6e3a1',
    '#f9e2af',
    '#fab387',
    '#f38ba8',
    '#cba6f7',
    '#94e2d5',
  ];

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-ink-300" role="img">
        {/* valid range shading */}
        {validRange && (
          <rect
            x={xScale(validRange.minimum_valid_value)}
            y={M.top}
            width={Math.max(
              0,
              xScale(validRange.maximum_valid_value) - xScale(validRange.minimum_valid_value),
            )}
            height={innerH}
            fill="#3f6fe0"
            opacity={0.07}
          />
        )}

        {/* y grid + ticks */}
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line
              x1={M.left}
              x2={M.left + innerW}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke="#262d3f"
              strokeWidth={1}
            />
            <text
              x={M.left - 8}
              y={yScale(t)}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={11}
              fill="currentColor"
            >
              {t.toFixed(2)}
            </text>
          </g>
        ))}

        {/* max-distance ceiling */}
        {maxDist != null && maxDist <= yMax && (
          <g>
            <line
              x1={M.left}
              x2={M.left + innerW}
              y1={yScale(maxDist)}
              y2={yScale(maxDist)}
              stroke="#f38ba8"
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.7}
            />
            <text
              x={M.left + innerW}
              y={yScale(maxDist) - 4}
              textAnchor="end"
              fontSize={10}
              fill="#f38ba8"
            >
              max_dreamsim_distance = {maxDist}
            </text>
          </g>
        )}

        {/* x ticks + axis */}
        <line
          x1={M.left}
          x2={M.left + innerW}
          y1={M.top + innerH}
          y2={M.top + innerH}
          stroke="#3a4257"
        />
        {xTicks.map((t) => (
          <g key={`x${t}`}>
            <line
              x1={xScale(t)}
              x2={xScale(t)}
              y1={M.top + innerH}
              y2={M.top + innerH + 4}
              stroke="#3a4257"
            />
            <text
              x={xScale(t)}
              y={M.top + innerH + 18}
              textAnchor="middle"
              fontSize={11}
              fill="currentColor"
            >
              {t.toFixed(2)}
            </text>
          </g>
        ))}

        {/* axis labels */}
        <text
          x={M.left + innerW / 2}
          y={H - 8}
          textAnchor="middle"
          fontSize={11}
          fill="#7e879a"
        >
          steering strength
        </text>
        <text
          transform={`translate(14, ${M.top + innerH / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize={11}
          fill="#7e879a"
        >
          dreamsim to reference
        </text>

        {/* one polyline per visible iteration */}
        {visibleIterations.map((it, vIdx) => {
          const realIdx = iterations.indexOf(it);
          const color = palette[realIdx % palette.length];
          const pts = (it.reference_distances ?? [])
            .slice()
            .sort((a, b) => a.strength - b.strength)
            .map((p) => `${xScale(p.strength)},${yScale(Math.max(0, p.dreamsim_to_reference))}`)
            .join(' ');
          const points = (it.reference_distances ?? []).slice().sort((a, b) => a.strength - b.strength);
          return (
            <g key={realIdx}>
              <polyline
                points={pts}
                fill="none"
                stroke={color}
                strokeWidth={activeIteration === 0 ? 1.5 : 2.5}
                opacity={activeIteration === 0 ? 0.55 : 1}
              />
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={xScale(p.strength)}
                  cy={yScale(Math.max(0, p.dreamsim_to_reference))}
                  r={4}
                  fill={color}
                  stroke="#0c0f1a"
                  strokeWidth={1}
                  className={onSelectStrength ? 'cursor-pointer' : ''}
                  onClick={onSelectStrength ? () => onSelectStrength(p.strength) : undefined}
                >
                  <title>
                    iter {realIdx + 1} · strength {p.strength.toFixed(3)} · dist{' '}
                    {p.dreamsim_to_reference.toFixed(3)}
                  </title>
                </circle>
              ))}
            </g>
          );
        })}

        {/* control point ticks for active iteration */}
        {activeIteration > 0 &&
          iterations[activeIteration - 1]?.control_points_after?.map((cp, i) => (
            <line
              key={`cp${i}`}
              x1={xScale(cp)}
              x2={xScale(cp)}
              y1={M.top + innerH - 6}
              y2={M.top + innerH + 6}
              stroke="#a6e3a1"
              strokeWidth={1.5}
            />
          ))}
      </svg>
    </div>
  );
}

function makeTicks(min: number, max: number, count: number): number[] {
  const step = (max - min) / count;
  const result: number[] = [];
  for (let i = 0; i <= count; i++) {
    const v = min + step * i;
    result.push(Math.round(v * 1000) / 1000);
  }
  return result;
}
