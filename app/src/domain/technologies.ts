import type { Technology, TechnologyId } from './types';

// CIJ comes from the client's paper format ("Ajustes finales").
export const TECHNOLOGIES: Record<TechnologyId, Technology> = {
  CIJ: {
    id: 'CIJ',
    label: 'CIJ Inkjet',
    params: [
      { key: 'inkPressure', label: 'Presión tinta', kind: 'number' },
      { key: 'vacuum', label: 'Vacío', unit: '%', kind: 'number' },
      { key: 'phasing', label: 'Phasing', kind: 'text' },
      { key: 'viscoSet', label: 'Visco set', kind: 'number' },
      { key: 'viscoActual', label: 'Visco actual', kind: 'number' },
      { key: 'workHours', label: 'Horas trabajo', kind: 'number' },
      { key: 'ink', label: 'Tinta', kind: 'text' },
      { key: 'solvent', label: 'Solvente', kind: 'text' },
      { key: 'cleaner', label: 'Limpiador', kind: 'text' },
      { key: 'airPressure', label: 'Presión aire', kind: 'number' },
      { key: 'airQuality', label: 'Calidad aire', kind: 'text' },
    ],
  },
  // Parameters not defined yet by the client: the technician fills free rows (name + value).
  LASER: { id: 'LASER', label: 'Láser', params: [] },
  TIJ: { id: 'TIJ', label: 'TIJ', params: [] },
  PIJ: { id: 'PIJ', label: 'PIJ', params: [] },
  OTRA: { id: 'OTRA', label: 'Otra', params: [] },
};

export const TECHNOLOGY_LIST = Object.values(TECHNOLOGIES);

export const VISIT_TYPES = [
  'Preventivo',
  'Correctivo',
  'Instalación',
  'Garantía Nuevo',
  'Garantía Servicio',
  'Diagnóstico',
];
