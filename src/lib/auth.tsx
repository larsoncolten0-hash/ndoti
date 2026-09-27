'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './client';
import type { AppUser, Lang, Role, GeoPoint, Transport } from './types';
import i18n from '@/i18n';

export interface RegisterData {
  role: Exclude<Role, 'admin'>;
  name: string; phone: string; pin: string; lang: Lang; zoneId: string;
  landmark?: string; location?: GeoPoint;
  transport?: Transport; cniNumber?: string; momoNumber?: string;
}

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  login: (phone: string, pin: string) => Promise<void>;
  register: (d: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const apply = (u: AppUser | null) => {
    setUser(u);
    if (u?.lang && i18n.language !== u.lang) void i18n.changeLanguage(u.lang);
  };

  const refresh = useCallback(async () => {
    try { apply((await api<{ user: AppUser | null }>('/api/me')).user); }
    catch { /* offline with nothing cached: keep current state */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const login = async (phone: string, pin: string) => {
    apply((await api<{ user: AppUser }>('/api/auth/login', { phone, pin })).user);
  };
  const register = async (d: RegisterData) => {
    apply((await api<{ user: AppUser }>('/api/auth/register', d)).user);
  };
  const logout = async () => {
    await api('/api/auth/logout', {});
    // Remove this user's saved data from the phone.
    navigator.serviceWorker?.controller?.postMessage('clear-api-cache');
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
