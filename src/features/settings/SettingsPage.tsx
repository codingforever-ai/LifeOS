import { useState } from 'react';
import { Alert, BubbleIcon, Button, PageHeader, Row, Surface, Switch } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import type { IconName } from '../../ui/Icon';
import { Overlay } from '../../ui/overlay';

interface Item { label: string; hint?: string; toggle?: boolean }
interface SectionDef { id: string; title: string; sub: string; icon: IconName; items: Item[] }

const SECTIONS: SectionDef[] = [
  { id: 'appearance', title: 'Appearance', sub: 'Theme, density, motion', icon: 'palette', items: [{ label: 'Reduce motion', hint: 'Also follows your system setting', toggle: false }, { label: 'Compact density', toggle: false }, { label: 'Dark theme', hint: 'LifeOS is dark-first', toggle: true }] },
  { id: 'account', title: 'Account', sub: 'Profile and sign-in', icon: 'user', items: [{ label: 'Profile' }, { label: 'Sign-in methods' }] },
  { id: 'notifications', title: 'Notifications', sub: 'Reminders and summaries', icon: 'bell', items: [{ label: 'Daily summary', toggle: true }, { label: 'Deadline reminders', toggle: true }, { label: 'Agent suggestions', toggle: false }] },
  { id: 'privacy', title: 'Privacy', sub: 'Control what LifeOS knows', icon: 'lock', items: [{ label: 'Allow Agent to read calendar', toggle: true }, { label: 'Allow Agent to change data', hint: 'Always asks first', toggle: false }] },
  { id: 'integrations', title: 'Integrations', sub: 'Connected services', icon: 'plug', items: [{ label: 'Calendar sync' }, { label: 'Email' }, { label: 'Health data' }] },
  { id: 'data', title: 'Data', sub: 'Export and storage', icon: 'database', items: [{ label: 'Export my data' }, { label: 'Delete my data' }] },
  { id: 'preferences', title: 'Preferences', sub: 'Week start, time, language', icon: 'sliders', items: [{ label: 'Week starts on Monday', toggle: true }, { label: '24-hour time', toggle: false }] },
];

export default function SettingsPage() {
  const [open, setOpen] = useState<SectionDef | null>(null);
  const [vals, setVals] = useState<Record<string, boolean>>({});
  const get = (k: string, d: boolean) => vals[k] ?? d;

  return (
    <>
      <PageHeader eyebrow="Settings" title="Make it yours" />
      <Surface pad="none">
        <ul className="list divided stagger">
          {SECTIONS.map((s) => (
            <li key={s.id}><Row leading={<BubbleIcon name={s.icon} tone="graphite" />} title={s.title} subtitle={s.sub} trailing={<Icon name="chevron-right" className="chev" />} onClick={() => setOpen(s)} /></li>
          ))}
        </ul>
      </Surface>
      <p className="faint small" style={{ marginTop: 16 }}>LifeOS · Phase 1 foundation</p>

      <Overlay open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ''} footer={<Button onClick={() => setOpen(null)}>Done</Button>}>
        {open && (
          <div className="detail-grid">
            <div className="list divided">
              {open.items.map((i) => (
                <Row as="div" key={i.label} title={i.label} subtitle={i.hint}
                  trailing={i.toggle !== undefined ? <Switch label={i.label} checked={get(open.id + i.label, i.toggle)} onChange={(v) => setVals((x) => ({ ...x, [open.id + i.label]: v }))} /> : <Icon name="chevron-right" className="chev" />} />
              ))}
            </div>
            <Alert icon="info">Settings are a Phase 1 shell. Changes aren’t persisted yet.</Alert>
          </div>
        )}
      </Overlay>
    </>
  );
}
