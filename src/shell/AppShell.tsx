import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BubbleIcon, Button } from '../ui/primitives';
import { Icon } from '../ui/Icon';
import { Overlay } from '../ui/overlay';
import { ALL_NAV, NAV_GROUPS } from './nav';
import { allDomains } from '../core/domains';
import { useCore } from '../core/store';
import type { NavItem } from './nav';

function SideLink({ item }: { item: NavItem }) {
  return (
    <NavLink to={item.path} end={item.path === '/'} className="side-link" aria-label={item.label} title={item.label}>
      <Icon name={item.icon} />
      <span className="side-label">{item.label}</span>
    </NavLink>
  );
}

/** Nav groups with the user's custom domains appended to the Domains group. */
function useGroups() {
  const { version } = useCore(); void version;
  const custom = allDomains().filter((d) => d.status === 'custom').map<NavItem>((d) => ({ id: `c-${d.id}`, label: d.name, path: d.path, icon: (d.icon as NavItem['icon']) }));
  return NAV_GROUPS.map((g) => (g.id === 'domains' ? { ...g, items: [...g.items.slice(0, -1), ...custom, ...g.items.slice(-1)] } : g));
}

function Sidebar() {
  const nav = useNavigate(); const groups = useGroups();
  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="brand">
        <BubbleIcon name="focus" tone="purple" size="md" />
        <span className="brand-name">LifeOS</span>
      </div>
      <Button variant="primary" icon="plus" onClick={() => nav('/create')} className="side-capture" aria-label="Create">
        <span className="side-label">Create</span>
      </Button>
      <nav className="side-nav">
        {groups.map((g) => (
          <div key={g.id} className="side-group">
            {g.label && <div className="caption side-group-label">{g.label}</div>}
            {g.items.map((i) => <SideLink key={i.id} item={i} />)}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function BottomNav({ onMore, moreActive }: { onMore: () => void; moreActive: boolean }) {
  const items = ALL_NAV.filter((i) => i.mobilePrimary);
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map((i) => (
        <NavLink key={i.id} to={i.path} end={i.path === '/'} className="tab-link">
          <Icon name={i.icon} />
          <span>{i.label}</span>
        </NavLink>
      ))}
      <button type="button" className="tab-link" data-active={moreActive} onClick={onMore} aria-haspopup="dialog">
        <Icon name="more" />
        <span>More</span>
      </button>
    </nav>
  );
}

export function AppShell() {
  const [more, setMore] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  const groups = useGroups();
  const moreActive = ALL_NAV.filter((i) => !i.mobilePrimary).some((i) => i.path === loc.pathname) || loc.pathname.startsWith('/domain/');

  return (
    <div className="shell">
      <a href="#main" className="skip-link">Skip to content</a>
      <Sidebar />
      <main id="main" className="main" tabIndex={-1}>
        <div key={loc.pathname} className="page page-enter">
          <Outlet />
        </div>
      </main>
      <BottomNav onMore={() => setMore(true)} moreActive={moreActive} />
      <Overlay open={more} onClose={() => setMore(false)} title="More">
        {groups.map((g) => (
          <section key={g.id} aria-label={g.label ?? 'Home'}>
            {g.label && <div className="caption more-group">{g.label}</div>}
            <div className="more-grid">
              {g.items.filter((i) => !i.mobilePrimary).map((i) => (
                <button key={i.id} type="button" className="more-item" onClick={() => { setMore(false); nav(i.path); }}>
                  <BubbleIcon name={i.icon} tone={loc.pathname === i.path ? 'purple' : 'graphite'} size="lg" />
                  <span>{i.label}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </Overlay>
    </div>
  );
}
