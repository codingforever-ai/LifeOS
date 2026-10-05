import { useState } from 'react';
import { useAuth } from './auth';
import { BubbleIcon, Button } from '../ui/primitives';

/** Auth gate: shows login/register form when unauthenticated, children when authenticated. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === 'authed' || status === 'loading') return <>{children}</>;
  return <LoginForm />;
}

function LoginForm() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'register') {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <BubbleIcon name="focus" tone="purple" size="lg" />
          <h1>LifeOS</h1>
        </div>
        <p className="muted small" style={{ textAlign: 'center', marginBottom: 24 }}>
          {mode === 'register' ? 'Create your account to get started.' : 'Welcome back. Sign in to continue.'}
        </p>
        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && (
            <label className="field">
              <span className="field-label">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
                maxLength={80}
              />
            </label>
          )}
          <label className="field">
            <span className="field-label">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
              minLength={8}
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}
          </Button>
        </form>
        <button
          type="button"
          className="auth-switch"
          onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(null); }}
        >
          {mode === 'register' ? 'Already have an account? Sign in' : "Don't have an account? Register"}
        </button>
      </div>
    </div>
  );
}
