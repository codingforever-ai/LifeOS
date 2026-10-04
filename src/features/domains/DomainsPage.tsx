import { useState } from 'react';
import { DOMAINS } from '../../core/domains';
import type { DomainDef } from '../../core/types';
import { useCore } from '../../core/store';
import { Alert, Badge, BubbleIcon, Button, PageHeader, Section } from '../../ui/primitives';
import { Overlay } from '../../ui/overlay';

export default function DomainsPage() {
  const { tasks } = useCore();
  const [open, setOpen] = useState<DomainDef | null>(null);
  const core = DOMAINS.filter((d) => d.status === 'core');
  const planned = DOMAINS.filter((d) => d.status === 'planned');
  const Tile = ({ d }: { d: DomainDef }) => (
    <button type="button" className="domain-tile" onClick={() => setOpen(d)}>
      <BubbleIcon name={d.icon} tone={d.tone} size="lg" />
      <span className="row-title">{d.name}</span>
      <span className="row-sub">{d.blurb}</span>
    </button>
  );
  const count = open ? tasks.filter((t) => t.domain === open.id).length : 0;

  return (
    <>
      <PageHeader eyebrow="Domains" title="Every part of your life" subtitle="Domains share one core: the same tasks, goals, calendar and Agent." />
      <Section title="Available"><div className="domain-grid stagger">{core.map((d) => <Tile key={d.id} d={d} />)}</div></Section>
      <Section title="Coming to LifeOS"><div className="domain-grid stagger">{planned.map((d) => <Tile key={d.id} d={d} />)}
        <button type="button" className="domain-tile add" onClick={() => setOpen({ id: 'custom', name: 'Custom domain', blurb: 'Create your own', icon: 'plus', tone: 'graphite', status: 'planned' })}>
          <BubbleIcon name="plus" tone="graphite" size="lg" /><span className="row-title">Custom</span><span className="row-sub">Create your own</span>
        </button></div>
      </Section>

      <Overlay open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ''} footer={<Button onClick={() => setOpen(null)}>Close</Button>}>
        {open && (
          <div className="detail-grid">
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}><BubbleIcon name={open.icon} tone={open.tone} size="xl" /><div><p>{open.blurb}</p><Badge tone={open.status === 'core' ? 'ok' : 'accent'}>{open.status === 'core' ? 'Available' : 'Planned'}</Badge></div></div>
            {open.status === 'core' && <p className="muted small">{count} tasks are currently tagged to this domain.</p>}
            <Alert icon="info">Domain experiences plug into the shared LifeOS core in a later phase. Nothing domain-specific is built yet.</Alert>
          </div>
        )}
      </Overlay>
    </>
  );
}
