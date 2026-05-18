'use client';

import { useCallback, useEffect } from 'react';
import { asset, formatStrength } from '@/lib/url';

export interface LightboxImage {
  url: string;
  strength: number;
  caption?: string;
}

interface Props {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
  // Optional comparison: when set, render the matching url at the same strength side-by-side
  altImages?: LightboxImage[];
  altLabel?: string;
  primaryLabel?: string;
}

export default function Lightbox({
  images,
  index,
  onClose,
  onIndexChange,
  altImages,
  altLabel,
  primaryLabel,
}: Props) {
  const safeIndex = Math.max(0, Math.min(index, images.length - 1));
  const current = images[safeIndex];

  const goPrev = useCallback(
    () => onIndexChange((safeIndex - 1 + images.length) % images.length),
    [safeIndex, images.length, onIndexChange],
  );
  const goNext = useCallback(
    () => onIndexChange((safeIndex + 1) % images.length),
    [safeIndex, images.length, onIndexChange],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'Home') {
        e.preventDefault();
        onIndexChange(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        onIndexChange(images.length - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext, onClose, onIndexChange, images.length]);

  if (!current) return null;

  const alt = altImages?.[safeIndex];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ink-900/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-ink-700/60 px-5 py-3">
        <div className="flex items-baseline gap-3">
          <span className="text-xs uppercase tracking-wider text-ink-400">strength</span>
          <span className="font-mono text-lg text-ink-50">{formatStrength(current.strength)}</span>
          {current.caption && (
            <span className="text-sm text-ink-300">· {current.caption}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-400">
          <kbd className="rounded border border-ink-600 px-1.5 py-0.5">←</kbd>
          <kbd className="rounded border border-ink-600 px-1.5 py-0.5">→</kbd>
          <span>nav</span>
          <kbd className="ml-3 rounded border border-ink-600 px-1.5 py-0.5">Esc</kbd>
          <span>close</span>
          <button
            onClick={onClose}
            className="ml-4 rounded-md border border-ink-600 px-3 py-1 text-ink-200 hover:bg-ink-700"
          >
            Close
          </button>
        </div>
      </div>

      {/* Image area */}
      <div className="flex flex-1 items-center justify-center gap-6 overflow-hidden px-6 py-4">
        <button
          onClick={goPrev}
          aria-label="Previous strength"
          className="rounded-full bg-ink-800/80 p-3 text-ink-200 hover:bg-ink-700"
        >
          ‹
        </button>

        <div className="flex h-full max-h-full flex-1 items-center justify-center gap-6">
          <ImagePane url={current.url} label={primaryLabel ?? current.caption} />
          {alt && <ImagePane url={alt.url} label={altLabel} />}
        </div>

        <button
          onClick={goNext}
          aria-label="Next strength"
          className="rounded-full bg-ink-800/80 p-3 text-ink-200 hover:bg-ink-700"
        >
          ›
        </button>
      </div>

      {/* Filmstrip of strengths */}
      <div className="border-t border-ink-700/60 bg-ink-800/40 px-5 py-3">
        <div className="flex items-center gap-1 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.url}
              onClick={() => onIndexChange(i)}
              className={
                'shrink-0 rounded px-2 py-1 font-mono text-xs transition-colors ' +
                (i === safeIndex
                  ? 'bg-accent-500 text-ink-900'
                  : 'text-ink-300 hover:bg-ink-700')
              }
            >
              {formatStrength(img.strength)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImagePane({ url, label }: { url: string; label?: string }) {
  return (
    <div className="flex h-full max-h-full flex-1 flex-col items-center justify-center">
      {label && (
        <div className="mb-2 text-xs uppercase tracking-wider text-ink-400">{label}</div>
      )}
      <img
        src={asset(url)}
        alt={label ?? ''}
        className="max-h-[80vh] max-w-full rounded-lg border border-ink-700 object-contain shadow-2xl"
      />
    </div>
  );
}
