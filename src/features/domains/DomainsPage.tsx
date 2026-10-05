import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { allDomains } from '../../core/domains';
import { useApi, useCore } from '../../core/store';
import { BubbleIcon, Button, PageHeader, Section } from '../../ui/primitives';
import { CrudList } from '../../ui/CrudList';
import { EntityForm } from '../../ui/EntityForm';

interface DomainSummary { [key: string]: { tasksOpen: number; goals: number; projects: number } }

export default function DomainsPage() {
  const nav = useNavigate(); const { version } = useCore(); void version;
  const [creating, setCreating] = useState(false);
  const { data: summary } = useApi<DomainSummary>('/domains-summary');
  return (
    <>
      <PageHeader eyebrow="Domains" title="Every part of your life" subtitle="Built-in and custom domains share one core: the same tasks, goals, deadlines, calendar and Agent." actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New domain</Button>} />
      <Section title="Your domains">
        <div className="domain-grid stagger">
          {allDomains().map((d) => (
            <button key={d.id} type="button" className="domain-tile" onClick={() => nav(d.path)}>
              <BubbleIcon name={d.icon} tone={d.tone} size="lg" />
              <span className="row-title">{d.name}</span>
              <span className="row-sub">{d.blurb}</span>
              {summary?.[d.id] && <span className="faint small">{summary[d.id].tasksOpen} open tasks · {summary[d.id].goals} goals</span>}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Manage custom domains"><CrudList entity="custom_domains" sub={(r) => r.description ?? r.category ?? 'No description'} empty={{ title: 'No custom domains yet', text: 'Create Music, Travel, Business, Family… then assign goals, tasks, deadlines and habits to it.' }} /></Section>
      <EntityForm entity="custom_domains" open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
