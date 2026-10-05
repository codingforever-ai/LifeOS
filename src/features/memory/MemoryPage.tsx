import { CrudList } from '../../ui/CrudList';
import { PageHeader } from '../../ui/primitives';

export default function MemoryPage() {
  return (
    <>
      <PageHeader eyebrow="Memory" title="What LifeOS remembers" subtitle="Explicit, controllable, user-scoped. The Agent respects your privacy settings." />
      <CrudList entity="memories" sort="updated_at:desc" pageSize={30}
        tabs={[
          { value: 'all', label: 'All', filters: {} },
          { value: 'pinned', label: 'Pinned', filters: { pinned: 'true' } },
        ]}
        sub={(r) => `${r.category} · confidence ${r.confidence}%${r.pinned ? ' · pinned' : ''}`}
        empty={{ title: 'No memories', text: 'Tell LifeOS to remember something, or ask the Agent to save one.' }}
      />
    </>
  );
}
