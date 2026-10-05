import { useApi } from '../../core/store';
import { useAuth } from '../../core/auth';
import { fmt } from '../../lib/tz';
import { Badge, BubbleIcon, PageHeader, ProgressBar, Row, Surface } from '../../ui/primitives';
import { Async } from '../common/kit';

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const TIER_TONE: Record<string, string> = { common: 'graphite', hard: 'slate', epic: 'plum', legendary: 'sand', legacy: 'purple' };

export default function AchievementsPage() {
  const { tz } = useAuth(); const q = useApi<Rec[]>('/achievements');
  return (
    <>
      <PageHeader eyebrow="Achievements" title="Recognition, not a score" subtitle="Milestones, consistency and growth — each earned from real records. No single productivity number." />
      <Async q={q} label="Checking achievements">{(items) => (
        <Surface pad="none"><ul className="list divided">{[...items].sort((a, b) => Number(b.achieved) - Number(a.achieved)).map((a) => (
          <li key={a.id}><Row as="div" leading={<BubbleIcon name={a.achieved ? 'trophy' : 'target'} tone={a.achieved ? TIER_TONE[a.tier] : 'graphite'} size="md" />} title={<>{a.title} <Badge tone={a.achieved ? 'ok' : undefined}>{a.tier[0].toUpperCase() + a.tier.slice(1)}</Badge></>}
            subtitle={<><span>{a.description} · {a.evidence}{a.achieved && a.at ? ` · ${fmt.date(a.at, tz)}` : ''}</span>{!a.achieved && <ProgressBar value={a.progress} label={`${a.title} progress`} />}</>} /></li>))}</ul></Surface>)}</Async>
    </>
  );
}
