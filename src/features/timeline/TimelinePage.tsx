import { useApi } from '../../core/store';
import { useAuth } from '../../core/auth';
import { domainName } from '../../core/domains';
import { BubbleIcon, EmptyState, LoadingState, ErrorState, PageHeader, Row, Surface } from '../../ui/primitives';
import { fmt } from '../../lib/tz';

interface TimelineItem { id: string; entity: string; entity_id: string; action: string; title: string; domain: string | null; at: string; actor: string }
interface TimelineData { items: TimelineItem[]; total: number; limit: number; offset: number }

const ENTITY_ICON: Record<string, string> = { tasks: 'tasks', goals: 'goals', projects: 'projects', milestones: 'flag', deadlines: 'flag', events: 'calendar', habits: 'repeat', focus_sessions: 'focus', notes: 'note', decisions: 'compass', experiments: 'flask', accomplishments: 'trophy', reviews: 'history', memories: 'brain', inbox: 'inbox' };

export default function TimelinePage() {
  const { tz } = useAuth();
  const { data, loading, error, reload } = useApi<TimelineData>('/timeline?limit=50');

  return (
    <>
      <PageHeader eyebrow="Timeline" title="Your history" subtitle="A continuous record of what happened across all of LifeOS." />
      {loading && !data && <Surface><LoadingState label="Loading timeline" /></Surface>}
      {error && <Surface><ErrorState text={error} onRetry={reload} /></Surface>}
      {data && data.items.length === 0 && <Surface><EmptyState icon="history" title="Nothing yet" text="Your activity will appear here as you use LifeOS." /></Surface>}
      {data && data.items.length > 0 && (
        <Surface pad="none"><ul className="list divided">
          {data.items.map((item) => (
            <li key={item.id}><Row as="div"
              leading={<BubbleIcon name={(ENTITY_ICON[item.entity] ?? 'sparkle') as any} tone="graphite" size="sm" />}
              title={item.title}
              subtitle={`${item.action} · ${domainName(item.domain)} · ${fmt.dateTime(item.at, tz)}`}
            /></li>
          ))}
        </ul></Surface>
      )}
    </>
  );
}
