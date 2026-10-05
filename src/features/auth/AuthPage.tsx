import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/auth';
import { ApiError } from '../../api/client';
import AuthBackground from './AuthBackground';
import LifeOSBrand from './LifeOSBrand';
import AuthPanel from './AuthPanel';

type Mode = 'login' | 'register';
type NeuralState = 'idle' | 'authenticating' | 'success' | 'error';

/**
 * LifeOS authentication experience — the gateway into the operating system.
 * Orchestrates cursor-reactive parallax, choreographed entrance, ambient motion,
 * and real email + Google authentication. All auth-specific, fully isolated.
 */
export default function AuthPage() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [neuralState, setNeuralState] = useState<NeuralState>('idle');

  const rootRef = useRef<HTMLDivElement>(null);
  // Shared mutable cursor state (no re-renders): current lerped + raw target.
  const cursor = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // Surface OAuth callback errors delivered via ?auth_error=… redirect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('auth_error');
    if (err) {
      setError(decodeURIComponent(err));
      setNeuralState('error');
      window.history.replaceState(null, '', window.location.pathname);
      const t = setTimeout(() => setNeuralState('idle'), 1800);
      return () => clearTimeout(t);
    }
  }, []);

  // Single rAF loop: lerp cursor → CSS variables for parallax + lighting (no React state).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return; // no cursor parallax in reduced-motion mode

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      const rect = root.getBoundingClientRect();
      cursor.current.tx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      cursor.current.ty = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    };
    const loop = () => {
      const c = cursor.current;
      c.x += (c.tx - c.x) * 0.07;
      c.y += (c.ty - c.y) * 0.07;
      root.style.setProperty('--ax-mx', c.x.toFixed(4));
      root.style.setProperty('--ax-my', c.y.toFixed(4));
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);

  const handleSubmit = async (fields: { name: string; email: string; password: string }) => {
    setBusy(true);
    setError('');
    setNeuralState('authenticating');
    try {
      if (mode === 'login') await login(fields.email, fields.password);
      else await register(fields.name, fields.email, fields.password);
      setNeuralState('success');
      nav('/');
    } catch (e) {
      setNeuralState('error');
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
      setTimeout(() => setNeuralState((s) => (s === 'error' ? 'idle' : s)), 1800);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ax-page" ref={rootRef}>
      <AuthBackground cursor={cursor} neuralState={neuralState} />
      <LifeOSBrand />
      <AuthPanel mode={mode} setMode={setMode} error={error} busy={busy} onSubmit={handleSubmit} />
    </div>
  );
}
