import type { Concept } from '@/lib/types';

export default function ConceptHeader({ concept }: { concept: Concept }) {
  const d = concept.meta.defaults;
  const tokens = concept.meta.tokensToEdit;
  return (
    <header className="border-b border-ink-700 bg-ink-800/40 px-6 pt-5 pb-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-xl font-semibold text-ink-50">{concept.name}</h1>
        {concept.meta.prompt && (
          <span className="text-sm italic text-ink-300">“{concept.meta.prompt}”</span>
        )}
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-400">
        {tokens && tokens.length > 0 && (
          <Field label="tokens_to_edit">
            <span className="font-mono text-ink-200">[{tokens.join(', ')}]</span>
          </Field>
        )}
        {d?.layer != null && <Field label="layer">{d.layer}</Field>}
        {d?.seed != null && <Field label="seed">{d.seed}</Field>}
        {d?.cfg != null && <Field label="cfg">{d.cfg}</Field>}
        {d?.temperature != null && <Field label="temp">{d.temperature}</Field>}
        {d?.image_top_k != null && <Field label="top_k">{d.image_top_k}</Field>}
      </dl>
    </header>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="uppercase tracking-wider">{label}</dt>
      <dd className="text-ink-200">{children}</dd>
    </div>
  );
}
