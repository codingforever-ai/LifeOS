import { useState } from 'react';
import { useApi, useCore } from '../../core/store';
import { ENT } from '../../core/entities';
import { allDomains, domainName } from '../../core/domains';
import { Alert, BubbleIcon, EmptyState, PageHeader, Section, Surface, Tabs } from '../../ui/primitives';
import { Overlay } from '../../ui/overlay';
import { Async, label, pctOf } from '../common/kit';

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function Node({ n, onPick }: { n: Rec; onPick: (n: Rec) => void }) {
  const d = ENT[n.type];
  return (
    <li>
      <button type="button" className="node" onClick={() => onPick(n)} aria-label={`${d?.label ?? n.type}: ${n.title}`}>
        <BubbleIcon name={d?.icon ?? 'layers'} tone={d?.tone ?? 'graphite'} size="sm" />
        <span><b>{n.title}</b> <span className="faint small">{label(n.type).replace(/s$/, '')}{n.status ? ` · ${label(n.status)}` : ''}{typeof n.progress === 'number' ? ` · ${pctOf(n.progress)}` : ''}{n.focusMinutes ? ` · ${n.focusMinutes}m focus` : ''}</span></span>
      </button>
      {n.children?.length > 0 && <ul className="tree">{n.children.map((c: Rec) => <Node key={`${c.type}${c.id}`} n={c} onPick={onPick} />)}</ul>}
    </li>
  );
}

function GoalTree() {
  const { goals } = useCore(); const [gid, setGid] = useState(''); const [pick, setPick] = useState<Rec | null>(null);
  const id = gid || goals[0]?.id || '';
  const q = useApi<Rec>(id ? `/map/${id}` : null); const ctx = useApi<Rec>(pick ? `/context/${pick.type}/${pick.id}` : null);
  if (!goals.length) return <Surface><EmptyState icon="map" title="No goals to map yet" text="Create a goal, then add projects, milestones and tasks — the map shows how they connect." /></Surface>;
  return (<>
    <div className="toolbar"><select className="input compact" aria-label="Goal" value={id} onChange={(e) => setGid(e.target.value)}>{goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
    <Async q={q}>{(g) => (
      <Surface><ul className="tree" style={{ borderLeft: 0, paddingLeft: 0 }}><Node n={g} onPick={setPick} /></ul>
        <div className="row-sub" style={{ marginTop: 12 }}>Outcome so far: {g.outcome?.completedTasks ?? 0} tasks completed. {g.learning?.length ? `${g.learning.length} linked lessons.` : 'No linked lessons or decisions yet.'}</div>
        {g.learning?.length > 0 && <ul className="tree">{g.learning.map((l: Rec) => <Node key={l.id} n={{ ...l, type: l.type ?? 'decisions', children: [] }} onPick={setPick} />)}</ul>}</Surface>)}</Async>
    <Overlay open={!!pick} onClose={() => setPick(null)} title={pick?.title ?? ''} variant="drawer">
      <Async q={ctx}>{(c) => (<div className="stack">{Object.entries(c).filter(([, v]) => Array.isArray(v) && v.length).map(([k, v]) => (<div key={k}><div className="caption">{label(k)}</div><ul className="list divided">{(v as Rec[]).slice(0, 15).map((x, i) => <li key={x.id ?? i} className="row-sub" style={{ padding: '6px 0' }}>{x.title ?? x.name ?? x.action ?? x.content ?? JSON.stringify(x).slice(0, 80)}</li>)}</ul></div>))}</div>)}</Async>
    </Overlay></>);
}

function DomainTree() {
  const [dom, setDom] = useState('personal');
  const Part = ({ e }: { e: string }) => {
    const q = useApi<{ items: Rec[]; total: number }>(`/e/${e}?domain=${dom}&limit=8${e === 'tasks' ? '&status=inbox,planned,in_progress,blocked,waiting' : ''}`);
    return <li><div className="node" style={{ cursor: 'default' }}><BubbleIcon name={ENT[e].icon} tone={ENT[e].tone} size="sm" /><b>{ENT[e].plural}</b> <span className="faint small">{q.data?.total ?? '…'}</span></div>
      <ul className="tree">{(q.data?.items ?? []).map((r) => <li key={r.id} className="row-sub">{ENT[e].title(r)}</li>)}</ul></li>;
  };
  return (<>
    <div className="toolbar"><select className="input compact" aria-label="Domain" value={dom} onChange={(e) => setDom(e.target.value)}>{allDomains().map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
    <Surface><div className="node" style={{ cursor: 'default', marginBottom: 8 }}><b>{domainName(dom)}</b></div><ul className="tree">{['goals', 'projects', 'tasks', 'habits', 'events', 'notes'].map((e) => <Part key={`${dom}${e}`} e={e} />)}</ul></Surface></>);
}

export default function MapPage() {
  const [tab, setTab] = useState('goal');
  return (
    <>
      <PageHeader eyebrow="Map" title="How everything connects" subtitle="Goal → project → milestone → task → outcome → learning, and domain → everything inside it. Tap any node for its context." />
      <div className="toolbar"><Tabs label="Map view" value={tab} onChange={setTab} options={[{ value: 'goal', label: 'Goal tree' }, { value: 'domain', label: 'By domain' }]} /></div>
      {tab === 'goal' ? <GoalTree /> : <DomainTree />}
      <Section title=""><Alert icon="info">The map is read directly from your records and links — nothing here is decorative.</Alert></Section>
    </>
  );
}
