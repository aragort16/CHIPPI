import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStorage } from '../api/client.js';

const AuthContext = createContext(null);

export const ROLE_LABELS = {
  admin: 'Administrador',
  sales_manager: 'Gerente de Ventas',
  sales_rep: 'Vendedor',
  support: 'Soporte',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!tokenStorage.get()) { setLoading(false); return; }
      try {
        const { user } = await api.get('/auth/me');
        if (!cancelled) setUser(user);
      } catch {
        tokenStorage.clear();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const onUnauthorized = () => setUser(null);
    window.addEventListener('chippi:unauthorized', onUnauthorized);
    return () => { cancelled = true; window.removeEventListener('chippi:unauthorized', onUnauthorized); };
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await api.post('/auth/login', credentials);
    tokenStorage.set(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await api.post('/auth/register', payload);
    tokenStorage.set(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout, setUser }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
