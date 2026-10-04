import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { Icon, isIconName } from './Icon';
import type { IconName } from './Icon';

/* ---------- Bubble icon ---------- */
export type Tone = 'purple' | 'royal' | 'lavender' | 'plum' | 'graphite' | 'slate' | 'mist' | 'sand';

export function BubbleIcon({ name, tone = 'purple', size = 'md' }: { name: IconName | string; tone?: Tone | string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  return (
    <span className="bubble" data-tone={tone} data-size={size}>
      {isIconName(name) && <Icon name={name} />}
    </span>
  );
}

/* ---------- Buttons ---------- */
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  icon?: IconName;
}
export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button({ variant = 'secondary', size = 'md', icon, children, type = 'button', ...rest }, ref) {
  return (
    <button ref={ref} type={type} className="btn" data-variant={variant} data-size={size} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
});

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; size?: 'md' | 'sm' }>(function IconButton(
  { icon, label, size = 'md', type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className="icon-btn" data-size={size} aria-label={label} title={label} {...rest}>
      <Icon name={icon} />
    </button>
  );
});

/* ---------- Surfaces ---------- */
export function Surface({ pad = 'md', tone, className = '', ...rest }: HTMLAttributes<HTMLDivElement> & { pad?: 'none' | 'md' | 'lg'; tone?: 'raised' | 'accent' }) {
  return <div className={`surface ${className}`} data-pad={pad} data-tone={tone} {...rest} />;
}

export function Badge({ tone, children }: { tone?: 'accent' | 'ok' | 'warn' | 'danger'; children: ReactNode }) {
  return <span className="badge" data-tone={tone}>{children}</span>;
}

/* ---------- Inputs ---------- */
export function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(p, ref) {
  return <input ref={ref} className="input" {...p} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(p, ref) {
  return <textarea ref={ref} className="input" {...p} />;
});

export const SearchField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function SearchField(p, ref) {
  return (
    <label className="search-field">
      <Icon name="search" />
      <input ref={ref} type="search" className="input" {...p} />
    </label>
  );
});

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />;
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <span className="check-hit">
      <button type="button" role="checkbox" aria-checked={checked} aria-label={label} className="check" onClick={onChange}>
        <Icon name="check" />
      </button>
    </span>
  );
}

/* ---------- Tabs ---------- */
export function Tabs<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" className="tab" aria-selected={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Progress ---------- */
export function ProgressBar({ value, label }: { value: number; label: string }) {
  const v = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
      <span style={{ ['--v' as string]: `${v}%` }} />
    </div>
  );
}

export function ProgressRing({ value, size = 56, label, children }: { value: number; size?: number; label: string; children?: ReactNode }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="ring" style={{ ['--rs' as string]: `${size}px` }} role="img" aria-label={`${label}: ${Math.round(v * 100)}%`}>
      <svg viewBox="0 0 48 48">
        <circle className="track" cx="24" cy="24" r={r} />
        <circle className="fill" cx="24" cy="24" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - v)} />
      </svg>
      <span>{children ?? `${Math.round(v * 100)}`}</span>
    </div>
  );
}

/* ---------- Layout ---------- */
export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <div className="caption eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </header>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="caption" style={{ fontSize: 'var(--fs-caption)', letterSpacing: '.04em', textTransform: 'uppercase', fontWeight: 500, color: 'var(--text-3)' }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ---------- Rows ---------- */
export function Row({ leading, title, subtitle, trailing, onClick, as = 'button' }: { leading?: ReactNode; title: ReactNode; subtitle?: ReactNode; trailing?: ReactNode; onClick?: () => void; as?: 'button' | 'div' }) {
  const body = (
    <>
      {leading}
      <span className="row-main">
        <span className="row-title">{title}</span>
        {subtitle && <span className="row-sub">{subtitle}</span>}
      </span>
      {trailing}
    </>
  );
  return as === 'div' || !onClick ? (
    <div className="row">{body}</div>
  ) : (
    <button type="button" className="row" onClick={onClick}>{body}</button>
  );
}

/* ---------- States & alerts ---------- */
export function EmptyState({ icon = 'sparkle', title, text, action }: { icon?: IconName; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="state">
      <BubbleIcon name={icon} tone="graphite" size="lg" />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', text, onRetry }: { title?: string; text: string; onRetry?: () => void }) {
  return (
    <div className="state" role="alert">
      <BubbleIcon name="alert" tone="plum" size="lg" />
      <h3>{title}</h3>
      <p>{text}</p>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function LoadingState({ rows = 4, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div className="list" style={{ gap: 8 }} role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton" style={{ opacity: 1 - i * 0.15 }} />)}
    </div>
  );
}

export function Alert({ tone, icon = 'info', children }: { tone?: 'accent' | 'warn'; icon?: IconName; children: ReactNode }) {
  return (
    <div className="alert" data-tone={tone} role="note">
      <Icon name={icon} />
      <div>{children}</div>
    </div>
  );
}
