import { randomUUID } from 'expo-crypto';
import { TECHNOLOGIES } from './technologies';
import type { MachineReport, TechnologyId, Visit } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function newVisit(technician: { id: string; name: string }): Visit {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    status: 'draft',
    technicianId: technician.id,
    technicianName: technician.name,
    visitType: '',
    date: today(),
    entryTime: nowTime(),
    exitTime: '',
    client: { company: '', contact: '', role: '', city: '', email: '', phone: '' },
    machines: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Builds the parameter list for a technology, keeping values already typed for matching keys. */
const CUSTOM_ROWS = 4;

export const isCustomParam = (key: string) => key.startsWith('custom-');

export const newCustomParam = () => ({ key: `custom-${randomUUID()}`, label: '', value: '' });

export function adjustmentsFor(technology: TechnologyId, previous: MachineReport['finalAdjustments'] = []) {
  const params = TECHNOLOGIES[technology].params;
  if (!params.length) {
    // No predefined list: keep free rows already typed, or start with a few blank ones.
    const kept = previous.filter((x) => isCustomParam(x.key));
    return kept.length ? kept : Array.from({ length: CUSTOM_ROWS }, newCustomParam);
  }
  return params.map((p) => ({
    key: p.key,
    label: p.label,
    unit: p.unit,
    value: previous.find((x) => x.key === p.key)?.value ?? '',
  }));
}

export function newMachine(technology: TechnologyId = 'CIJ'): MachineReport {
  return {
    id: randomUUID(),
    brandModel: '',
    serial: '',
    workLine: '',
    technology,
    initialState: '',
    workDone: '',
    finalAdjustments: adjustmentsFor(technology),
    observations: '',
    parts: [],
    photos: [],
  };
}
