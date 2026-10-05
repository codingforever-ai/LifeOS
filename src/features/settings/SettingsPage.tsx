import { useState } from 'react';
import { useAuth } from '../../core/auth';
import { api } from '../../api/client';
import { Alert, BubbleIcon, Button, Field, Input, PageHeader, Row, Surface, Switch, LoadingState, ErrorState } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import type { IconName } from '../../ui/Icon';
import { Overlay } from '../../ui/overlay';
import { useToast } from '../../ui/overlay';

type SectionId = 'appearance' | 'agent' | 'notifications' | 'privacy' | 'data' | 'account';
const SECTIONS: { id: SectionId; title: string; sub: string; icon: IconName }[] = [
  { id: 'appearance', title: 'Appearance', sub: 'Theme, density, motion', icon: 'palette' },
  { id: 'agent', title: 'AI / Agent', sub: 'Enable, confirm creates, quota', icon: 'agent' },
  { id: 'notifications', title: 'Notifications', sub: 'Reminders and summaries', icon: 'bell' },
  { id: 'privacy', title: 'Privacy', sub: 'Control what LifeOS knows', icon: 'lock' },
  { id: 'data', title: 'Data', sub: 'Export, import, delete', icon: 'database' },
  { id: 'account', title: 'Account', sub: 'Profile and sign-in', icon: 'user' },
];

export default function SettingsPage() {
  const { user, settings, saveSettings, logout } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState<SectionId | null>(null);
  const [saving, setSaving] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  const patch = async (p: Record<string, unknown>, msg: string) => {
    setSaving(true);
    try { await saveSettings(p); toast(msg); } catch { toast('Could not save. Try again.'); }
    finally { setSaving(false); }
  };

  const doExport = async () => {
    try {
      const res = await fetch('/api/export', { credentials: 'same-origin', headers: { 'x-lifeos': '1' } });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      setExportUrl(URL.createObjectURL(blob));
      toast('Export ready');
    } catch { toast('Export failed'); }
  };

  return (
    <>
      <PageHeader eyebrow="Settings" title="Make it yours" />
      <Surface pad="none">
        <ul className="list divided stagger">
          {SECTIONS.map((s) => (
            <li key={s.id}><Row leading={<BubbleIcon name={s.icon} tone="graphite" />} title={s.title} subtitle={s.sub} trailing={<Icon name="chevron-right" className="chev" />} onClick={() => setOpen(s.id)} /></li>
          ))}
        </ul>
      </Surface>
      <p className="faint small" style={{ marginTop: 16 }}>LifeOS · {user?.email}</p>

      <Overlay open={open === 'appearance'} onClose={() => setOpen(null)} title="Appearance" footer={<Button onClick={() => setOpen(null)}>Done</Button>}>
        <div className="detail-grid">
          <Row as="div" title="Density" subtitle="Comfortable or compact" trailing={
            <select className="input" value={settings.density} onChange={(e) => patch({ density: e.target.value }, 'Density updated')}>
              <option value="comfortable">Comfortable</option><option value="compact">Compact</option>
            </select>} />
          <Row as="div" title="Motion" subtitle="System, reduced, or full" trailing={
            <select className="input" value={settings.motion} onChange={(e) => patch({ motion: e.target.value }, 'Motion updated')}>
              <option value="system">System</option><option value="reduced">Reduced</option><option value="full">Full</option>
            </select>} />
        </div>
      </Overlay>

      <Overlay open={open === 'agent'} onClose={() => setOpen(null)} title="AI / Agent" footer={<Button onClick={() => setOpen(null)}>Done</Button>}>
        <div className="detail-grid">
          <Row as="div" title="Enable Agent" subtitle="Turn the Agent on or off" trailing={<Switch label="Enable Agent" checked={settings.agent.enabled} onChange={(v) => patch({ agent: { ...settings.agent, enabled: v } }, v ? 'Agent enabled' : 'Agent disabled')} />} />
          <Row as="div" title="Confirm creates" subtitle="Ask before creating new records" trailing={<Switch label="Confirm creates" checked={settings.agent.confirmCreates} onChange={(v) => patch({ agent: { ...settings.agent, confirmCreates: v } }, 'Updated')} />} />
        </div>
      </Overlay>

      <Overlay open={open === 'notifications'} onClose={() => setOpen(null)} title="Notifications" footer={<Button onClick={() => setOpen(null)}>Done</Button>}>
        <div className="detail-grid">
          {Object.entries(settings.notifications).filter(([k]) => k !== 'maxPerDay').map(([k, v]) => (
            <Row as="div" key={k} title={k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())} trailing={<Switch label={k} checked={v as boolean} onChange={(val) => patch({ notifications: { ...settings.notifications, [k]: val } }, 'Updated')} />} />
          ))}
        </div>
      </Overlay>

      <Overlay open={open === 'privacy'} onClose={() => setOpen(null)} title="Privacy" footer={<Button onClick={() => setOpen(null)}>Done</Button>}>
        <div className="detail-grid">
          <Row as="div" title="Agent uses memory" subtitle="Let the Agent read your memories" trailing={<Switch label="Agent uses memory" checked={settings.privacy.agentUsesMemory} onChange={(v) => patch({ privacy: { ...settings.privacy, agentUsesMemory: v } }, 'Updated')} />} />
          <Row as="div" title="Agent reads notes" subtitle="Let the Agent read your notes" trailing={<Switch label="Agent reads notes" checked={settings.privacy.agentMayReadNotes} onChange={(v) => patch({ privacy: { ...settings.privacy, agentMayReadNotes: v } }, 'Updated')} />} />
        </div>
      </Overlay>

      <Overlay open={open === 'data'} onClose={() => setOpen(null)} title="Data" footer={<Button onClick={() => setOpen(null)}>Done</Button>}>
        <div className="detail-grid">
          <Row as="div" title="Export my data" subtitle="Download all your LifeOS data as JSON" trailing={<Button icon="download" onClick={doExport}>Export</Button>} />
          {exportUrl && <a href={exportUrl} download="lifeos-export.json" className="link small">Download export</a>}
        </div>
      </Overlay>

      <Overlay open={open === 'account'} onClose={() => setOpen(null)} title="Account" footer={<Button onClick={() => setOpen(null)}>Done</Button>}>
        <div className="detail-grid">
          <Row as="div" title={user?.name ?? ''} subtitle={user?.email ?? ''} />
          <Button variant="danger" icon="close" onClick={() => { logout(); setOpen(null); }}>Sign out</Button>
        </div>
      </Overlay>
    </>
  );
}
