'use client';

import type { Concept } from '@/lib/types';

interface Props {
  concepts: Concept[];
  activeName: string;
  onSelect: (name: string) => void;
}

export default function Sidebar({ concepts, activeName, onSelect }: Props) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-ink-700 bg-ink-800">
      <div className="border-b border-ink-700 px-5 py-4">
        <div className="text-xs uppercase tracking-wider text-ink-400">Diffusion Sliders</div>
        <div className="mt-0.5 text-base font-semibold text-ink-50">UniToken viewer</div>
      </div>

      <div className="px-3 py-3">
        <div className="px-2 pb-2 text-xs uppercase tracking-wider text-ink-400">
          Concepts ({concepts.length})
        </div>
        <ul className="space-y-0.5">
          {concepts.map((c) => {
            const active = c.name === activeName;
            return (
              <li key={c.name}>
                <button
                  onClick={() => onSelect(c.name)}
                  className={
                    'group flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ' +
                    (active
                      ? 'bg-accent-600/20 text-ink-50'
                      : 'text-ink-300 hover:bg-ink-700/60 hover:text-ink-100')
                  }
                >
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-ink-400">
                    {[c.inference ? 'inf' : null, c.elasticBand ? 'eb' : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-auto px-5 py-3 text-[11px] text-ink-500">
        results live in <code className="text-ink-400">outputs/unitoken/</code>
      </div>
    </aside>
  );
}
