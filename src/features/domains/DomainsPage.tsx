import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../core/store';
import { DOMAINS } from '../../core/domains';
import { BubbleIcon, Button, PageHeader, Section, Surface, LoadingState, ErrorState } from '../../ui/primitives';
import { DomainIcon } from '../../ui/icons';

interface Summary { [domain: string]: { tasksOpen: number; goals: number; projects: number } }

export default function DomainsPage() {
  const nav = useNavigate();
  const { data, loading, error, reload } = useApi<Summary>('/domains-summary');

  return (
    <>
      <PageHeader eyebrow="Domains" title="Every part of your life" subtitle="Domains share one core: the same tasks, goals, calendar and Agent." />
      {loading && !data && <Surface><LoadingState label="Loading domains" /></Surface>}
      {error && <Surface><ErrorState text={error} onRetry={reload} /></Surface>}
      {data && (
        <Section title="Available">
          <div className="domain-grid stagger">
            {DOMAINS.map((d) => {
              const s = data[d.id];
              return (
                <button key={d.id} type="button" className="domain-tile" onClick={() => nav(`/domain/${d.id}`)}>
                  <DomainIcon domain={d.id} size="lg" />
                  <span className="row-title">{d.name}</span>
                  <span className="row-sub">{d.blurb}</span>
                  {s && <span className="faint small">{s.tasksOpen} open · {s.goals} goals · {s.projects} projects</span>}
                </button>
              );
            })}
          </div>
        </Section>
      )}
    </>
  );
}
