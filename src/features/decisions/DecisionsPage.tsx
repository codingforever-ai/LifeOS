import { CrudList } from '../../ui/CrudList';
import { PageHeader } from '../../ui/primitives';

export default function DecisionsPage() {
  return (
    <>
      <PageHeader eyebrow="Decisions" title="Learn from your choices" subtitle="Record decisions to review outcomes and improve over time." />
      <CrudList entity="decisions" sort="updated_at:desc" pageSize={30}
        sub={(r) => r.chosen ? `Chose: ${r.chosen}` : r.context?.slice(0, 80) || 'No context'}
        empty={{ title: 'No decisions recorded', text: 'Record a decision to learn from it later.' }}
      />
    </>
  );
}
