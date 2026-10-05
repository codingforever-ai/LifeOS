import { api } from '../../api/client';
import { useApi, useCore } from '../../core/store';
import { useAuth } from '../../core/auth';
import { countdown, fmt, relDay } from '../../lib/tz';
import { domainName } from '../../core/domains';
import { Badge, Checkbox, PageHeader } from '../../ui/primitives';
import { CrudList } from '../../ui/CrudList';
import { Stat, StatGrid, label } from '../common/kit';

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export default function DeadlinesPage() {
  const { run } = useCore(); const { tz } = useAuth();
  const open = useApi<{ items: Rec[] }>('/e/deadlines?status=open&limit=500&sort=due_at:asc');
  const items = open.data?.items ?? []; const now = Date.now();
  const overdue = items.filter((d) => new Date(d.due_at).getTime() < now).length;
  const today = items.filter((d) => relDay(d.due_at, tz) === 'Today' && new Date(d.due_at).getTime() >= now).length;
  const week = items.filter((d) => { const ms = new Date(d.due_at).getTime() - now; return ms >= 0 && ms < 7 * 864e5; }).length;
  const toggle = (r: Rec) => run(() => api.post(`/e/deadlines/${r.id}/${r.status === 'done' ? 'reopen' : 'complete'}`), r.status === 'done' ? 'Deadline reopened' : 'Deadline completed');
  return (
    <>
      <PageHeader eyebrow="Deadlines" title="What’s time-bound" subtitle="Exams, bills, deliverables, appointments — anything with a date and a consequence." />
      <StatGrid>
        <Stat label="Overdue" value={overdue} tone={overdue ? 'danger' : undefined} />
        <Stat label="Due today" value={today} tone={today ? 'warn' : undefined} />
        <Stat label="Next 7 days" value={week} />
        <Stat label="Open" value={items.length} />
      </StatGrid>
      <CrudList entity="deadlines" sort="due_at:asc" tabs={[{ value: 'open', label: 'Open', filters: { status: 'open' } }, { value: 'done', label: 'Done', filters: { status: 'done' } }, { value: 'cancelled', label: 'Cancelled', filters: { status: 'cancelled' } }]}
        empty={{ title: 'No deadlines here', text: 'Add an exam, bill, deliverable or appointment — LifeOS counts down and warns you before it slips.' }}
        leading={(r) => <Checkbox checked={r.status === 'done'} onChange={() => toggle(r)} label={`Complete ${r.title}`} />}
        sub={(r) => {
          const c = countdown(r.due_at);
          return <>{label(r.type)} · {r.has_time ? fmt.dateTime(r.due_at, tz) : fmt.dateLong(r.due_at, tz)} · {domainName(r.domain)}{r.status === 'open' ? ` · ${c.text}` : ''}{r.consequence ? ` · If missed: ${r.consequence}` : ''}</>;
        }}
        trailing={(r) => {
          if (r.status !== 'open') return <Badge tone={r.status === 'done' ? 'ok' : undefined}>{label(r.status)}</Badge>;
          const c = countdown(r.due_at);
          return c.overdue ? <Badge tone="danger">Overdue</Badge> : c.ms < 864e5 ? <Badge tone="warn">{c.text}</Badge> : <Badge>{c.text}</Badge>;
        }} />
    </>
  );
}
