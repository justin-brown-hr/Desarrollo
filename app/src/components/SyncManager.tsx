import { addNetworkStateListener } from 'expo-network';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { syncPending } from '@/services/sync';

const RETRY_MS = 2 * 60 * 1000;

/** Sends pending reports on start, when the connection returns, when the app is reopened, and every 2 min. */
export function SyncManager() {
  const db = useSQLiteContext();

  useEffect(() => {
    const sync = () => {
      syncPending(db).catch(() => {});
    };
    sync();
    const net = addNetworkStateListener((s) => {
      if (s.isConnected && s.isInternetReachable !== false) sync();
    });
    const app = AppState.addEventListener('change', (s) => s === 'active' && sync());
    const timer = setInterval(sync, RETRY_MS);
    return () => {
      net.remove();
      app.remove();
      clearInterval(timer);
    };
  }, [db]);

  return null;
}
