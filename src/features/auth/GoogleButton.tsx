import { useEffect, useState } from 'react';
import { useAuth } from '../../core/auth';

interface Props { disabled?: boolean; }

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
  </svg>
);

/** Continue with Google — real OAuth redirect flow. Checks configuration and shows a
 *  polished inline message if credentials are missing, never navigates to a raw error. */
export default function GoogleButton({ disabled }: Props) {
  const { googleLogin, googleConfigured } = useAuth();
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { googleConfigured().then(setReady); }, [googleConfigured]);

  const onClick = async () => {
    setMsg('');
    const ok = ready || (await googleConfigured());
    if (!ok) { setMsg('Google sign-in is not configured yet. Add Google credentials in Settings to enable it.'); return; }
    googleLogin();
  };

  return (
    <div>
      <button type="button" className="ax-google" onClick={onClick} disabled={disabled} aria-label="Continue with Google">
        <GoogleIcon />
        <span className="ax-google-label">Continue with Google</span>
      </button>
      {msg && <p style={{ marginTop: 8, fontSize: 'var(--fs-small)', color: 'var(--text-3)', lineHeight: 1.4, animation: 'ax-fade-up 0.3s var(--ease-out) both' }} role="status">{msg}</p>}
    </div>
  );
}
