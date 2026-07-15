import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api, setAccessToken, setOnAuthLost } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', undefined, { auth: false });
    } catch {
      // ignore
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setOnAuthLost(() => {
      setAccessToken(null);
      setUser(null);
    });
  }, []);

  // Attempt to restore a session on first load via the refresh cookie.
  useEffect(() => {
    let active = true;
    (async () => {
      const ok = await api.tryRefresh();
      if (ok && active) {
        try {
          const { user: me } = await api.get('/auth/me');
          if (active) setUser(me);
        } catch {
          // ignore
        }
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username, password, expectedRole) => {
    const query = expectedRole ? `?role=${expectedRole}` : '';
    const data = await api.post(`/auth/login${query}`, { username, password }, { auth: false });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
