import { fmt } from '../../lib/tz';
import { useAuth } from '../../core/auth';
import { Badge, PageHeader } from '../../ui/primitives';
import { CrudList } from '../../ui/CrudList';

export default function DecisionsPage() {
  const { tz } = useAuth();
  return (
    <>
      <PageHeader eyebrow="Decisions" title="Why you chose what you chose" subtitle="Record context, options and expectations now; compare with what actually happened later." />
      <CrudList entity="decisions" sort="created_at:desc"
        tabs={[{ value: 'open', label: 'Awaiting review', filters: { status: 'open' } }, { value: 'reviewed', label: 'Reviewed', filters: { status: 'reviewed' } }]}
        sub={(r) => <>{r.chosen ? `Chose: ${r.chosen}` : 'No option chosen yet'}{r.review_on ? ` · review ${fmt.date(`${r.review_on}T12:00:00Z`, tz)}` : ''}{r.learned ? ` · Lesson: ${r.learned}` : ''}</>}
        trailing={(r) => (r.status === 'open' && r.review_on && r.review_on <= new Date().toISOString().slice(0, 10) ? <Badge tone="warn">Review due</Badge> : undefined)}
        empty={{ title: 'No decisions recorded', text: 'Log a meaningful decision with its options and reasoning so future-you can learn from it.' }} />
    </>
  );
}
