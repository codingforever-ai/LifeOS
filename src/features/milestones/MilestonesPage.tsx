import { useState } from 'react';
import { api } from '../../api/client';
import { useApi, useCore } from '../../core/store';
import { useAuth } from '../../core/auth';
import { fmt } from '../../lib/tz';
import { Badge, Button, Checkbox, EmptyState, PageHeader, ProgressBar, Row, Surface, Tabs } from '../../ui/primitives';
import { EntityForm } from '../../ui/EntityForm';
import { Async, label, pctOf } from '../common/kit';

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const TONE: Record<string, 'ok' | 'warn' | 'danger' | undefined> = { completed: 'ok', at_risk: 'warn', overdue: 'danger', upcoming: undefined };

export default function MilestonesPage() {
  const { run, goals, projects } = useCore(); const { tz } = useAuth();
  const q = useApi<Rec[]>('/milestones-view');
  const [tab, setTab] = useState('open'); const [edit, setEdit] = useState<Rec | null>(null); const [creating, setCreating] = useState(false);
  const toggle = (m: Rec) => run(() => api.post(`/e/milestones/${m.id}/${m.done_at ? 'reopen' : 'complete'}`), m.done_at ? 'Milestone reopened' : 'Milestone completed');
  return (
    <>
      <PageHeader eyebrow="Milestones" title="Meaningful checkpoints" subtitle="Progress is derived from the tasks linked to each milestone." actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New milestone</Button>} />
      <div className="toolbar"><Tabs label="Filter milestones" value={tab} onChange={setTab} options={[{ value: 'open', label: 'Open' }, { value: 'done', label: 'Completed' }, { value: 'all', label: 'All' }]} /></div>
      <Async q={q} label="Loading milestones">{(items) => {
        const list = items.filter((m) => (tab === 'open' ? !m.done_at : tab === 'done' ? !!m.done_at : true));
        if (!list.length) return <Surface><EmptyState icon="flag" title="No milestones here" text="Break a project or goal into checkpoints, then link tasks to them." action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New milestone</Button>} /></Surface>;
        return (
          <Surface pad="none"><ul className="list divided stagger">{list.map((m) => (
            <li key={m.id}><Row as="div" onClick={() => setEdit(m)} leading={<Checkbox checked={!!m.done_at} onChange={() => toggle(m)} label={`Complete ${m.title}`} />} title={m.title}
              subtitle={<><span>{[projects.find((p) => p.id === m.project_id)?.title, goals.find((g) => g.id === m.goal_id)?.title].filter(Boolean).join(' · ') || 'Standalone'}{m.due_at ? ` · ${fmt.date(m.due_at, tz)}` : ''} · {m.tasksDone}/{m.tasksTotal} tasks</span><ProgressBar value={m.progress} label={`${m.title} progress`} /></>}
              trailing={<><span className="num small">{pctOf(m.progress)}</span> <Badge tone={TONE[m.derived_status]}>{label(m.derived_status)}</Badge></>} /></li>
          ))}</ul></Surface>
        );
      }}</Async>
      <EntityForm entity="milestones" open={creating} onClose={() => setCreating(false)} />
      <EntityForm entity="milestones" open={!!edit} record={edit} onClose={() => setEdit(null)} />
    </>
  );
}
