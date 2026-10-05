import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../core/store';
import { useAuth } from '../../core/auth';
import { dayKey, fmt, startOfDayUtc, addDays } from '../../lib/tz';
import { domainName } from '../../core/domains';
import { Badge, Button, EmptyState, Input, PageHeader, Row, Surface } from '../../ui/primitives';
import { IconTile } from '../../ui/icons';
import { Async, label } from '../common/kit';
import { ENT } from '../../core/entities';
import { ENTITY_PATH } from '../common/paths';

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export default function TimelinePage() {
  const { tz } = useAuth(); const nav = useNavigate();
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [entity, setEntity] = useState(''); const [limit, setLimit] = useState(100);
  const qs = new URLSearchParams({ limit: String(limit), ...(from ? { from: startOfDayUtc(from, tz).toISOString() } : {}), ...(to ? { to: startOfDayUtc(addDays(to, 1), tz).toISOString() } : {}), ...(entity ? { entity } : {}) });
  const q = useApi<{ items: Rec[]; total: number }>(`/timeline?${qs}`);
  return (
    <>
      <PageHeader eyebrow="Timeline" title="How it actually unfolded" subtitle="A chronological replay of everything you and the Agent did. Pick a range to replay a period." />
      <div className="toolbar">
        <label className="field-inline small">From <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" /></label>
        <label className="field-inline small">To <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" /></label>
        <select className="input compact" aria-label="Type" value={entity} onChange={(e) => setEntity(e.target.value)}><option value="">All types</option>{['goals', 'projects', 'milestones', 'tasks', 'deadlines', 'events', 'habits', 'focus_sessions', 'reviews', 'decisions', 'accomplishments', 'memories', 'experiments'].map((x) => <option key={x} value={x}>{ENT[x]?.plural ?? label(x)}</option>)}</select>
      </div>
      <Async q={q} label="Loading timeline">{(d) => {
        if (!d.items.length) return <Surface><EmptyState icon="history" title="Nothing in this period" text="As you create, finish and review things, they’ll be recorded here in order." /></Surface>;
        const groups: Record<string, Rec[]> = {}; for (const i of d.items) (groups[dayKey(new Date(i.at), tz)] ??= []).push(i);
        return (<>{Object.entries(groups).map(([day, items]) => (
          <section key={day} className="timeline-day"><div className="caption" style={{ marginBottom: 8 }}>{fmt.dayKey(day, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
            <Surface pad="none"><ul className="list divided">{items.map((i) => (
              <li key={i.id}><Row onClick={ENTITY_PATH[i.entity] ? () => nav(ENTITY_PATH[i.entity]) : undefined} as={ENTITY_PATH[i.entity] ? 'button' : 'div'} leading={<IconTile name={ENT[i.entity]?.icon ?? 'history'} tone={ENT[i.entity]?.tone ?? 'graphite'} size="sm" />} title={i.title ?? label(i.entity)}
                subtitle={`${label(i.action)} ${(ENT[i.entity]?.label ?? label(i.entity)).toLowerCase()} · ${fmt.time(i.at, tz)}${i.domain ? ` · ${domainName(i.domain)}` : ''}`} trailing={i.actor === 'agent' ? <Badge tone="accent">Agent</Badge> : undefined} /></li>))}</ul></Surface></section>))}
          {d.total > d.items.length && <div style={{ textAlign: 'center', marginTop: 16 }}><Button onClick={() => setLimit((l) => l + 100)}>Show more ({d.total - d.items.length} left)</Button></div>}</>);
      }}</Async>
    </>
  );
}
