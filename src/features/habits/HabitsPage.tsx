import { useState } from 'react';
import { useApi, useCore } from '../../core/store';
import { api } from '../../api/client';
import { useAuth } from '../../core/auth';
import { Badge, BubbleIcon, Button, Checkbox, EmptyState, LoadingState, ErrorState, PageHeader, Row, Surface, Tabs } from '../../ui/primitives';
import { EntityForm } from '../../ui/EntityForm';
import { fmt, dayKey } from '../../lib/tz';
import { useToast } from '../../ui/overlay';

interface HabitStat { id: string; title: string; domain: string; cadence: string; target_per_week: number; status: string; stats: { doneToday: boolean; skippedToday: boolean; last7: { day: string; status: string }[]; streak: number; longest: number; consistency: number; total: number } }

export default function HabitsPage() {
  const { run, bump } = useCore();
  const { tz } = useAuth();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState('active');
  const { data, loading, error, reload } = useApi<HabitStat[]>('/habits-view');
  const today = dayKey(new Date(), tz);

  const log = (h: HabitStat) => run(() => api.post(`/habits/${h.id}/log`, { day: today }), 'Habit logged');
  const unlog = (h: HabitStat) => run(() => api.del(`/habits/${h.id}/log/${today}`), 'Removed');

  const filtered = (data ?? []).filter((h) => tab === 'active' ? h.status === 'active' : tab === 'paused' ? h.status === 'paused' : true);

  return (
    <>
      <PageHeader eyebrow="Habits" title="Show up consistently" subtitle="Streaks are derived from completion records, never stored."
        actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New habit</Button>} />
      <Tabs label="Filter habits" value={tab} onChange={setTab} options={[{ value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }, { value: 'all', label: 'All' }]} />
      {loading && !data && <Surface><LoadingState label="Loading habits" /></Surface>}
      {error && <Surface><ErrorState text={error} onRetry={reload} /></Surface>}
      {data && filtered.length === 0 && <Surface><EmptyState icon="repeat" title="No habits yet" text="Create a habit to start tracking consistency." action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New habit</Button>} /></Surface>}
      {data && filtered.length > 0 && (
        <Surface pad="none"><ul className="list divided">
          {filtered.map((h) => (
            <li key={h.id}>
              <div className="row" style={{ padding: '12px 16px' }}>
                <Checkbox checked={h.stats.doneToday} onChange={() => h.stats.doneToday ? unlog(h) : log(h)} label={`Log ${h.title}`} />
                <span className="row-main">
                  <span className="row-title">{h.title}</span>
                  <span className="row-sub">{h.cadence} · {h.stats.streak} day streak · {Math.round(h.stats.consistency * 100)}% consistency · {h.stats.total} total</span>
                </span>
                {h.stats.longest > 0 && <Badge tone="accent">Best: {h.stats.longest}</Badge>}
              </div>
              {h.stats.last7.length > 0 && (
                <div style={{ display: 'flex', gap: 4, padding: '0 16px 12px 48px' }}>
                  {h.stats.last7.map((d) => <span key={d.day} className="habit-dot" data-status={d.status} title={`${d.day}: ${d.status}`} />)}
                </div>
              )}
            </li>
          ))}
        </ul></Surface>
      )}
      <EntityForm entity="habits" open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
