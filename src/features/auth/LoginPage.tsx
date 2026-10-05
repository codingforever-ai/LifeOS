import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/auth';
import { Button, Field, Input, Surface, Alert } from '../../ui/primitives';
import { BubbleIcon } from '../../ui/icons';
import { ApiError } from '../../api/client';

export default function LoginPage() {
  const { login, register, status } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password);
      nav('/');
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Something went wrong.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand"><BubbleIcon name="focus" tone="purple" size="xl" /><h1>LifeOS</h1></div>
        <p className="muted" style={{ textAlign: 'center', marginBottom: 24 }}>Your personal operating system.</p>
        <Surface pad="lg" tone="raised">
          <div className="tabs" role="tablist" aria-label="Auth mode" style={{ marginBottom: 20 }}>
            <button role="tab" aria-selected={mode === 'login'} className="tab" onClick={() => setMode('login')}>Sign in</button>
            <button role="tab" aria-selected={mode === 'register'} className="tab" onClick={() => setMode('register')}>Create account</button>
          </div>
          <form onSubmit={submit} className="auth-form">
            {mode === 'register' && <Field label="Name" id="name"><Input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" data-autofocus /></Field>}
            <Field label="Email" id="email"><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" data-autofocus={mode === 'login' ? '' : undefined} /></Field>
            <Field label="Password" id="pw"><Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} /></Field>
            {error && <Alert tone="warn" icon="alert">{error}</Alert>}
            <Button variant="primary" type="submit" disabled={busy} style={{ width: '100%' }}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</Button>
          </form>
        </Surface>
      </div>
    </div>
  );
}
