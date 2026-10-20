export type TechnologyId = 'CIJ' | 'LASER' | 'TIJ' | 'PIJ' | 'OTRA';

export interface ParamDef {
  key: string;
  label: string;
  unit?: string;
  kind: 'number' | 'text';
}

export interface Technology {
  id: TechnologyId;
  label: string;
  params: ParamDef[];
}

export interface Part {
  reference: string;
  description: string;
  quantity: number;
}

/** One report = one machine. Gets its own consecutive number on sync. */
export interface MachineReport {
  id: string;
  /** Official consecutive number (e.g. "TJ-000123"), assigned by the server on sync. */
  number?: string;
  brandModel: string;
  serial: string;
  workLine: string;
  technology: TechnologyId;
  initialState: string;
  workDone: string;
  /** Parameter values keyed by ParamDef.key. Labels are snapshotted so old reports survive config changes. */
  finalAdjustments: { key: string; label: string; unit?: string; value: string }[];
  observations: string;
  parts: Part[];
  /** Local file URIs (max 3), compressed JPEG. */
  photos: string[];
}

export interface ClientInfo {
  company: string;
  contact: string;
  role: string;
  city: string;
  email: string;
  phone: string;
}

export interface SignOff {
  clientName: string;
  clientDocument: string;
  /** PNG data URI */
  clientSignature: string;
  /** PNG data URI */
  technicianSignature: string;
}

export type VisitStatus = 'draft' | 'pending' | 'sent' | 'error';

/** A visit groups the machine reports signed together by the client. */
export interface Visit {
  id: string;
  status: VisitStatus;
  technicianId: string;
  technicianName: string;
  visitType: string;
  /** ISO date (YYYY-MM-DD) */
  date: string;
  /** HH:mm */
  entryTime: string;
  /** HH:mm */
  exitTime: string;
  client: ClientInfo;
  machines: MachineReport[];
  signOff?: SignOff;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  lastError?: string;
}

export const MAX_PHOTOS_PER_MACHINE = 3;
