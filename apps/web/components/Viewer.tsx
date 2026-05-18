'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Concept, Tree } from '@/lib/types';
import Sidebar from './Sidebar';
import ConceptHeader from './ConceptHeader';
import InferenceView from './InferenceView';
import ElasticBandView from './ElasticBandView';

type ViewTab = 'inference' | 'elastic';

interface Props {
  tree: Tree;
}

export default function Viewer({ tree }: Props) {
  const concepts = tree.concepts;
  const [conceptName, setConceptName] = useState<string>(concepts[0]?.name ?? '');
  const concept: Concept | undefined = useMemo(
    () => concepts.find((c) => c.name === conceptName),
    [concepts, conceptName],
  );

  const availableTabs = useMemo<ViewTab[]>(() => {
    const tabs: ViewTab[] = [];
    if (concept?.inference) tabs.push('inference');
    if (concept?.elasticBand) tabs.push('elastic');
    return tabs;
  }, [concept]);

  const [tab, setTab] = useState<ViewTab>('inference');
  useEffect(() => {
    if (availableTabs.length && !availableTabs.includes(tab)) {
      setTab(availableTabs[0]);
    }
  }, [availableTabs, tab]);

  if (!concept) {
    return (
      <main className="flex h-screen items-center justify-center text-ink-300">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-lg font-medium text-ink-100">No results found</h1>
          <p className="text-sm">
            Build was empty — point <code className="text-ink-200">OUTPUTS_DIR</code> at a folder
            containing <code className="text-ink-200">unitoken/&lt;concept&gt;/</code>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        concepts={concepts}
        activeName={concept.name}
        onSelect={setConceptName}
      />
      <main className="flex flex-1 flex-col overflow-hidden">
        <ConceptHeader concept={concept} />
        <div className="border-b border-ink-700 bg-ink-800/60 px-6">
          <div className="flex gap-1">
            {availableTabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={
                  'border-b-2 px-4 py-3 text-sm font-medium transition-colors ' +
                  (tab === t
                    ? 'border-accent-500 text-ink-50'
                    : 'border-transparent text-ink-400 hover:text-ink-200')
                }
              >
                {t === 'inference' ? 'Inference sweeps' : 'Elastic band'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {tab === 'inference' && concept.inference && (
            <InferenceView concept={concept} tree={concept.inference} />
          )}
          {tab === 'elastic' && concept.elasticBand && (
            <ElasticBandView concept={concept} band={concept.elasticBand} />
          )}
        </div>
      </main>
    </div>
  );
}
