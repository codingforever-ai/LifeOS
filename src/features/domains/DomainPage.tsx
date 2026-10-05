import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useApi } from '../../core/store';
import { findDomain } from '../../core/domains';
import { BubbleIcon, EmptyState, PageHeader, Row, Section, Surface, Tabs, ProgressBar } from '../../ui/primitives';
import { CrudList } from '../../ui/CrudList';
import { Async, Stat, StatGrid, label, pctOf } from '../common/kit';

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Domain-specific records (on top of the shared core). Each entry becomes a tab with a real CRUD list. */
const SPECIFIC: Record<string, { entity: string; label: string; filters?: Record<string, string>; defaults?: Rec }[]> = {
  academic: [{ entity: 'subjects', label: 'Subjects', filters: { area: 'academic' }, defaults: { area: 'academic' } }, { entity: 'exams', label: 'Exams' }, { entity: 'assignments', label: 'Assignments' }],
  study: [{ entity: 'subjects', label: 'Subjects', filters: { area: 'study' }, defaults: { area: 'study' } }, { entity: 'chapters', label: 'Chapters' }, { entity: 'topics', label: 'Topics' }, { entity: 'practice_results', label: 'Tests & practice' }, { entity: 'study_resources', label: 'Notes, formulas & flashcards' }],
  work: [{ entity: 'clients', label: 'Clients' }, { entity: 'deliverables', label: 'Deliverables' }],
  fitness: [{ entity: 'programs', label: 'Programs' }, { entity: 'workouts', label: 'Workouts' }, { entity: 'exercise_sets', label: 'Sets' }, { entity: 'measurements', label: 'Measurements', filters: { domain: 'fitness' }, defaults: { domain: 'fitness' } }],
  finance: [{ entity: 'finance_items', label: 'Money' }],
  personal: [{ entity: 'personal_items', label: 'Items' }],
};
const CORE = [{ entity: 'goals', label: 'Goals' }, { entity: 'projects', label: 'Projects' }, { entity: 'tasks', label: 'Tasks' }, { entity: 'deadlines', label: 'Deadlines' }, { entity: 'habits', label: 'Habits' }, { entity: 'events', label: 'Events' }];
const SKIP = new Set(['core', 'workflow', 'flow', 'note', 'gamification']);

function Overview({ d }: { d: Rec }) {
  const scalars = Object.entries(d).filter(([k, v]) => !SKIP.has(k) && (typeof v === 'number' || (typeof v === 'string' && v.length < 24)));
  const lists = Object.entries(d).filter(([k, v]) => !SKIP.has(k) && Array.isArray(v) && v.length && typeof v[0] === 'object');
  const g = d.gamification as Rec | undefined;
  return (
    <div className="stack">
      {g && <Surface tone="accent"><div className="caption">Academic quest log (derived from your records)</div>
        <StatGrid><Stat label="Level" value={g.level} sub={`${g.xpToNext} XP to next`} /><Stat label="XP" value={g.xp} /><Stat label="Coins" value={g.coins} /><Stat label="Study streak" value={`${g.streak}d`} /></StatGrid>
        <ProgressBar value={g.levelProgress} label="Level progress" />
        {g.bossQuest ? <p className="row-sub" style={{ marginTop: 8 }}>Boss quest: <b>{g.bossQuest.title}</b> in {g.bossQuest.daysLeft} days — {g.bossQuest.revised}/{g.bossQuest.topics} topics practiced or revised.</p> : <p className="row-sub" style={{ marginTop: 8 }}>No upcoming exam — add one under Exams to unlock a boss quest.</p>}
        <p className="faint small">{g.formula}</p></Surface>}
      {scalars.length > 0 && <StatGrid>{scalars.slice(0, 8).map(([k, v]) => <Stat key={k} label={label(k.replace(/([A-Z])/g, ' $1'))} value={typeof v === 'number' && v > 0 && v < 1 && /mastery|accuracy|rate/i.test(k) ? pctOf(v) : String(v)} />)}</StatGrid>}
      <div className="split">{lists.slice(0, 4).map(([k, v]) => (
        <Section key={k} title={label(k.replace(/([A-Z])/g, ' $1'))}><Surface pad="none"><ul className="list divided">{(v as Rec[]).slice(0, 6).map((x, i) => <li key={x.id ?? i}><Row as="div" title={x.title ?? x.name ?? x.exercise ?? x.kind ?? '—'} subtitle={[x.status && label(x.status), typeof x.daysLeft === 'number' && `${x.daysLeft} days left`, typeof x.mastery === 'number' && `mastery ${pctOf(x.mastery)}`, typeof x.accuracy === 'number' && `accuracy ${pctOf(x.accuracy)}`].filter(Boolean).join(' · ') || undefined} /></li>)}</ul></Surface></Section>))}</div>
    </div>
  );
}

export default function DomainPage({ id: fixed }: { id?: string }) {
  const params = useParams(); const id = fixed ?? params.slug ?? ''; const def = findDomain(id);
  const [tab, setTab] = useState('overview');
  const ov = useApi<Rec>(def ? `/domains/${id}/overview` : null);
  if (!def) return params.slug ? <Navigate to="/domains" replace /> : null;
  const tabs = [{ value: 'overview', label: 'Overview' }, ...(SPECIFIC[id] ?? []).map((s) => ({ value: s.entity, label: s.label })), ...CORE.map((c) => ({ value: `core:${c.entity}`, label: c.label }))];
  const spec = (SPECIFIC[id] ?? []).find((s) => s.entity === tab);
  const core = tab.startsWith('core:') ? tab.slice(5) : null;
  return (
    <>
      <PageHeader eyebrow={def.status === 'custom' ? 'Custom domain' : 'Domain'} title={def.name} subtitle={def.blurb} actions={<BubbleIcon name={def.icon} tone={def.tone} size="lg" />} />
      <div className="toolbar" style={{ overflowX: 'auto' }}><Tabs label={`${def.name} sections`} value={tab} onChange={setTab} options={tabs} /></div>
      {tab === 'overview' && <Async q={ov} label={`Loading ${def.name}`}>{(d) => <Overview d={d} />}</Async>}
      {spec && <CrudList key={tab} entity={spec.entity} filters={spec.filters} defaults={spec.defaults} />}
      {core && <CrudList key={core} entity={core} filters={core === 'habits' || core === 'events' || core === 'tasks' || core === 'goals' || core === 'projects' || core === 'deadlines' ? { domain: id } : undefined} defaults={{ domain: id }} />}
      {!spec && !core && tab !== 'overview' && <EmptyState title="Nothing here" text="Pick a section." />}
    </>
  );
}
