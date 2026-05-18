'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  Concept,
  Dimension,
  InferenceCell,
  InferenceTree,
  Regime,
  SweepValue,
  TokenMode,
} from '@/lib/types';
import { asset, formatStrength, strengthColor } from '@/lib/url';
import Lightbox, { type LightboxImage } from './Lightbox';

interface Props {
  concept: Concept;
  tree: InferenceTree;
}

const DIM_LABEL: Record<Dimension, string> = {
  cfg: 'CFG',
  temp: 'Temperature',
  top_k: 'Top-k',
};

const REGIME_LABEL: Record<Regime, string> = {
  'prompt-only': 'prompt-only',
  'every-step': 'every-step',
};

type ModeView = TokenMode | 'both';

export default function InferenceView({ concept, tree }: Props) {
  const availableRegimes = useMemo(
    () => (Object.keys(tree) as Regime[]).filter((r) => tree[r]),
    [tree],
  );
  const [regime, setRegime] = useState<Regime>(availableRegimes[0]);
  useEffect(() => {
    if (!availableRegimes.includes(regime)) setRegime(availableRegimes[0]);
  }, [availableRegimes, regime]);

  const regimeDims = tree[regime] ?? {};
  const availableDims = useMemo(
    () => (Object.keys(regimeDims) as Dimension[]).filter((d) => regimeDims[d]),
    [regimeDims],
  );
  const [dimension, setDimension] = useState<Dimension>(availableDims[0]);
  useEffect(() => {
    if (!availableDims.includes(dimension)) setDimension(availableDims[0]);
  }, [availableDims, dimension]);

  const sweepValues = regimeDims[dimension] ?? [];
  const [sweepIndex, setSweepIndex] = useState(0);
  useEffect(() => {
    setSweepIndex(0);
  }, [regime, dimension]);
  const currentSweep: SweepValue | undefined = sweepValues[sweepIndex];

  const availableModes = useMemo<TokenMode[]>(() => {
    if (!currentSweep) return [];
    return (Object.keys(currentSweep.modes) as TokenMode[]).filter(
      (m) => currentSweep.modes[m],
    );
  }, [currentSweep]);

  const [modeView, setModeView] = useState<ModeView>('both');
  useEffect(() => {
    if (availableModes.length === 1) setModeView(availableModes[0]);
    else if (availableModes.length > 1) setModeView('both');
  }, [availableModes.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lightbox state
  const [lb, setLb] = useState<{
    mode: TokenMode;
    index: number;
  } | null>(null);

  if (!currentSweep) {
    return (
      <div className="p-8 text-ink-400">No sweep values for this regime/dimension.</div>
    );
  }

  const localized = currentSweep.modes.localized;
  const broadcast = currentSweep.modes.broadcast;

  const lightboxData = (() => {
    if (!lb) return null;
    const cell = currentSweep.modes[lb.mode];
    if (!cell) return null;
    const images: LightboxImage[] = cell.strengths.map((s) => ({
      url: s.url,
      strength: s.strength,
      caption: `${concept.name} · ${REGIME_LABEL[regime]} · ${DIM_LABEL[dimension]}=${currentSweep.label.replace(/^[^_]+_/, '')}`,
    }));
    // If both modes exist, expose the other as alt for side-by-side compare
    const otherMode: TokenMode = lb.mode === 'localized' ? 'broadcast' : 'localized';
    const otherCell = currentSweep.modes[otherMode];
    const altImages: LightboxImage[] | undefined = otherCell?.strengths.map((s) => ({
      url: s.url,
      strength: s.strength,
    }));
    return { images, altImages, otherMode };
  })();

  return (
    <div className="px-6 py-5">
      {/* Regime tabs */}
      <ControlRow label="Regime">
        {availableRegimes.map((r) => (
          <PillButton key={r} active={r === regime} onClick={() => setRegime(r)}>
            {REGIME_LABEL[r]}
          </PillButton>
        ))}
      </ControlRow>

      {/* Dimension tabs */}
      <ControlRow label="Dimension">
        {availableDims.map((d) => (
          <PillButton key={d} active={d === dimension} onClick={() => setDimension(d)}>
            {DIM_LABEL[d]}
          </PillButton>
        ))}
      </ControlRow>

      {/* Sweep value chips */}
      <ControlRow label={`${DIM_LABEL[dimension]} value`}>
        {sweepValues.map((v, i) => {
          const valStr = v.label.replace(/^[^_]+_/, '').replace(/_/g, '.');
          return (
            <PillButton key={v.label} active={i === sweepIndex} onClick={() => setSweepIndex(i)}>
              <span className="font-mono">{valStr}</span>
            </PillButton>
          );
        })}
      </ControlRow>

      {/* Token mode toggle */}
      {availableModes.length > 1 && (
        <ControlRow label="Token mode">
          <PillButton active={modeView === 'both'} onClick={() => setModeView('both')}>
            Both (compare)
          </PillButton>
          {availableModes.map((m) => (
            <PillButton key={m} active={modeView === m} onClick={() => setModeView(m)}>
              {m}
            </PillButton>
          ))}
        </ControlRow>
      )}

      {/* Grid + filmstrip per visible mode */}
      <div
        className={
          modeView === 'both' && availableModes.length > 1
            ? 'mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2'
            : 'mt-6 flex flex-col gap-6'
        }
      >
        {(modeView === 'both' || modeView === 'localized') && localized && (
          <CellPanel
            title="localized"
            subtitle={`steering applied at tokens_to_edit (${concept.meta.tokensToEdit?.join(', ') ?? '—'})`}
            cell={localized}
            onPick={(i) => setLb({ mode: 'localized', index: i })}
          />
        )}
        {(modeView === 'both' || modeView === 'broadcast') && broadcast && (
          <CellPanel
            title="broadcast"
            subtitle="steering applied to the whole prefill"
            cell={broadcast}
            onPick={(i) => setLb({ mode: 'broadcast', index: i })}
          />
        )}
      </div>

      {/* Lightbox */}
      {lb && lightboxData && (
        <Lightbox
          images={lightboxData.images}
          index={lb.index}
          onIndexChange={(i) => setLb({ ...lb, index: i })}
          onClose={() => setLb(null)}
          altImages={modeView === 'both' ? lightboxData.altImages : undefined}
          primaryLabel={lb.mode}
          altLabel={modeView === 'both' ? lightboxData.otherMode : undefined}
        />
      )}
    </div>
  );
}

// --- subcomponents ---------------------------------------------------------

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-3">
      <span className="w-32 shrink-0 text-xs uppercase tracking-wider text-ink-400">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        'rounded-full border px-3 py-1 text-sm transition-colors ' +
        (active
          ? 'border-accent-500 bg-accent-500/15 text-ink-50'
          : 'border-ink-700 bg-ink-800 text-ink-300 hover:border-ink-600 hover:text-ink-100')
      }
    >
      {children}
    </button>
  );
}

function CellPanel({
  title,
  subtitle,
  cell,
  onPick,
}: {
  title: string;
  subtitle: string;
  cell: InferenceCell;
  onPick: (index: number) => void;
}) {
  return (
    <section className="rounded-xl border border-ink-700 bg-ink-800/40 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-200">{title}</h3>
          <p className="text-xs text-ink-400">{subtitle}</p>
        </div>
        <span className="text-xs text-ink-500">{cell.strengths.length} strengths</span>
      </div>

      {cell.grid && (
        <button
          onClick={() => onPick(Math.floor(cell.strengths.length / 2))}
          className="group block w-full overflow-hidden rounded-lg border border-ink-700 bg-ink-900 transition-shadow hover:border-accent-500"
          title="Click any strength below to open full-res"
        >
          <img
            src={asset(cell.grid)}
            alt={`${title} grid`}
            className="block w-full"
            loading="lazy"
          />
        </button>
      )}

      <Filmstrip strengths={cell.strengths} onPick={onPick} />
    </section>
  );
}

function Filmstrip({
  strengths,
  onPick,
}: {
  strengths: InferenceCell['strengths'];
  onPick: (i: number) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {strengths.map((s, i) => (
        <button
          key={s.url}
          onClick={() => onPick(i)}
          className="group flex w-[88px] flex-col items-center overflow-hidden rounded-md border border-ink-700 bg-ink-900 transition-colors hover:border-accent-500"
        >
          <img
            src={asset(s.url)}
            alt={`strength ${s.strength}`}
            loading="lazy"
            className="aspect-square w-full object-cover"
          />
          <span
            className="w-full px-1 py-1 text-center font-mono text-[10px] text-ink-900"
            style={{ background: strengthColor(s.strength) }}
          >
            {formatStrength(s.strength)}
          </span>
        </button>
      ))}
    </div>
  );
}
