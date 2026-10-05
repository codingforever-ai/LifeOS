import { useState } from 'react';
import { useApi } from '../../core/store';
import { useAuth } from '../../core/auth';
import { fmt, minutesLabel } from '../../lib/tz';
import { Alert, Badge, PageHeader, ProgressBar, Surface, Tabs } from '../../ui/primitives';
import { Async, Stat, StatGrid } from '../common/kit';

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const dl = (k: string) => fmt.dayKey(k, { weekday: 'short', day: 'numeric', month: 'short' });

export default function CapacityPage() {
  const { tz } = useAuth(); const [days, setDays] = useState('7');
  const q = useApi<{ from: string; days: Rec[]; totals: Rec; unscheduledMin: number; unscheduledCount: number }>(`/capacity?days=${days}`);
  return (
    <>
      <PageHeader eyebrow="Capacity" title="What fits, honestly" subtitle="Available time minus calendar commitments, buffer and the estimated effort of open work." />
      <div className="toolbar"><Tabs label="Range" value={days} onChange={setDays} options={[{ value: '7', label: '7 days' }, { value: '14', label: '14 days' }, { value: '30', label: '30 days' }]} /></div>
      <Async q={q} label="Calculating capacity">{(d) => {
        const t = d.totals; const over = d.days.filter((x) => x.overload);
        return (<>
          <StatGrid><Stat label="Available" value={minutesLabel(t.available)} /><Stat label="Committed" value={minutesLabel(t.committed)} sub="events & focus blocks" /><Stat label="Planned work" value={minutesLabel(t.planned)} sub="task estimates" /><Stat label="Remaining" value={`${t.remaining < 0 ? '-' : ''}${minutesLabel(t.remaining)}`} tone={t.remaining < 0 ? 'danger' : 'ok'} /></StatGrid>
          {over.length > 0 ? <Alert tone="warn" icon="alert">Overloaded on {over.map((x) => dl(x.day)).join(', ')}. Move, defer or shrink work — or add time.</Alert> : <Alert tone="accent" icon="check">No day is overloaded in this range.</Alert>}
          {d.unscheduledCount > 0 && <p className="faint small" style={{ margin: '12px 0' }}>{d.unscheduledCount} open tasks have no date ({minutesLabel(d.unscheduledMin)} estimated) and are not counted against specific days.</p>}
          <Surface><div className="stack">{d.days.map((x) => {
            const used = x.committed + x.planned + x.buffer;
            return (<div key={x.day} className="bar-row"><span className="bar-label small">{dl(x.day)}</span>
              <ProgressBar value={x.available ? Math.min(1, used / x.available) : x.planned || x.committed ? 1 : 0} label={`${x.day} load`} />
              <span className="small num">{x.workDay ? (x.overload ? <Badge tone="danger">{minutesLabel(-x.remaining)} over</Badge> : minutesLabel(x.remaining)) : <Badge>Off</Badge>}</span></div>);
          })}</div></Surface>
          <p className="faint small" style={{ marginTop: 12 }}>Timezone {tz}. Tasks without an estimate don’t count — add estimates for a truer picture.</p>
        </>);
      }}</Async>
    </>
  );
}
