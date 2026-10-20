import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { deleteSetting, getSetting, setSetting } from '@/db/database';
import { API_URL, ApiError, NetworkError, api, type Technician } from './api';

type CachedLogins = Record<string, { technician: Technician; pinHash: string }>;

interface SessionValue {
  technician: Technician | null;
  ready: boolean;
  login: (username: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

const hashPin = (username: string, pin: string) =>
  digestStringAsync(CryptoDigestAlgorithm.SHA256, `tecnijet:${username}:${pin}`);

export function SessionProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getSetting<Technician>(db, 'session').then((t) => {
      setTechnician(t);
      setReady(true);
    });
  }, [db]);

  const login = useCallback(
    async (rawUsername: string, pin: string) => {
      // Same normalization as the backend: accents and capitals don't matter.
      const username = rawUsername
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const cache = (await getSetting<CachedLogins>(db, 'logins')) ?? {};
      const pinHash = await hashPin(username, pin);
      let tech: Technician;

      try {
        tech = await api.login(username, pin);
        cache[username] = { technician: tech, pinHash };
        await setSetting(db, 'logins', cache);
      } catch (e) {
        if (!(e instanceof NetworkError)) throw e;
        const cached = cache[username];
        if (cached && cached.pinHash === pinHash) {
          tech = cached.technician; // offline login with the last valid credentials
        } else if (__DEV__ && !API_URL) {
          tech = { id: `dev-${username}`, name: rawUsername.trim() };
        } else if (cached) {
          throw new ApiError('PIN incorrecto');
        } else {
          throw new ApiError('Sin conexión. El primer ingreso de cada técnico requiere internet.');
        }
      }

      await setSetting(db, 'session', tech);
      setTechnician(tech);
    },
    [db],
  );

  const logout = useCallback(async () => {
    await deleteSetting(db, 'session');
    setTechnician(null);
  }, [db]);

  return <SessionContext.Provider value={{ technician, ready, login, logout }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
