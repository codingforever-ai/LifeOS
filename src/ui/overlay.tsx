import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { IconButton } from './primitives';

const EXIT_MS = 220;

/** Keeps content mounted long enough to play its exit animation. */
function usePresence(open: boolean) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) { setMounted(true); return; }
    const t = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(t);
  }, [open]);
  return mounted;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title: string;
  variant?: 'sheet' | 'dialog' | 'drawer';
  footer?: ReactNode;
  children: ReactNode;
}

/** One overlay primitive: bottom sheet (mobile), centred dialog, or side drawer. */
export function Overlay({ open, onClose, title, variant = 'sheet', footer, children }: OverlayProps) {
  const mounted = usePresence(open);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const first = focusables().find((el) => el.dataset.autofocus !== undefined) ?? focusables()[0];
    first?.focus();
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!mounted) return null;
  return createPortal(
    <div className="overlay" data-variant={variant} data-closing={!open} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panel} className="panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="grabber" aria-hidden="true" />
        <div className="panel-head">
          <h2 id={titleId}>{title}</h2>
          <IconButton icon="close" label="Close" size="sm" onClick={onClose} />
        </div>
        <div className="panel-body">{children}</div>
        {footer && <div className="panel-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ---------- Dropdown ---------- */
export function Menu<T extends string>({ label, trigger, value, options, onSelect }: { label: string; trigger: ReactNode; value?: T; options: { value: T; label: string; icon?: IconName }[]; onSelect: (v: T) => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    wrap.current?.querySelector<HTMLElement>('[role=menuitemradio]')?.focus();
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      const items = Array.from(wrap.current?.querySelectorAll<HTMLElement>('[role=menuitemradio]') ?? []);
      const i = items.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
      else if (e.key === 'Tab') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="menu-wrap" ref={wrap}>
      <button ref={btn} type="button" className="btn" data-variant="secondary" data-size="sm" aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}>
        {trigger}
      </button>
      {open && (
        <div className="menu" role="menu" aria-label={label}>
          {options.map((o) => (
            <button key={o.value} type="button" role="menuitemradio" aria-checked={o.value === value} className="menu-item" onClick={() => { onSelect(o.value); setOpen(false); btn.current?.focus(); }}>
              <span>{o.label}</span>
              {o.value === value && <Icon name="check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Toasts ---------- */
interface ToastItem { id: number; text: string; closing: boolean }
const ToastCtx = createContext<(text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const push = useCallback((text: string) => {
    const id = ++seq.current;
    setItems((x) => [...x.slice(-2), { id, text, closing: false }]);
    setTimeout(() => setItems((x) => x.map((t) => (t.id === id ? { ...t, closing: true } : t))), 3200);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3450);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => <div key={t.id} className="toast" data-closing={t.closing}>{t.text}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}
