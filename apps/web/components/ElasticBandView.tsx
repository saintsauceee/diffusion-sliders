'use client';

import { useMemo, useState } from 'react';
import type { Concept, ElasticBand } from '@/lib/types';
import { asset, formatStrength, strengthColor } from '@/lib/url';
import ElasticBandChart from './ElasticBandChart';
import Lightbox, { type LightboxImage } from './Lightbox';

interface Props {
  concept: Concept;
  band: ElasticBand;
}

export default function ElasticBandView({ concept, band }: Props) {
  const iterations = band.summary?.elastic_search_result?.iterations ?? [];
  const [activeIter, setActiveIter] = useState<number>(iterations.length); // default: last iteration
  const [lbIndex, setLbIndex] = useState<number | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const finalCps = band.summary?.elastic_search_result?.final_control_points ?? [];
  const validCps = band.summary?.elastic_search_result?.valid_control_points ?? [];

  const lbImages: LightboxImage[] = useMemo(
    () =>
      band.strengths.map((s) => ({
        url: s.url,
        strength: s.strength,
        caption: `${concept.name} · elastic_band`,
      })),
    [band.strengths, concept.name],
  );

  const activeIt = activeIter > 0 ? iterations[activeIter - 1] : null;

  return (
    <div className="px-6 py-5">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Chart + iteration controls — spans 2 cols */}
        <section className="xl:col-span-2">
          <div className="rounded-xl border border-ink-700 bg-ink-800/40 p-4">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-200">
                  Elastic-band search
                </h3>
                <p className="text-xs text-ink-400">
                  {iterations.length} iteration{iterations.length === 1 ? '' : 's'} ·{' '}
                  {band.summary?.elastic_search_result?.stop_reason ?? 'unknown stop'}
                </p>
              </div>
              <div className="text-right text-xs text-ink-400">
                {band.summary?.valid_range && (
                  <>
                    valid range:{' '}
                    <span className="font-mono text-ink-200">
                      [{band.summary.valid_range.minimum_valid_value.toFixed(2)},{' '}
                      {band.summary.valid_range.maximum_valid_value.toFixed(2)}]
                    </span>
                  </>
                )}
              </div>
            </div>

            <ElasticBandChart
              summary={band.summary!}
              activeIteration={activeIter}
              onSelectStrength={(strength) => {
                const i = band.strengths.findIndex((s) => Math.abs(s.strength - strength) < 1e-6);
                if (i >= 0) setLbIndex(i);
              }}
            />

            {/* Iteration scrubber */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs uppercase tracking-wider text-ink-400">
                iteration
              </span>
              <button
                onClick={() => setActiveIter(0)}
                className={
                  'rounded-full border px-3 py-1 text-xs ' +
                  (activeIter === 0
                    ? 'border-accent-500 bg-accent-500/15 text-ink-50'
                    : 'border-ink-700 bg-ink-800 text-ink-300 hover:text-ink-100')
                }
              >
                all
              </button>
              {iterations.map((it, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIter(i + 1)}
                  className={
                    'rounded-full border px-3 py-1 text-xs ' +
                    (activeIter === i + 1
                      ? 'border-accent-500 bg-accent-500/15 text-ink-50'
                      : 'border-ink-700 bg-ink-800 text-ink-300 hover:text-ink-100')
                  }
                  title={it.action}
                >
                  {i + 1}
                  <span className="ml-1 text-ink-500">{it.action === 'expand' ? '⊕' : '↔'}</span>
                </button>
              ))}
            </div>

            {/* Iteration details */}
            {activeIt && (
              <div className="mt-4 rounded-lg bg-ink-900/60 p-3 text-xs">
                <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-ink-400">
                  <span>
                    action: <span className="text-ink-200">{activeIt.action}</span>
                  </span>
                  {activeIt.base_step != null && (
                    <span>
                      base_step:{' '}
                      <span className="font-mono text-ink-200">{activeIt.base_step}</span>
                    </span>
                  )}
                  {activeIt.inserted_midpoint != null && (
                    <span>
                      inserted_midpoint:{' '}
                      <span className="font-mono text-ink-200">{activeIt.inserted_midpoint}</span>
                    </span>
                  )}
                </div>

                {activeIt.control_points_before && activeIt.control_points_after && (
                  <ControlPointsRow
                    before={activeIt.control_points_before}
                    after={activeIt.control_points_after}
                  />
                )}

                {activeIt.updates && activeIt.updates.length > 0 && (
                  <div className="mt-2 text-ink-300">
                    {activeIt.updates.map((u, i) => (
                      <div key={i} className="font-mono">
                        cp[{u.index}]: {u.old_value.toFixed(3)} → {u.new_value.toFixed(3)}{' '}
                        <span className="text-ink-500">
                          ({u.direction}, step {u.step_size?.toFixed(3)})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right column: search outcomes */}
        <section className="space-y-4">
          <SummaryCard title="Final control points" values={finalCps} />
          <SummaryCard
            title="Valid control points"
            values={validCps}
            note="subset retained for inference"
          />
          {band.summary?.initialization && (
            <div className="rounded-xl border border-ink-700 bg-ink-800/40 p-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-ink-200">
                Initialization
              </h3>
              <div className="space-y-1 text-xs">
                <KV
                  k="initial_min_projection"
                  v={fmt(band.summary.initialization.initial_min_projection_value)}
                />
                <KV
                  k="effective_minimum"
                  v={fmt(band.summary.initialization.effective_minimum_value)}
                />
                <KV
                  k="search_minimum"
                  v={fmt(band.summary.initialization.search_minimum_value)}
                />
                {band.summary.initialization.doubling_attempts && (
                  <div className="mt-2 text-ink-400">
                    doubling attempts:
                    <ul className="ml-2 mt-1 space-y-0.5">
                      {band.summary.initialization.doubling_attempts.map((d, i) => (
                        <li key={i} className="font-mono text-ink-300">
                          α={d.strength.toFixed(2)} → dist=
                          {d.dreamsim_to_reference.toFixed(3)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Filmstrip of rendered strengths */}
      <section className="mt-6 rounded-xl border border-ink-700 bg-ink-800/40 p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-200">
              Rendered strengths
            </h3>
            <p className="text-xs text-ink-400">click any tile for full resolution</p>
          </div>
          <span className="text-xs text-ink-500">{band.strengths.length} images</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {band.strengths.map((s, i) => (
            <button
              key={s.url}
              onClick={() => setLbIndex(i)}
              className="group flex w-[140px] flex-col items-center overflow-hidden rounded-lg border border-ink-700 bg-ink-900 transition-colors hover:border-accent-500"
            >
              <img
                src={asset(s.url)}
                alt={`strength ${s.strength}`}
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
              <span
                className="w-full px-1 py-1 text-center font-mono text-xs text-ink-900"
                style={{ background: strengthColor(s.strength) }}
              >
                {formatStrength(s.strength)}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Raw JSON */}
      {band.summary && (
        <section className="mt-6">
          <button
            onClick={() => setShowRawJson((v) => !v)}
            className="text-xs uppercase tracking-wider text-ink-400 hover:text-ink-200"
          >
            {showRawJson ? '▾' : '▸'} raw summary.json
          </button>
          {showRawJson && (
            <pre className="mt-2 max-h-96 overflow-auto rounded-lg border border-ink-700 bg-ink-900 p-3 text-[11px] text-ink-300">
              {JSON.stringify(band.summary, null, 2)}
            </pre>
          )}
        </section>
      )}

      {lbIndex != null && (
        <Lightbox
          images={lbImages}
          index={lbIndex}
          onIndexChange={setLbIndex}
          onClose={() => setLbIndex(null)}
        />
      )}
    </div>
  );
}

function ControlPointsRow({ before, after }: { before: number[]; after: number[] }) {
  const allValues = Array.from(new Set([...before, ...after])).sort((a, b) => a - b);
  return (
    <div className="space-y-1">
      <Row label="before" values={before} />
      <Row label="after" values={after} highlight={after.map((v, i) => v !== before[i])} />
    </div>
  );
  function Row({
    label,
    values,
    highlight,
  }: {
    label: string;
    values: number[];
    highlight?: boolean[];
  }) {
    return (
      <div className="flex items-center gap-2 font-mono">
        <span className="w-14 text-ink-500">{label}</span>
        {values.map((v, i) => (
          <span
            key={i}
            className={
              'rounded px-1.5 ' +
              (highlight?.[i] ? 'bg-accent-500/30 text-ink-50' : 'text-ink-300')
            }
          >
            {v.toFixed(2)}
          </span>
        ))}
      </div>
    );
  }
}

function SummaryCard({
  title,
  values,
  note,
}: {
  title: string;
  values: number[];
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-800/40 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-200">{title}</h3>
      {note && <p className="mb-2 text-xs text-ink-400">{note}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <span
            key={i}
            className="rounded-md px-2 py-0.5 font-mono text-xs text-ink-900"
            style={{ background: strengthColor(v) }}
          >
            {v >= 0 ? '+' : '−'}
            {Math.abs(v).toFixed(2)}
          </span>
        ))}
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-500">{k}</span>
      <span className="font-mono text-ink-200">{v}</span>
    </div>
  );
}

function fmt(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toFixed(3);
}
