import type { MachineReport, Visit } from './types';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME = /^([01]?\d|2[0-3]):[0-5]\d$/;

export const isEmail = (s: string) => EMAIL.test(s.trim());
export const isTime = (s: string) => TIME.test(s.trim());

export function machineIssues(m: MachineReport): string[] {
  const issues: string[] = [];
  if (!m.brandModel.trim()) issues.push('Marca / modelo');
  if (!m.serial.trim()) issues.push('Serie');
  if (!m.workDone.trim()) issues.push('Trabajos ejecutados');
  return issues;
}

/** Everything needed before the visit can be signed. */
export function visitIssues(v: Visit): string[] {
  const issues: string[] = [];
  if (!v.client.company.trim()) issues.push('Compañía');
  if (!isEmail(v.client.email)) issues.push('Correo del cliente');
  if (!v.visitType) issues.push('Tipo de visita');
  if (!isTime(v.entryTime)) issues.push('Hora de ingreso');
  if (!v.machines.length) issues.push('Al menos una máquina');
  v.machines.forEach((m, i) => {
    const mi = machineIssues(m);
    if (mi.length) issues.push(`Máquina ${i + 1}: ${mi.join(', ')}`);
  });
  return issues;
}

export function signOffIssues(v: Visit): string[] {
  const issues: string[] = [];
  if (!isTime(v.exitTime)) issues.push('Hora de salida');
  if (!v.signOff?.clientName.trim()) issues.push('Nombre de quien recibe');
  if (!v.signOff?.clientDocument.trim()) issues.push('Documento de quien recibe');
  if (!v.signOff?.clientSignature) issues.push('Firma del cliente');
  if (!v.signOff?.technicianSignature) issues.push('Firma del técnico');
  return issues;
}
