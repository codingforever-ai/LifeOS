import { useState } from 'react';
import { api } from '../../api/client';
import { useApi, useCore } from '../../core/store';
import { Button, PageHeader, Textarea } from '../../ui/primitives';
import { Overlay } from '../../ui/overlay';
import { CrudList } from '../../ui/CrudList';
import { EntityForm } from '../../ui/EntityForm';
import { Async, Stat, StatGrid, label } from '../common/kit';

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function Results({ exp, onClose }: { exp: Rec | null; onClose: () => void }) {
  const { run } = useCore(); const [obs, setObs] = useState(false); const [conclusion, setConclusion] = useState('');
  const q = useApi<Rec>(exp ? `/experiments/${exp.id}/results` : null);
  const act = (a: string, body: Rec = {}) => run(() => api.post(`/experiments/${exp!.id}/${a}`, body), a === 'start' ? 'Experiment started' : 'Experiment updated');
  return (
    <Overlay open={!!exp} onClose={onClose} title={exp?.title ?? ''} variant="drawer">
      {exp && <Async q={q}>{(r) => (
        <div className="stack">
          <p className="muted">{r.experiment.hypothesis || 'No hypothesis written.'}</p>
          <StatGrid><Stat label="Status" value={label(r.experiment.status)} /><Stat label="Day" value={`${r.daysElapsed}/${r.experiment.duration_days}`} /><Stat label="Focus" value={`${r.measured.focusMinutes}m`} sub={`${r.measured.focusSessions} sessions`} /><Stat label="Tasks done" value={r.measured.tasksCompleted} /></StatGrid>
          {Object.entries(r.series as Rec).map(([k, v]) => <div key={k} className="row-sub">{k}: mean {Math.round(v.mean * 100) / 100} (n={v.n}, {v.min}–{v.max})</div>)}
          <p className="faint small">{r.note}</p>
          <div className="field-inline">
            {r.experiment.status === 'draft' && <Button variant="primary" onClick={() => act('start')}>Start experiment</Button>}
            {r.experiment.status === 'running' && <Button onClick={() => setObs(true)} icon="plus">Add observation</Button>}
          </div>
          {r.experiment.status === 'running' && <><Textarea aria-label="Result and learning" rows={3} placeholder="Result, learning and decision…" value={conclusion} onChange={(e) => setConclusion(e.target.value)} /><Button onClick={() => act('complete', { conclusion })} disabled={!conclusion.trim()}>Complete with conclusion</Button></>}
          {r.experiment.conclusion && <div><div className="caption">Conclusion</div><p>{r.experiment.conclusion}</p></div>}
        </div>)}</Async>}
      <EntityForm entity="experiment_observations" open={obs} defaults={{ experiment_id: exp?.id, day: new Date().toLocaleDateString('en-CA') }} onClose={() => setObs(false)} />
    </Overlay>
  );
}

export default function ExperimentsPage() {
  const [sel, setSel] = useState<Rec | null>(null);
  return (
    <>
      <PageHeader eyebrow="Experiments" title="Hypothesis → change → result → decision" subtitle="Run a time-boxed change, measure it against your real records, and write down what you learned." />
      <CrudList entity="experiments" tabs={[{ value: 'running', label: 'Running', filters: { status: 'running' } }, { value: 'draft', label: 'Draft', filters: { status: 'draft' } }, { value: 'completed', label: 'Completed', filters: { status: 'completed' } }]}
        sub={(r) => <>{r.hypothesis ?? 'No hypothesis'} · {r.duration_days} days</>}
        trailing={(r) => <Button size="sm" onClick={(e) => { e.stopPropagation(); setSel(r); }}>{r.status === 'draft' ? 'Open' : 'Results'}</Button>}
        empty={{ title: 'No experiments yet', text: 'Try a sleep, study or routine change for 1–4 weeks and measure what happens.' }} />
      <Results exp={sel} onClose={() => setSel(null)} />
    </>
  );
}
