import { useState } from 'react';
import GoogleButton from './GoogleButton';

type Mode = 'login' | 'register';

const Icon = {
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" /></svg>,
  lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  eye: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>,
  eyeOff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>,
  arrow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
  alert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
};

interface Props {
  mode: Mode;
  setMode: (m: Mode) => void;
  error: string;
  busy: boolean;
  onSubmit: (fields: { name: string; email: string; password: string }) => void;
}

/** Right-panel authentication form — presentational; auth logic lives in AuthPage. */
export default function AuthPanel({ mode, setMode, error, busy, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, email, password });
  };

  return (
    <div className="ax-panel-wrap">
      <div className="ax-panel ax-enter ax-enter-x" style={{ animationDelay: '550ms' }}>
        <div className="ax-panel-header ax-enter ax-enter-fade" style={{ animationDelay: '750ms' }}>
          <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p>{mode === 'login' ? 'Sign in to continue to LifeOS' : 'Start understanding your life today'}</p>
        </div>

        <div className="ax-toggle ax-enter ax-enter-fade" style={{ animationDelay: '850ms' }} role="tablist" aria-label="Authentication mode">
          <button role="tab" aria-selected={mode === 'login'} className={`ax-toggle-btn ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Sign in</button>
          <button role="tab" aria-selected={mode === 'register'} className={`ax-toggle-btn ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>Create account</button>
          <span className="ax-toggle-indicator" style={{ transform: mode === 'login' ? 'translateX(0)' : 'translateX(100%)' }} />
        </div>

        <div className="ax-enter ax-enter-fade" style={{ animationDelay: '950ms' }}>
          <GoogleButton disabled={busy} />
        </div>

        <div className="ax-divider ax-enter ax-enter-fade" style={{ animationDelay: '1050ms' }}><span>or</span></div>

        <form onSubmit={submit} className="ax-form">
          {mode === 'register' && (
            <div className="ax-field ax-enter ax-enter-rise" style={{ animationDelay: '1150ms' }}>
              <label htmlFor="ax-name">Full name</label>
              <div className="ax-input-wrap">
                <span className="ax-input-icon">{Icon.user}</span>
                <input id="ax-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required autoComplete="name" />
              </div>
            </div>
          )}
          <div className="ax-field ax-enter ax-enter-rise" style={{ animationDelay: '1200ms' }}>
            <label htmlFor="ax-email">Email address</label>
            <div className="ax-input-wrap">
              <span className="ax-input-icon">{Icon.mail}</span>
              <input id="ax-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
            </div>
          </div>
          <div className="ax-field ax-enter ax-enter-rise" style={{ animationDelay: '1250ms' }}>
            <label htmlFor="ax-pw">Password</label>
            <div className="ax-input-wrap">
              <span className="ax-input-icon">{Icon.lock}</span>
              <input id="ax-pw" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} />
              <button type="button" className="ax-pw-toggle" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'} tabIndex={-1}>
                {showPw ? Icon.eyeOff : Icon.eye}
              </button>
            </div>
          </div>

          {error && (
            <div className="ax-error" role="alert">
              {Icon.alert}<span>{error}</span>
            </div>
          )}

          <button type="submit" className="ax-submit ax-enter ax-enter-rise" disabled={busy} style={{ animationDelay: '1300ms' }}>
            {busy ? <><span className="ax-spinner" /><span>{mode === 'login' ? 'Signing in…' : 'Creating account…'}</span></>
              : <>{mode === 'login' ? 'Sign in' : 'Create account'}{Icon.arrow}</>}
          </button>
        </form>

        <p className="ax-switch ax-enter ax-enter-fade" style={{ animationDelay: '1400ms' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
