// Client for the Google Apps Script backend (see /backend).
// Configure in app/.env: EXPO_PUBLIC_API_URL and EXPO_PUBLIC_API_KEY.

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY ?? '';

/** No connection / server unreachable: the caller should keep working offline. */
export class NetworkError extends Error {}
/** The server answered with an error (wrong PIN, invalid data…). */
export class ApiError extends Error {}

export interface Technician {
  id: string;
  name: string;
}

async function call<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  if (!API_URL) throw new NetworkError('Servidor no configurado');
  let res: Response;
  try {
    // text/plain avoids a CORS preflight, which Apps Script doesn't support.
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, key: API_KEY, ...payload }),
    });
  } catch (e) {
    throw new NetworkError(e instanceof Error ? e.message : 'Sin conexión');
  }
  if (!res.ok) throw new NetworkError(`HTTP ${res.status}`);
  const body = (await res.json()) as { ok: boolean; error?: string; data?: T };
  if (!body.ok) throw new ApiError(body.error ?? 'Error del servidor');
  return body.data as T;
}

export interface SubmitReport {
  machineId: string;
  number: string;
  brandModel: string;
  serial: string;
  technology: string;
  fileName: string;
  /** PDF as base64 (no data URI prefix) */
  pdf: string;
}

export interface SubmitVisit {
  visitId: string;
  technician: string;
  date: string;
  client: { company: string; email: string };
  reports: SubmitReport[];
}

export const api = {
  login: (username: string, pin: string) => call<Technician>('login', { username, pin }),
  /** Returns machineId → official number. Idempotent per visit. */
  reserveNumbers: (visitId: string, machineIds: string[], technician: string) =>
    call<Record<string, string>>('reserveNumbers', { visitId, machineIds, technician }),
  /** Emails the PDFs to client + company. Idempotent per visit. */
  submitVisit: (visit: SubmitVisit) => call<{ alreadySent: boolean }>('submitVisit', { ...visit }),
};
