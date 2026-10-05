import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../core/store';
import { domainName } from '../../core/domains';
import { minutesLabel } from '../../lib/tz';
import { Alert, Badge, EmptyState, PageHeader, ProgressBar, Row, Section, Surface, Tabs } from '../../ui/primitives';
import { Async, Stat, StatGrid, pctOf } from '../common/kit';

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export default function CompassPage() {
  const [days, setDays] = useState('14');
  const q = useApi<{ totalFocusMinutes: number; allocation: Rec[]; goals: Rec[]; neglected: string[]; plannedVsActual: Rec[] }>(`/compass?days=${days}`);
  return (
    <>
      <PageHeader eyebrow="Compass" title="Am I spending time on what matters?" subtitle="Your goals and priorities against where focus time actually went." />
      <div className="toolbar"><Tabs label="Range" value={days} onChange={setDays} options={[{ value: '7', label: '7 days' }, { value: '14', label: '14 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} /></div>
      <Async q={q} label="Reading your data">{(d) => (
        <div className="stack">
          <StatGrid><Stat label="Focus time" value={minutesLabel(d.totalFocusMinutes)} sub={`last ${days} days`} /><Stat label="Active goals" value={d.goals.length} /><Stat label="Neglected goals" value={d.neglected.length} tone={d.neglected.length ? 'warn' : 'ok'} /></StatGrid>
          {d.neglected.length > 0 && <Alert tone="warn" icon="alert">No focus time or completed work toward: {d.neglected.join(', ')}.</Alert>}
          <div className="split">
            <Section title="Where time went"><Surface>{d.allocation.length === 0 ? <EmptyState icon="compass" title="Not enough data yet" text="Run focus sessions linked to goals or domains and your allocation appears here." /> : d.allocation.map((a) => (
              <div key={a.domain} className="bar-row"><span className="bar-label small">{domainName(a.domain)}</span><ProgressBar value={a.share ?? 0} label={`${domainName(a.domain)} share`} /><span className="small num">{minutesLabel(a.minutes)}</span></div>))}</Surface></Section>
            <Section title="Goals vs. attention"><Surface pad="none">{d.goals.length === 0 ? <EmptyState icon="goals" title="No active goals" text="Define a goal so Compass can compare it to your time." action={<Link to="/goals">Go to Goals</Link>} /> : <ul className="list divided">{d.goals.map((g) => (
              <li key={g.id}><Row as="div" title={g.title} subtitle={`${domainName(g.domain)} · ${minutesLabel(g.focusMinutes)} focus · ${g.tasksCompleted} tasks done`} trailing={<Badge tone={g.focusMinutes || g.tasksCompleted ? 'ok' : 'warn'}>{pctOf(g.share)} of time</Badge>} /></li>))}</ul>}</Surface></Section>
          </div>
          {d.plannedVsActual.length > 0 && <Section title="Planned vs. actual"><Surface pad="none"><ul className="list divided">{d.plannedVsActual.map((x) => <li key={x.domain}><Row as="div" title={domainName(x.domain)} subtitle={`Planned ${minutesLabel(x.plannedMin)} · actual ${minutesLabel(x.actualMin)}`} /></li>)}</ul></Surface></Section>}
        </div>)}</Async>
    </>
  );
}
