import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api/client';

export interface Settings {
  timezone: string; language: string; weekStart: number; workStart: string; workEnd: string; workDays: number[]; bufferMin: number;
  theme: 'dark' | 'light' | 'system'; density: 'comfortable' | 'compact'; motion: 'system' | 'reduced' | 'full';
  notifications: { deadlines: boolean; overdue: boolean; capacity: boolean; stalled: boolean; habits: boolean; agent: boolean; maxPerDay: number };
  privacy: { agentUsesMemory: boolean; agentMayReadNotes: boolean };
  agent: { enabled: boolean; confirmCreates: boolean };
  domains: string[]; onboarding: { done: boolean; step: number }; recentSearches: string[];
}
export interface User { id: string; email: string; name: string; created_at: string; settings: Settings }
type Status = 'loading' | 'anon' | 'authed';

interface AuthValue {
  status: Status; user: User | null; settings: Settings; tz: string;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  saveSettings: (patch: Partial<Settings>) => Promise<Settings>;
  setUser: (u: User) => void;
}
const Ctx = createContext<AuthValue | null>(null);
const FALLBACK = { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', language: 'en', weekStart: 1, workStart: '09:00', workEnd: '17:30', workDays: [1, 2, 3, 4, 5], bufferMin: 30, theme: 'dark', density: 'comfortable', motion: 'system', notifications: { deadlines: true, overdue: true, capacity: true, stalled: true, habits: true, agent: true, maxPerDay: 6 }, privacy: { agentUsesMemory: true, agentMayReadNotes: true }, agent: { enabled: true, confirmCreates: false }, domains: [], onboarding: { done: false, step: 0 }, recentSearches: [] } as Settings;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    api.get<User>('/auth/me').then((u) => { setUser(u); setStatus('authed'); }).catch(() => setStatus('anon'));
    const off = () => { setUser(null); setStatus('anon'); };
    window.addEventListener('lifeos:unauthorized', off);
    return () => window.removeEventListener('lifeos:unauthorized', off);
  }, []);

  const settings = user?.settings ?? FALLBACK;
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.density = settings.density;
    root.dataset.motion = settings.motion;
  }, [settings.density, settings.motion]);

  const login = useCallback(async (email: string, password: string) => { setUser(await api.post<User>('/auth/login', { email, password })); setStatus('authed'); }, []);
  const register = useCallback(async (name: string, email: string, password: string) => {
    setUser(await api.post<User>('/auth/register', { name, email, password, timezone: FALLBACK.timezone })); setStatus('authed');
  }, []);
  const logout = useCallback(async () => { await api.post('/auth/logout'); setUser(null); setStatus('anon'); }, []);
  const saveSettings = useCallback(async (patch: Partial<Settings>) => {
    const s = await api.patch<Settings>('/settings', patch);
    setUser((u) => (u ? { ...u, settings: s } : u));
    return s;
  }, []);

  const value = useMemo(() => ({ status, user, settings, tz: settings.timezone, login, register, logout, saveSettings, setUser }), [status, user, settings, login, register, logout, saveSettings]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useAuth() { const v = useContext(Ctx); if (!v) throw new Error('useAuth outside AuthProvider'); return v; }
