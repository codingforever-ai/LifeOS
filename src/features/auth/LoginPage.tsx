import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/auth';
import { ApiError } from '../../api/client';

/**
 * Premium login experience — split layout with animated brand showcase.
 * Designed to feel like a flagship product from a major technology company.
 */
export default function LoginPage() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password);
      nav('/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      {/* ── Brand showcase panel ── */}
      <div className="auth-showcase">
        <div className="auth-showcase-bg">
          <div className="auth-orb auth-orb-1" />
          <div className="auth-orb auth-orb-2" />
          <div className="auth-orb auth-orb-3" />
          <div className="auth-grid-overlay" />
        </div>
        <div className="auth-showcase-content">
          <div className="auth-logo">
            <svg viewBox="0 0 40 40" className="auth-logo-mark" aria-hidden="true">
              <defs>
                <linearGradient id="auth-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#6d3ee6" />
                </linearGradient>
              </defs>
              <rect width="40" height="40" rx="12" fill="url(#auth-grad)" />
              <circle cx="20" cy="20" r="7" fill="none" stroke="#fff" strokeWidth="2.5" strokeOpacity="0.95" />
              <circle cx="20" cy="20" r="2.5" fill="#fff" fillOpacity="0.95" />
            </svg>
            <span className="auth-logo-text">LifeOS</span>
          </div>
          <div className="auth-tagline">
            <h2>Don't manage your life.<br /><em>Understand it.</em></h2>
            <p>Your personal operating system — capture, plan, act, measure, reflect and learn across every domain of life, powered by AURA.</p>
          </div>
          <div className="auth-features">
            <div className="auth-feature">
              <span className="auth-feature-dot" />
              <span>Goals, projects & milestones with real measurement</span>
            </div>
            <div className="auth-feature">
              <span className="auth-feature-dot" />
              <span>Calendar, capacity & deadline intelligence</span>
            </div>
            <div className="auth-feature">
              <span className="auth-feature-dot" />
              <span>AURA — your AI life operator with real tools</span>
            </div>
          </div>
        </div>
        <div className="auth-showcase-footer">
          <span>Encrypted · Private · Yours</span>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <div className="auth-form-header">
            <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
            <p className="muted">{mode === 'login' ? 'Sign in to continue to LifeOS' : 'Start understanding your life today'}</p>
          </div>

          <div className="auth-mode-tabs" role="tablist" aria-label="Auth mode">
            <button role="tab" aria-selected={mode === 'login'} className={`auth-mode-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); }}>Sign in</button>
            <button role="tab" aria-selected={mode === 'register'} className={`auth-mode-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => { setMode('register'); setError(''); }}>Create account</button>
            <span className="auth-mode-indicator" style={{ transform: mode === 'login' ? 'translateX(0)' : 'translateX(100%)' }} />
          </div>

          <form onSubmit={submit} className="auth-form-fields">
            {mode === 'register' && (
              <div className="auth-field">
                <label htmlFor="name">Full name</label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required autoComplete="name" data-autofocus />
                </div>
              </div>
            )}
            <div className="auth-field">
              <label htmlFor="email">Email address</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" /></svg>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" data-autofocus={mode === 'login' ? '' : undefined} />
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="pw">Password</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                <input id="pw" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} />
                <button type="button" className="auth-pw-toggle" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'} tabIndex={-1}>
                  {showPw ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="auth-error" role="alert">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="auth-submit" disabled={busy}>
              {busy ? (
                <span className="auth-spinner-wrap"><span className="auth-spinner" /> <span>{mode === 'login' ? 'Signing in…' : 'Creating account…'}</span></span>
              ) : (
                <span>{mode === 'login' ? 'Sign in' : 'Create account'} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></span>
              )}
            </button>
          </form>

          <p className="auth-switch-mode">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
        <div className="auth-form-footer">
          <span>LifeOS · Your data stays yours</span>
        </div>
      </div>
    </div>
  );
}
