import { useState } from 'react';
import { useApi } from '../../core/store';
import { useAuth } from '../../core/auth';
import { domainName } from '../../core/domains';
import { Badge, BubbleIcon, Button, EmptyState, ErrorState, LoadingState, PageHeader, Row, Surface, Tabs } from '../../ui/primitives';
import { fmt, dayKey } from '../../lib/tz';

interface TimelineItem { id: string; entity: string; entity_id: string; action: string; title: string; domain: string | null; at: string; actor: string }
interface TimelineData { items: TimelineItem[]; total: number; limit: number; offset: number }

const ENTITY_ICON: Record<string, string> = { tasks: 'tasks', goals: 'goals', projects: 'projects', milestones: 'flag', deadlines: 'flag', events: 'calendar', habits: 'repeat', focus_sessions: 'focus', notes: 'note', decisions: 'compass', experiments: 'flask', accomplishments: 'trophy', reviews: 'history', memories: 'brain', inbox: 'inbox', exams: 'graduation', assignments: 'doc', deliverables: 'flag', workouts: 'dumbbell' };
const ENTITY_LABEL: Record<string, string> = { tasks: 'Task', goals: 'Goal', projects: 'Project', milestones: 'Milestone', deadlines: 'Deadline', events: 'Event', habits: 'Habit', focus_sessions: 'Focus', notes: 'Note', decisions: 'Decision', experiments: 'Experiment', accomplishments: 'Accomplishment', reviews: 'Review', memories: 'Memory', inbox: 'Capture', exams: 'Exam', assignments: 'Assignment', deliverables: 'Deliverable', workouts: 'Workout' };

const FILTERS = [
  { value: 'all', label: 'All', entity: '' },
  { value: 'tasks', label: 'Tasks', entity: 'tasks' },
  { value: 'goals', label: 'Goals', entity: 'goals' },
  { value: 'projects', label: 'Projects', entity: 'projects' },
  { value: 'deadlines', label: 'Deadlines', entity: 'deadlines' },
  { value: 'decisions', label: 'Decisions', entity: 'decisions' },
  { value: 'accomplishments', label: 'Wins', entity: 'accomplishments' },
  { value: 'focus', label: 'Focus', entity: 'focus_sessions' },
];

export default function TimelinePage() {
  const { tz } = useAuth();
  const [filter, setFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const entity = FILTERS.find((f) => f.value === filter)?.entity ?? '';
  const qs = new URLSearchParams({ limit: '100', offset: String(offset), ...(entity ? { entity } : {}) });
  const { data, loading, error, reload } = useApi<TimelineData>(`/timeline?${qs}`);

  // Group items by date
  const grouped = groupByDate(data?.items ?? [], tz);
  const hasMore = data ? offset + data.items.length < data.total : false;

  return (
    <>
      <PageHeader eyebrow="Timeline" title="Your history" subtitle="A continuous record of what happened across all of LifeOS — no fabrication, only what was recorded." />

      <div className="toolbar">
        <Tabs label="Filter timeline" value={filter} onChange={(v) => { setFilter(v); setOffset(0); }} options={FILTERS} />
      </div>

      {loading && !data && <Surface><LoadingState label="Loading timeline" /></Surface>}
      {error && <Surface><ErrorState text={error} onRetry={reload} /></Surface>}
      {data && data.items.length === 0 && <Surface><EmptyState icon="history" title="Nothing yet" text="Your activity will appear here as you use LifeOS." /></Surface>}

      {data && data.items.length > 0 && (
        <>
          {grouped.map((group) => (
            <div key={group.date} className="tl-group">
              <div className="tl-date-head">{group.label}</div>
              <Surface pad="none"><ul className="list divided">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <Row as="div"
                      leading={<BubbleIcon name={(ENTITY_ICON[item.entity] ?? 'sparkle') as any} tone="graphite" size="sm" />}
                      title={item.title}
                      subtitle={
                        <span>
                          <Badge>{ENTITY_LABEL[item.entity] ?? item.entity}</Badge>
                          {' '}{item.action}
                          {item.domain ? ` · ${domainName(item.domain)}` : ''}
                          {' · '}{fmt.time(item.at, tz)}
                        </span>
                      }
                    />
                  </li>
                ))}
              </ul></Surface>
            </div>
          ))}
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Button onClick={() => setOffset((o) => o + 100)}>Load more ({data.total - offset - data.items.length} left)</Button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function groupByDate(items: TimelineItem[], tz: string) {
  const groups: { date: string; label: string; items: TimelineItem[] }[] = [];
  const today = dayKey(new Date(), tz);
  const yesterday = dayKey(new Date(Date.now() - 864e5), tz);
  for (const item of items) {
    const day = dayKey(new Date(item.at), tz);
    const label = day === today ? 'Today' : day === yesterday ? 'Yesterday' : fmt.date(day, tz);
    let g = groups.find((x) => x.date === day);
    if (!g) { g = { date: day, label, items: [] }; groups.push(g); }
    g.items.push(item);
  }
  return groups;
}
