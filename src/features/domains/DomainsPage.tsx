import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DOMAINS } from '../../core/domains';
import type { DomainDef } from '../../core/types';
import { useApi } from '../../core/store';
import { Badge, BubbleIcon, Button, PageHeader, Section, Row } from '../../ui/primitives';
import { Overlay } from '../../ui/overlay';

interface DomainSummary { [key: string]: { tasksOpen: number; goals: number; projects: number } }
interface DomainOverview { core: { tasksOpen: number; goals: number; projects: number }; [key: string]: unknown }

export default function DomainsPage() {
  const nav = useNavigate();
  const [open, setOpen] = useState<DomainDef | null>(null);
  const { data: summary } = useApi<DomainSummary>('/domains-summary');
  const { data: overview } = useApi<DomainOverview | null>(open ? `/domains/${open.id}/overview` : null);

  return (
    <>
      <PageHeader eyebrow="Domains" title="Every part of your life" subtitle="Domains share one core: the same tasks, goals, calendar and Agent." />
      <Section title="Your domains">
        <div className="domain-grid stagger">
          {DOMAINS.map((d) => (
            <button key={d.id} type="button" className="domain-tile" onClick={() => nav(d.path)}>
              <BubbleIcon name={d.icon} tone={d.tone} size="lg" />
              <span className="row-title">{d.name}</span>
              <span className="row-sub">{d.blurb}</span>
              {summary && <span className="faint small">{summary[d.id]?.tasksOpen ?? 0} open tasks · {summary[d.id]?.goals ?? 0} goals</span>}
            </button>
          ))}
        </div>
      </Section>

      <Overlay open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ''} footer={<Button onClick={() => setOpen(null)}>Close</Button>}>
        {open && overview && (
          <div className="detail-grid">
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}><BubbleIcon name={open.icon} tone={open.tone} size="xl" /><div><p>{open.blurb}</p><Badge tone="ok">Active</Badge></div></div>
            <Row as="div" title="Open tasks" subtitle={`${overview.core?.tasksOpen ?? 0} tasks`} />
            <Row as="div" title="Goals" subtitle={`${overview.core?.goals ?? 0} goals`} />
            <Row as="div" title="Projects" subtitle={`${overview.core?.projects ?? 0} projects`} />
          </div>
        )}
      </Overlay>
    </>
  );
}
