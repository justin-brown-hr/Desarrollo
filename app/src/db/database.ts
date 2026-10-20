import type { SQLiteDatabase } from 'expo-sqlite';
import type { Visit, VisitStatus } from '@/domain/types';

export const DATABASE_NAME = 'tecnijet.db';
const DATABASE_VERSION = 1;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= DATABASE_VERSION) return;

  if (version === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE visits (
        id TEXT PRIMARY KEY NOT NULL,
        status TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        data TEXT NOT NULL
      );
      CREATE INDEX visits_status ON visits(status);
      CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
    `);
    version = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

// A visit is small (text + file URIs + SVG signatures), so it's stored as one JSON document.
export async function saveVisit(db: SQLiteDatabase, visit: Visit) {
  await db.runAsync(
    'INSERT OR REPLACE INTO visits (id, status, updated_at, data) VALUES (?, ?, ?, ?)',
    visit.id,
    visit.status,
    visit.updatedAt,
    JSON.stringify(visit),
  );
}

export async function getVisit(db: SQLiteDatabase, id: string): Promise<Visit | null> {
  const row = await db.getFirstAsync<{ data: string }>('SELECT data FROM visits WHERE id = ?', id);
  return row ? (JSON.parse(row.data) as Visit) : null;
}

export async function listVisits(db: SQLiteDatabase, statuses?: VisitStatus[]): Promise<Visit[]> {
  const rows = statuses?.length
    ? await db.getAllAsync<{ data: string }>(
        `SELECT data FROM visits WHERE status IN (${statuses.map(() => '?').join(',')}) ORDER BY updated_at DESC`,
        statuses,
      )
    : await db.getAllAsync<{ data: string }>('SELECT data FROM visits ORDER BY updated_at DESC');
  return rows.map((r) => JSON.parse(r.data) as Visit);
}

export async function deleteVisit(db: SQLiteDatabase, id: string) {
  await db.runAsync('DELETE FROM visits WHERE id = ?', id);
}

export async function getSetting<T>(db: SQLiteDatabase, key: string): Promise<T | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row ? (JSON.parse(row.value) as T) : null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: unknown) {
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, JSON.stringify(value));
}

export async function deleteSetting(db: SQLiteDatabase, key: string) {
  await db.runAsync('DELETE FROM settings WHERE key = ?', key);
}
