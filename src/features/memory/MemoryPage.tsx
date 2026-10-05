import { Badge, PageHeader } from '../../ui/primitives';
import { CrudList } from '../../ui/CrudList';
import { label } from '../common/kit';

const T = (value: string, lbl: string, category?: string): { value: string; label: string; filters: Record<string, string> } => ({ value, label: lbl, filters: category ? { category } : {} });

export default function MemoryPage() {
  return (
    <>
      <PageHeader eyebrow="Memory" title="What LifeOS remembers" subtitle="Explicit and inspectable. The Agent only saves a memory when you ask, and never rewrites one — edit or archive it yourself." />
      <CrudList entity="memories" sort="updated_at:desc"
        tabs={[T('all', 'All'), T('fact', 'Facts', 'fact'), T('preference', 'Preferences', 'preference'), T('principle', 'Principles', 'principle'), T('lesson', 'Lessons', 'lesson'), T('decision', 'Decisions', 'decision'), T('event', 'Events', 'event'), T('relationship', 'Relationships', 'relationship'), T('context', 'Context', 'context'), T('insight', 'Insights', 'insight')]}
        sub={(r) => <>{label(r.category)} · saved by {r.source === 'agent' ? 'the Agent' : r.source === 'review' ? 'a review' : 'you'}{r.context ? ` · ${r.context}` : ''}{r.link_type ? ` · linked to ${label(r.link_type)}` : ''}</>}
        trailing={(r) => (r.pinned ? <Badge tone="accent">Pinned</Badge> : r.source === 'agent' ? <Badge>Agent</Badge> : undefined)}
        empty={{ title: 'Nothing remembered yet', text: 'Add facts, preferences, principles and lessons you want LifeOS to remember.' }} />
    </>
  );
}
