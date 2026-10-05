import { useState } from 'react';
import { api, ApiError } from '../../api/client';
import { useApi, useCore } from '../../core/store';
import { useAuth } from '../../core/auth';
import type { Goal } from '../../core/types';
import { allDomains, domainName } from '../../core/domains';
import { pct, projectProgress } from '../../core/progress';
import { Badge, BubbleIcon, Button, EmptyState, Field, Input, PageHeader, ProgressBar, ProgressRing, Row, Surface, Tabs } from '../../ui/primitives';
import { Overlay } from '../../ui/overlay';
import { EntityForm } from '../../ui/EntityForm';
import { fmt, inputToIso, isoToInput } from '../../lib/tz';
import { Async, label } from '../common/kit';

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const num = (v: number | null | undefined, unit?: string | null) => (v == null ? '—' : `${/^[₹$€£]/.test(unit ?? '') ? unit : ''}${Number(v).toLocaleString()}${unit && !/^[₹$€£]/.test(unit) ? ` ${unit}` : ''}`);

function Detail({ goal, onEdit, onClose }: { goal: Goal; onEdit: () => void; onClose: () => void }) {
  const { projects, milestones, tasks, progress, run } = useCore(); const { tz } = useAuth();
  const g = goal as Goal & Rec; const info = progress.goals[g.id] as Rec | undefined; const m = info?.measured as Rec | undefined;
  const meas = useApi<{ items: Rec[] }>(`/e/measurements?goal_id=${g.id}&sort=at:desc&limit=20`);
  const [val, setVal] = useState(''); const [at, setAt] = useState(isoToInput(new Date().toISOString(), tz)); const [err, setErr] = useState('');
  const ps = projects.filter((p) => p.goal_id === g.id); const ms = milestones.filter((x) => x.goal_id === g.id || ps.some((p) => p.id === x.project_id));
  const [form, setForm] = useState<string | null>(null);
  const log = async () => {
    setErr(''); const r = await run(() => api.post('/e/measurements', { goal_id: g.id, name: g.measure_type === 'milestones' ? 'value' : g.measure_type, value: Number(val), unit: g.unit, at: inputToIso(at, tz), domain: g.domain }), 'Measurement logged').catch((e: ApiError) => setErr(e.message));
    if (r !== undefined) setVal('');
  };
  return (
    <div className="detail-grid">
      {g.why && <p className="muted">{g.why}</p>}
      <Surface tone="raised" className="detail-ring">
        <ProgressRing value={info?.progress ?? 0} size={72} label="Goal progress">{pct(info?.progress)}%</ProgressRing>
        <div><div className="row-title">{m ? `${num(m.current, g.unit)} of ${num(m.target, g.unit)}` : 'Derived from linked work'}</div>
          <div className="row-sub">{m ? `${label(g.direction)} · from ${label(g.method)}${m.baseline != null ? ` · baseline ${num(m.baseline, g.unit)}` : ''}` : `${ps.length} projects · ${ms.length} milestones · ${info?.tasksTotal ?? 0} tasks`}</div></div>
      </Surface>
      <div className="field-inline"><Badge tone="accent">{label(g.goal_type)}</Badge><Badge>{domainName(g.domain)}</Badge>{g.target_date && <Badge>Target {fmt.date(`${g.target_date}T12:00:00Z`, tz)}</Badge>}{g.confidence != null && <Badge>{g.confidence}% confident</Badge>}</div>
      {g.method === 'measurements' && (<>
        <div className="caption">Log a measurement</div>
        <div className="field-inline"><Field label={`Value${g.unit ? ` (${g.unit})` : ''}`} id="m-val"><Input id="m-val" type="number" step="any" value={val} onChange={(e) => setVal(e.target.value)} /></Field><Field label="When" id="m-at"><Input id="m-at" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} /></Field><Button variant="primary" disabled={val === ''} onClick={log}>Log</Button></div>
        {err && <div className="form-error" role="alert">{err}</div>}
        <Async q={meas}>{(d) => <ul className="list divided">{d.items.length ? d.items.map((x) => <li key={x.id}><Row as="div" title={num(x.value, x.unit ?? g.unit)} subtitle={fmt.dateTime(x.at, tz)} trailing={<Button size="sm" variant="ghost" onClick={() => run(() => api.del(`/e/measurements/${x.id}?permanent=1`, { 'x-confirm': 'DELETE' }), 'Measurement removed')}>Remove</Button>} /></li>) : <li className="row-sub" style={{ padding: 8 }}>No measurements yet — progress stays at 0% until you log one.</li>}</ul>}</Async></>)}
      {g.method === 'habits' && <p className="row-sub">Progress counts entries from habits linked to this goal that are set to “Counts toward linked goal”.</p>}
      {g.method === 'focus' && <p className="row-sub">Progress counts completed focus time linked to this goal.</p>}
      <div className="caption">Projects</div>
      <div className="list">{ps.map((p) => <Row as="div" key={p.id} leading={<BubbleIcon name="projects" tone="royal" size="sm" />} title={p.title} subtitle={`${pct(projectProgress(p, progress))}% · ${tasks.filter((t) => t.project_id === p.id && !t.done_at).length} open tasks`} />)}{!ps.length && <p className="row-sub">No projects yet.</p>}</div>
      <div className="caption">Milestones</div>
      <div className="list">{ms.slice(0, 6).map((x) => <Row as="div" key={x.id} leading={<BubbleIcon name="flag" tone="plum" size="sm" />} title={x.title} subtitle={x.done_at ? 'Completed' : x.due_at ? fmt.date(x.due_at, tz) : 'Open'} />)}{!ms.length && <p className="row-sub">No milestones yet.</p>}</div>
      <div className="field-inline"><Button size="sm" onClick={onEdit}>Edit goal</Button><Button size="sm" icon="plus" onClick={() => setForm('projects')}>Project</Button><Button size="sm" icon="plus" onClick={() => setForm('milestones')}>Milestone</Button><Button size="sm" icon="plus" onClick={() => setForm('tasks')}>Task</Button><Button size="sm" icon="plus" onClick={() => setForm('habits')}>Habit</Button><Button size="sm" variant="ghost" onClick={onClose}>Close</Button></div>
      {form && <EntityForm entity={form} open defaults={{ goal_id: g.id, domain: g.domain }} onClose={() => setForm(null)} />}
    </div>
  );
}

export default function GoalsPage() {
  const { goals, progress, status } = useCore();
  const [open, setOpen] = useState<Goal | null>(null); const [editing, setEditing] = useState<Goal | null>(null); const [creating, setCreating] = useState(false); const [dom, setDom] = useState('all'); const [st, setSt] = useState('active');
  const list = goals.filter((g) => (dom === 'all' || g.domain === dom) && (st === 'all' ? true : st === 'active' ? ['active', 'at_risk'].includes(g.status) : g.status === st));
  const live = open ? goals.find((g) => g.id === open.id) ?? open : null;
  return (
    <>
      <PageHeader eyebrow="Goals" title="What you're working toward" subtitle="Progress is computed from measurements, habit entries, focus time or linked work — it can’t be typed in." actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New goal</Button>} />
      <div className="toolbar">
        <Tabs label="Goal status" value={st} onChange={setSt} options={[{ value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }, { value: 'paused', label: 'Paused' }, { value: 'all', label: 'All' }]} />
        <select className="input compact" aria-label="Domain" value={dom} onChange={(e) => setDom(e.target.value)}><option value="all">All domains</option>{allDomains().map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
      </div>
      {status === 'ready' && list.length === 0 ? (
        <Surface><EmptyState icon="goals" title="No goals here" text="Start with one outcome that matters — measurable (save ₹1 lakh, read 12 books) or driven by projects and milestones." action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New goal</Button>} /></Surface>
      ) : (
        <div className="goal-list stagger">
          {list.map((g) => {
            const x = g as Goal & Rec; const info = progress.goals[g.id] as Rec | undefined; const m = info?.measured as Rec | undefined; const p = info?.progress ?? 0;
            return (
              <button key={g.id} type="button" className="surface goal-card" onClick={() => setOpen(g)}>
                <div className="goal-top"><Badge tone="accent">{domainName(g.domain)}</Badge><span className="faint small">{label(x.goal_type)}{g.status !== 'active' ? ` · ${label(g.status)}` : ''}</span></div>
                <h3>{g.title}</h3>
                <p className="muted small">{m ? `${num(m.current, x.unit)} of ${num(m.target, x.unit)}` : g.why}</p>
                <div className="goal-foot"><div style={{ flex: 1 }}><ProgressBar value={p} label={`${g.title} progress`} /></div><span className="num small">{pct(p)}%</span></div>
                <span className="faint small">{x.method === 'work' ? `${info?.projects ?? 0} projects · ${info?.tasksTotal ?? 0} tasks` : `from ${label(x.method).toLowerCase()}`}</span>
              </button>
            );
          })}
        </div>
      )}
      <Overlay open={!!live} onClose={() => setOpen(null)} title={live?.title ?? 'Goal'} variant="drawer">{live && <Detail goal={live} onEdit={() => setEditing(live)} onClose={() => setOpen(null)} />}</Overlay>
      <EntityForm entity="goals" open={creating} onClose={() => setCreating(false)} />
      <EntityForm entity="goals" open={!!editing} record={editing as never} onClose={() => setEditing(null)} />
    </>
  );
}
