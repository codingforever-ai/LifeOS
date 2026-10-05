/**
 * AURA Visual Component Library — controlled, deterministic render blocks.
 * The AI model chooses a component type; LifeOS renders the actual component.
 * The model can NEVER generate arbitrary HTML/React.
 */
import type { ReactNode } from 'react';
import { ProgressRing, ProgressBar, Badge, Surface, Button } from '../../ui/primitives';

export interface VisualBlock {
  type: string;
  data: Record<string, unknown>;
}

/* ── Action Card: evidence of real mutations ── */
export function ActionCard({ data }: { data: Record<string, unknown> }) {
  const title = String(data.title ?? 'Changes made');
  const changes = (data.changes as { label: string; count?: number }[]) ?? [];
  const linkLabel = String(data.linkLabel ?? 'View changes');
  return (
    <Surface className="aura-card action-card" tone="accent" pad="lg">
      <div className="action-card-head">
        <span className="action-card-icon">✓</span>
        <h4>{title}</h4>
      </div>
      {changes.length > 0 && (
        <ul className="action-card-list">
          {changes.map((c, i) => (
            <li key={i}><span className="action-card-bullet">•</span> {c.label}{c.count != null ? ` (${c.count})` : ''}</li>
          ))}
        </ul>
      )}
      {linkLabel && <button className="aura-card-link">{linkLabel} →</button>}
    </Surface>
  );
}

/* ── Goal Card: measurable goal with derived progress ── */
export function GoalCard({ data }: { data: Record<string, unknown> }) {
  const title = String(data.title ?? 'Goal');
  const current = String(data.current ?? '0');
  const target = String(data.target ?? '');
  const unit = String(data.unit ?? '');
  const progress = Number(data.progress ?? 0);
  const remaining = data.remaining ? String(data.remaining) : null;
  const rate = data.rate ? String(data.rate) : null;
  const status = String(data.status ?? 'active');
  const statusTone = status === 'on track' ? 'ok' : status === 'at risk' ? 'warn' : status === 'behind' ? 'danger' : undefined;
  return (
    <Surface className="aura-card goal-card-vis" pad="lg">
      <div className="goal-card-top">
        <div className="goal-card-icon">📚</div>
        <h4>{title}</h4>
      </div>
      <div className="goal-card-progress">
        <ProgressRing value={progress} size={72} label={title}>
          {Math.round(progress * 100)}%
        </ProgressRing>
        <div className="goal-card-meta">
          <div className="goal-card-value">{current}{unit && ` ${unit}`} {target && `/ ${target}`}</div>
          {remaining && <div className="goal-card-remaining muted small">{remaining} remaining</div>}
          {rate && <div className="goal-card-rate muted small">{rate}</div>}
          {status && <Badge tone={statusTone as 'ok' | 'warn' | 'danger' | undefined}>{status}</Badge>}
        </div>
      </div>
      <div className="goal-card-actions">
        {Boolean(data.onViewHistory) && <Button variant="ghost" size="sm">View History</Button>}
        {Boolean(data.onAct) && <Button variant="primary" size="sm">{String(data.actLabel ?? 'Study Now')}</Button>}
      </div>
    </Surface>
  );
}

/* ── Roadmap: visual milestone path ── */
export function Roadmap({ data }: { data: Record<string, unknown> }) {
  const title = String(data.title ?? 'Roadmap');
  const milestones = (data.milestones as { label: string; status: 'done' | 'current' | 'upcoming'; detail?: string }[]) ?? [];
  return (
    <Surface className="aura-card roadmap-card" pad="lg">
      <div className="roadmap-head"><span>🎯</span><h4>{title}</h4></div>
      <div className="roadmap-path">
        {milestones.map((m, i) => (
          <div key={i} className={`roadmap-node ${m.status}`}>
            <div className="roadmap-dot">{m.status === 'done' ? '✓' : m.status === 'current' ? '●' : '○'}</div>
            {i < milestones.length - 1 && <div className="roadmap-line" />}
            <div className="roadmap-label">{m.label}{m.detail && <span className="muted small"> {m.detail}</span>}</div>
          </div>
        ))}
      </div>
    </Surface>
  );
}

/* ── Work Timeline: step-by-step activity ── */
export function WorkTimeline({ data }: { data: Record<string, unknown> }) {
  const title = String(data.title ?? 'AURA worked on your plan');
  const steps = (data.steps as { label: string; status: 'done' | 'active' | 'pending' }[]) ?? [];
  return (
    <Surface className="aura-card work-timeline-card" tone="raised" pad="lg">
      <div className="work-timeline-head"><span>🛠️</span><h4>{title}</h4></div>
      <div className="work-timeline">
        {steps.map((s, i) => (
          <div key={i} className={`work-timeline-step ${s.status}`}>
            <div className="work-timeline-marker">
              {s.status === 'done' ? '✓' : s.status === 'active' ? '→' : '○'}
            </div>
            {i < steps.length - 1 && <div className="work-timeline-line" />}
            <span className="work-timeline-text">{s.label}</span>
          </div>
        ))}
      </div>
    </Surface>
  );
}

/* ── Task List: compact task summary ── */
export function TaskListCard({ data }: { data: Record<string, unknown> }) {
  const title = String(data.title ?? 'Tasks');
  const tasks = (data.tasks as { title: string; done?: boolean; priority?: string; due?: string }[]) ?? [];
  return (
    <Surface className="aura-card task-list-card" pad="lg">
      <div className="task-list-head"><span>📝</span><h4>{title}</h4></div>
      <ul className="task-list-items">
        {tasks.map((t, i) => (
          <li key={i} className={t.done ? 'done' : ''}>
            <span className="task-list-check">{t.done ? '✓' : '○'}</span>
            <span className="task-list-title">{t.title}</span>
            {t.due && <span className="task-list-due muted small">{t.due}</span>}
          </li>
        ))}
      </ul>
    </Surface>
  );
}

/* ── Metric Card: single key metric ── */
export function MetricCard({ data }: { data: Record<string, unknown> }) {
  const label = String(data.label ?? '');
  const value = String(data.value ?? '');
  const unit = String(data.unit ?? '');
  const trend = data.trend as string | undefined;
  return (
    <Surface className="aura-card metric-card" pad="lg">
      <div className="metric-label caption">{label}</div>
      <div className="metric-value">{value} {unit && <span className="muted">{unit}</span>}</div>
      {trend && <div className="metric-trend">{trend.startsWith('up') ? '📈' : trend.startsWith('down') ? '📉' : '➡️'} {trend}</div>}
    </Surface>
  );
}

/* ── Capacity Meter: available vs committed ── */
export function CapacityMeter({ data }: { data: Record<string, unknown> }) {
  const available = Number(data.available ?? 0);
  const committed = Number(data.committed ?? 0);
  const remaining = Number(data.remaining ?? 0);
  const overload = Boolean(data.overload);
  const pct = available > 0 ? Math.min(1, committed / available) : 0;
  return (
    <Surface className="aura-card capacity-meter-card" pad="lg">
      <div className="capacity-meter-head"><span>⚡</span><h4>Capacity</h4></div>
      <ProgressBar value={pct} label="Capacity usage" />
      <div className="capacity-meter-stats">
        <span className={overload ? 'danger' : ''}>{remaining}m remaining</span>
        <span className="muted">{committed}m / {available}m committed</span>
      </div>
      {overload && <div className="capacity-meter-warn">⚠️ Over capacity</div>}
    </Surface>
  );
}

/* ── Confirmation Card: proposal requiring approval ── */
export function ConfirmationCard({ data }: { data: Record<string, unknown> }) {
  const title = String(data.title ?? 'Proposed changes');
  const items = (data.items as string[]) ?? [];
  const strong = Boolean(data.strong);
  return (
    <Surface className="aura-card confirmation-card" tone={strong ? 'accent' : 'raised'} pad="lg">
      <div className="confirmation-head">
        <span>{strong ? '🔒' : '🧩'}</span>
        <h4>{title}</h4>
      </div>
      <ul className="confirmation-list">
        {items.map((item, i) => <li key={i}>• {item}</li>)}
      </ul>
    </Surface>
  );
}

/* ── Result Card: outcome summary ── */
export function ResultCard({ data }: { data: Record<string, unknown> }) {
  const title = String(data.title ?? 'Result');
  const body = String(data.body ?? '');
  const tone = String(data.tone ?? 'ok');
  const icon = tone === 'error' ? '❌' : tone === 'warn' ? '⚠️' : '✨';
  return (
    <Surface className="aura-card result-card" pad="lg">
      <div className="result-head"><span>{icon}</span><h4>{title}</h4></div>
      {body && <p className="muted">{body}</p>}
    </Surface>
  );
}

/* ── Study Plan: structured study sessions ── */
export function StudyPlanCard({ data }: { data: Record<string, unknown> }) {
  const title = String(data.title ?? 'Study Plan');
  const sessions = (data.sessions as { topic: string; duration?: string; when?: string; type?: string }[]) ?? [];
  return (
    <Surface className="aura-card study-plan-card" pad="lg">
      <div className="study-plan-head"><span>📚</span><h4>{title}</h4></div>
      <ul className="study-plan-list">
        {sessions.map((s, i) => (
          <li key={i}>
            <span className="study-plan-num">{i + 1}</span>
            <div>
              <div className="study-plan-topic">{s.topic}</div>
              <div className="muted small">{[s.type, s.duration, s.when].filter(Boolean).join(' · ')}</div>
            </div>
          </li>
        ))}
      </ul>
    </Surface>
  );
}

/* ── Component Registry ── */
const REGISTRY: Record<string, (props: { data: Record<string, unknown> }) => ReactNode> = {
  action_card: ActionCard,
  goal_card: GoalCard,
  roadmap: Roadmap,
  work_timeline: WorkTimeline,
  task_list: TaskListCard,
  metric_card: MetricCard,
  capacity_meter: CapacityMeter,
  confirmation_card: ConfirmationCard,
  result_card: ResultCard,
  study_plan: StudyPlanCard,
};

export const ALLOWED_TYPES = Object.keys(REGISTRY);

export function VisualBlockRenderer({ block }: { block: VisualBlock }) {
  const Comp = REGISTRY[block.type];
  if (!Comp) return null;
  return <Comp data={block.data} />;
}
