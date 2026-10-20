import type { SQLiteDatabase } from 'expo-sqlite';
import { getVisit, listVisits, saveVisit } from '@/db/database';
import type { Visit } from '@/domain/types';
import { renderReportPdf, reportFileName } from '@/pdf/generate';
import { NetworkError, api } from './api';

export interface SyncResult {
  sent: number;
  failed: number;
  offline: boolean;
}

type Listener = (state: { running: boolean; last?: SyncResult }) => void;
const listeners = new Set<Listener>();
let running: Promise<SyncResult> | null = null;

export function onSyncChange(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const emit = (state: { running: boolean; last?: SyncResult }) => listeners.forEach((l) => l(state));

/** Sends every finished visit that hasn't been sent yet. Safe to call often: concurrent calls share one run. */
export function syncPending(db: SQLiteDatabase): Promise<SyncResult> {
  if (!running) {
    emit({ running: true });
    running = runSync(db).finally(() => {
      running = null;
    });
    running.then(
      (last) => emit({ running: false, last }),
      () => emit({ running: false }),
    );
  }
  return running;
}

async function runSync(db: SQLiteDatabase): Promise<SyncResult> {
  const result: SyncResult = { sent: 0, failed: 0, offline: false };
  const queue = (await listVisits(db, ['pending', 'error'])).reverse(); // oldest first
  for (const visit of queue) {
    try {
      await syncVisit(db, visit);
      result.sent++;
    } catch (e) {
      if (e instanceof NetworkError) {
        result.offline = true; // keep as pending; retry when the connection returns
        break;
      }
      result.failed++;
      // Re-read: numbers may have been assigned and saved before the failure.
      const latest = (await getVisit(db, visit.id)) ?? visit;
      await saveVisit(db, {
        ...latest,
        status: 'error',
        lastError: e instanceof Error ? e.message : String(e),
        updatedAt: new Date().toISOString(),
      });
    }
  }
  return result;
}

async function syncVisit(db: SQLiteDatabase, original: Visit) {
  let visit = original;

  // 1. Official numbers. Saved locally right away so a later failure never loses them.
  if (visit.machines.some((m) => !m.number)) {
    const numbers = await api.reserveNumbers(
      visit.id,
      visit.machines.map((m) => m.id),
      visit.technicianName,
    );
    visit = { ...visit, machines: visit.machines.map((m) => ({ ...m, number: numbers[m.id] ?? m.number })) };
    if (visit.machines.some((m) => !m.number)) throw new Error('El servidor no asignó todos los números');
    await saveVisit(db, visit);
  }

  // 2. PDFs, rendered after numbering so each one shows its number and its sibling reports.
  const reports = [];
  for (const m of visit.machines) {
    reports.push({
      machineId: m.id,
      number: m.number!,
      brandModel: m.brandModel,
      serial: m.serial,
      technology: m.technology,
      fileName: reportFileName(visit, m),
      pdf: await renderReportPdf(visit, m),
    });
  }

  // 3. Archive + email (server skips the email if this visit was already sent).
  await api.submitVisit({
    visitId: visit.id,
    technician: visit.technicianName,
    date: visit.date,
    client: { company: visit.client.company, email: visit.client.email },
    reports,
  });

  const now = new Date().toISOString();
  await saveVisit(db, { ...visit, status: 'sent', sentAt: now, lastError: undefined, updatedAt: now });
}
