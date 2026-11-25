import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, tokenStore } from '../api/client';
import type { Role, User } from '../api/types';

interface AuthState {
  user: User | null;
  ready: boolean;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
  can: (...roles: Role[]) => boolean;
}
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = tokenStore.get() ?? (api.mock ? 'mock-token' : null);
    if (!t) {
      setReady(true);
      return;
    }
    if (api.mock) tokenStore.set(t);
    api
      .me()
      .then(setUser)
      .catch(() => tokenStore.set(null))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const h = () => setUser(null);
    window.addEventListener('uat:signed-out', h);
    return () => window.removeEventListener('uat:signed-out', h);
  }, []);

  const signIn = useCallback((token: string, u: User) => {
    tokenStore.set(token);
    setUser(u);
  }, []);
  const signOut = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
  }, []);
  const can = useCallback((...roles: Role[]) => Boolean(user && roles.includes(user.role)), [user]);

  return <Ctx.Provider value={{ user, ready, signIn, signOut, can }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}
