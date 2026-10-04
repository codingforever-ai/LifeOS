import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BubbleIcon, Button } from '../ui/primitives';
import { Icon } from '../ui/Icon';
import { Overlay } from '../ui/overlay';
import { ALL_NAV, NAV_GROUPS } from './nav';
import type { NavItem } from './nav';

function SideLink({ item }: { item: NavItem }) {
  return (
    <NavLink to={item.path} end={item.path === '/'} className="side-link" aria-label={item.label} title={item.label}>
      <Icon name={item.icon} />
      <span className="side-label">{item.label}</span>
    </NavLink>
  );
}

function Sidebar() {
  const nav = useNavigate();
  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="brand">
        <BubbleIcon name="focus" tone="purple" size="md" />
        <span className="brand-name">LifeOS</span>
      </div>
      <Button variant="primary" icon="plus" onClick={() => nav('/capture')} className="side-capture" aria-label="Capture">
        <span className="side-label">Capture</span>
      </Button>
      <nav className="side-nav">
        {NAV_GROUPS.map((g) => (
          <div key={g.id} className="side-group">
            {g.label && <div className="caption side-group-label">{g.label}</div>}
            {g.items.filter((i) => i.id !== 'capture').map((i) => <SideLink key={i.id} item={i} />)}
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
  const secondary = ALL_NAV.filter((i) => !i.mobilePrimary);
  const moreActive = secondary.some((i) => i.path === loc.pathname);

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
        <div className="more-grid">
          {secondary.map((i) => (
            <button key={i.id} type="button" className="more-item" onClick={() => { setMore(false); nav(i.path); }}>
              <BubbleIcon name={i.icon} tone={i.id === 'capture' ? 'purple' : 'graphite'} size="lg" />
              <span>{i.label}</span>
            </button>
          ))}
        </div>
      </Overlay>
    </div>
  );
}
