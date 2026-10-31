import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';
import type { Preferences, User } from './types';

interface AuthApi {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
  setPreferences: (prefs: Preferences) => void;
}

const AuthContext = createContext<AuthApi | null>(null);

function applyTheme(theme: Preferences['theme'] | undefined): void {
  const resolved =
    theme === 'system' || !theme
      ? window.matchMedia?.('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;
  document.documentElement.dataset.theme = resolved;
  localStorage.setItem('emodulo-theme', theme ?? 'system');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<{ user: User | null }>('/auth/me');
      setUser(data.user);
      if (data.user) applyTheme(data.user.preferences?.theme);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const handler = () => {
      if ((user?.preferences?.theme ?? localStorage.getItem('emodulo-theme')) === 'system') applyTheme('system');
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ user: User }>('/auth/login', { email, password });
    setUser(data.user);
    applyTheme(data.user.preferences?.theme);
  }, []);

  const register = useCallback(async (email: string, password: string, confirmPassword: string) => {
    const data = await api.post<{ user: User }>('/auth/register', { email, password, confirmPassword });
    setUser(data.user);
    applyTheme(data.user.preferences?.theme);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const setPreferences = useCallback(
    (prefs: Preferences) => {
      setUser((prev) => (prev ? { ...prev, preferences: prefs } : prev));
      applyTheme(prefs.theme);
    },
    [],
  );

  const value = useMemo<AuthApi>(
    () => ({ user, loading, login, register, logout, refresh, updateUser, setPreferences }),
    [user, loading, login, register, logout, refresh, updateUser, setPreferences],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
