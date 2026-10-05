import { useApi } from '../../core/store';
import { Alert, Badge, EmptyState, PageHeader, Row, Section, Surface } from '../../ui/primitives';
import { IconTile } from '../../ui/icons';
import { Async, label } from '../common/kit';

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export default function PatternsPage() {
  const q = useApi<{ patterns: Rec[]; needsMoreData: string[]; note: string }>('/patterns');
  return (
    <>
      <PageHeader eyebrow="Patterns" title="What your history shows" subtitle="Observations from your own records — never invented. Confidence reflects sample size." />
      <Async q={q} label="Analysing history">{(d) => (
        <div className="stack">
          {d.patterns.length === 0 ? <Surface><EmptyState icon="trend" title="Not enough data yet." text="Patterns appear once you have completed tasks, focus sessions and deadlines to learn from." /></Surface> : (
            <Surface pad="none"><ul className="list divided">{d.patterns.map((p) => (
              <li key={p.id}><Row as="div" leading={<IconTile name="trend" tone="plum" size="sm" />} title={p.title} subtitle={<>{p.detail}{Array.isArray(p.evidence) && p.evidence.length ? <span className="faint small"> · {p.evidence.join(' · ')}</span> : null}</>} trailing={p.confidence ? <Badge>{label(String(p.confidence))} confidence · n={p.n}</Badge> : undefined} /></li>))}</ul></Surface>)}
          {d.needsMoreData.length > 0 && <Section title="Not enough data yet"><Alert icon="info">{d.needsMoreData.map((n) => <div key={n}>{n}</div>)}</Alert></Section>}
          <p className="faint small">{d.note}</p>
        </div>)}</Async>
    </>
  );
}
