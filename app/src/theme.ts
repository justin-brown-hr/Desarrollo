import type { VisitStatus } from '@/domain/types';

export const colors = {
  ink: '#1a1a1a',
  muted: '#6b6b6b',
  line: '#d9d9d9',
  soft: '#f3f3f3',
  bg: '#fafafa',
  white: '#ffffff',
  danger: '#c62828',
  primary: '#00112a',
  brand: '#00112a',
};

export const STATUS: Record<VisitStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Borrador', color: '#5f4b00', bg: '#fff3c4' },
  pending: { label: 'Pendiente de envío', color: '#0d47a1', bg: '#dce9fb' },
  sent: { label: 'Enviado', color: '#1b5e20', bg: '#dcf1dd' },
  error: { label: 'Error de envío', color: '#b71c1c', bg: '#fbdcdc' },
};
