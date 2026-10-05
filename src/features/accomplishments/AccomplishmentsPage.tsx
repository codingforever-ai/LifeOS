import { useApi } from '../../core/store';
import { fmt } from '../../lib/tz';
import { useAuth } from '../../core/auth';
import { Badge, PageHeader, Row, Section, Surface } from '../../ui/primitives';
import { IconTile } from '../../ui/icons';
import { CrudList } from '../../ui/CrudList';
import { domainName } from '../../core/domains';
import { label } from '../common/kit';

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export default function AccomplishmentsPage() {
  const { tz } = useAuth();
  const q = useApi<{ completedGoals: Rec[]; completedProjects: Rec[]; milestones: Rec[] }>('/accomplishments-view');
  const auto: Rec[] = [...(q.data?.completedGoals ?? []).map((g) => ({ ...g, kind: 'Goal completed' })), ...(q.data?.completedProjects ?? []).map((g) => ({ ...g, kind: 'Project completed' })), ...(q.data?.milestones ?? []).map((g) => ({ ...g, kind: 'Milestone reached' }))].sort((a: Rec, b: Rec) => String(b.at).localeCompare(String(a.at))).slice(0, 12);
  return (
    <>
      <PageHeader eyebrow="Accomplishments" title="Life receipts" subtitle="Evidence of what you actually achieved — with before/after, metrics and outcome." />
      <CrudList entity="accomplishments" sort="achieved_on:desc"
        sub={(r) => <>{fmt.date(`${r.achieved_on}T12:00:00Z`, tz)} · {label(r.kind)} · {domainName(r.domain)}{r.before_value || r.after_value ? ` · ${r.before_value ?? '—'} → ${r.after_value ?? '—'}` : ''}{r.outcome ? ` · ${r.outcome}` : ''}</>}
        trailing={(r) => (r.evidence || r.evidence_url ? <Badge tone="ok">Evidence</Badge> : undefined)}
        empty={{ title: 'No receipts yet', text: 'Record something you achieved — an exam passed, a project shipped, a target reached — and attach the evidence.' }} />
      {auto.length > 0 && <Section title="Recorded automatically from your work"><Surface pad="none"><ul className="list divided">{auto.map((a) => <li key={a.id}><Row as="div" leading={<IconTile name="trophy" tone="sand" size="sm" />} title={a.title} subtitle={`${a.kind} · ${fmt.date(a.at, tz)}`} /></li>)}</ul></Surface></Section>}
    </>
  );
}
