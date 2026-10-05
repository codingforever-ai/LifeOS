import { useState } from 'react';
import { useApi, useCore } from '../../core/store';
import { api } from '../../api/client';
import { useAuth } from '../../core/auth';
import { Badge, BubbleIcon, Button, EmptyState, ErrorState, LoadingState, PageHeader, Row, Surface, Tabs } from '../../ui/primitives';
import { EntityForm } from '../../ui/EntityForm';
import { fmt } from '../../lib/tz';

interface Decision {
  id: string; title: string; context: string | null; options: string[] | null; chosen: string | null;
  reasoning: string | null; expected: string | null; actual: string | null; learned: string | null;
  review_on: string | null; status: string; domain: string; created_at: string; updated_at: string;
}
interface DecisionData { items: Decision[]; total: number }

export default function DecisionsPage() {
  const { run } = useCore();
  const { tz } = useAuth();
  const [tab, setTab] = useState('all');
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Decision | null>(null);

  const filters: Record<string, string> = tab === 'open' ? { status: 'open' } : tab === 'reviewed' ? { status: 'reviewed' } : {};
  const qs = new URLSearchParams({ limit: '100', sort: 'updated_at:desc', ...filters });
  const { data, loading, error, reload } = useApi<DecisionData>(`/e/decisions?${qs}`);

  const decisions = data?.items ?? [];

  const markReviewed = (d: Decision) => {
    const learned = prompt('What did you learn from this decision?');
    if (learned === null) return;
    run(() => api.patch(`/e/decisions/${d.id}`, { status: 'reviewed', learned: learned || undefined }), 'Decision reviewed');
    setSelected(null);
  };

  return (
    <>
      <PageHeader eyebrow="Decisions" title="Learn from your choices" subtitle="Context → Options → Decision → Reason → Outcome. Understand why, not just what."
        actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New decision</Button>} />

      <div className="toolbar">
        <Tabs label="Decision status" value={tab} onChange={setTab} options={[
          { value: 'all', label: 'All' },
          { value: 'open', label: 'Pending review' },
          { value: 'reviewed', label: 'Reviewed' },
        ]} />
      </div>

      {loading && !data && <Surface><LoadingState label="Loading decisions" /></Surface>}
      {error && <Surface><ErrorState text={error} onRetry={reload} /></Surface>}
      {data && decisions.length === 0 && (
        <Surface><EmptyState icon="compass" title={tab === 'open' ? 'No decisions pending review' : 'No decisions recorded'} text="Record a decision to track its context, options, and outcome over time." action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New decision</Button>} /></Surface>
      )}

      {data && decisions.length > 0 && (
        <Surface pad="none"><ul className="list divided">
          {decisions.map((d) => (
            <li key={d.id}>
              <Row as="div"
                leading={<BubbleIcon name="compass" tone={d.status === 'reviewed' ? 'lavender' : 'sand'} size="sm" />}
                title={d.title}
                subtitle={
                  <span>
                    {d.chosen ? `Chose: ${d.chosen}` : 'No option chosen yet'}
                    {d.review_on ? ` · review ${fmt.date(d.review_on, tz)}` : ''}
                    {d.actual ? ` · outcome recorded` : ''}
                  </span>
                }
                trailing={
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {d.status === 'reviewed' && d.learned && <Badge tone="ok">learned</Badge>}
                    {d.status === 'open' && d.review_on && <Badge tone="warn">review due</Badge>}
                    <Button size="sm" variant="ghost" onClick={() => setSelected(d)}>View</Button>
                  </span>
                }
              />
            </li>
          ))}
        </ul></Surface>
      )}

      <EntityForm entity="decisions" open={creating} onClose={() => setCreating(false)} />

      {selected && (
        <DecisionDetail
          decision={selected}
          tz={tz}
          onClose={() => setSelected(null)}
          onReviewed={() => markReviewed(selected)}
        />
      )}
    </>
  );
}

function DecisionDetail({ decision, tz, onClose, onReviewed }: {
  decision: Decision; tz: string; onClose: () => void; onReviewed: () => void;
}) {
  const options = Array.isArray(decision.options) ? decision.options : [];
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
        <div className="overlay-head">
          <h3 style={{ fontSize: 'var(--fs-body)', fontWeight: 600 }}>{decision.title}</h3>
          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <div className="decision-flow" style={{ padding: '0 var(--s6) var(--s6)' }}>
          <div className="decision-step">
            <div className="caption">Context</div>
            <p className="small">{decision.context || 'No context recorded.'}</p>
          </div>
          {options.length > 0 && (
            <div className="decision-step">
              <div className="caption">Options</div>
              <ul style={{ display: 'grid', gap: 6, marginTop: 4 }}>
                {options.map((o, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-small)' }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${o === decision.chosen ? 'var(--accent)' : 'var(--surface-4)'}`, background: o === decision.chosen ? 'var(--accent)' : 'transparent', display: 'grid', placeItems: 'center', flex: 'none' }}>
                      {o === decision.chosen && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                    </span>
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {decision.chosen && (
            <div className="decision-step">
              <div className="caption">Decision</div>
              <p className="small" style={{ fontWeight: 550 }}>{decision.chosen}</p>
            </div>
          )}
          {decision.reasoning && (
            <div className="decision-step">
              <div className="caption">Reason</div>
              <p className="small">{decision.reasoning}</p>
            </div>
          )}
          {decision.expected && (
            <div className="decision-step">
              <div className="caption">Expected outcome</div>
              <p className="small">{decision.expected}</p>
            </div>
          )}
          {decision.actual && (
            <div className="decision-step">
              <div className="caption">Actual outcome</div>
              <p className="small">{decision.actual}</p>
            </div>
          )}
          {decision.learned && (
            <div className="decision-step" style={{ borderLeft: '2px solid var(--accent)' }}>
              <div className="caption" style={{ color: 'var(--accent-lavender)' }}>What I learned</div>
              <p className="small">{decision.learned}</p>
            </div>
          )}
          <div className="facts" style={{ marginTop: 'var(--s5)' }}>
            <dt>Status</dt><dd>{decision.status === 'reviewed' ? 'Reviewed' : 'Pending review'}</dd>
            {decision.review_on && <><dt>Review on</dt><dd>{fmt.date(decision.review_on, tz)}</dd></>}
            <dt>Recorded</dt><dd>{fmt.date(decision.created_at, tz)}</dd>
          </div>
          {decision.status === 'open' && (
            <div style={{ marginTop: 'var(--s5)' }}>
              <Button size="sm" variant="primary" icon="check" onClick={onReviewed}>Mark reviewed</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
