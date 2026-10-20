import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { getVisit, saveVisit } from '@/db/database';
import type { Visit } from '@/domain/types';

/**
 * Loads a visit and auto-saves every change to SQLite, so nothing is lost if the app closes.
 * Reloads on focus so edits made on child screens show up when navigating back.
 */
export function useVisit(id: string) {
  const db = useSQLiteContext();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loaded, setLoaded] = useState(false);
  const latest = useRef<Visit | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getVisit(db, id).then((v) => {
        if (!active) return;
        latest.current = v;
        setVisit(v);
        setLoaded(true);
      });
      return () => {
        active = false;
      };
    }, [db, id]),
  );

  const update = useCallback(
    (change: (v: Visit) => Visit) => {
      const current = latest.current;
      if (!current) return;
      const next = { ...change(current), updatedAt: new Date().toISOString() };
      latest.current = next;
      setVisit(next);
      saveVisit(db, next);
    },
    [db],
  );

  return { visit, loaded, update };
}
