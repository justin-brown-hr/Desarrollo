/// <reference types="node" />
// Dev only: renders the report template with sample data to HTML files.
// Usage: npx tsx scripts/preview-report.ts <outDir>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildReportHtml } from '../src/pdf/reportHtml';
import type { Visit } from '../src/domain/types';
import { TECHNOLOGIES } from '../src/domain/technologies';

const outDir = process.argv[2] ?? 'preview';
mkdirSync(outDir, { recursive: true });

const logo =
  'data:image/svg+xml;base64,' + readFileSync(join(__dirname, '../assets/brand/logo.svg')).toString('base64');
const signature = (d: string) =>
  'data:image/svg+xml;base64,' +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 90"><path d="${d}" fill="none" stroke="#14286e" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  ).toString('base64');

const cij = (values: string[]) =>
  TECHNOLOGIES.CIJ.params.map((p, i) => ({ key: p.key, label: p.label, unit: p.unit, value: values[i] ?? '' }));

const visit: Visit = {
  id: 'sample',
  status: 'sent',
  technicianId: 't1',
  technicianName: 'Carlos Ramírez',
  visitType: 'Preventivo',
  date: '2026-10-20',
  entryTime: '08:15',
  exitTime: '11:40',
  client: {
    company: 'Alimentos del Valle S.A.S.',
    contact: 'Laura Gómez',
    role: 'Jefe de mantenimiento',
    city: 'Bogotá',
    email: 'mantenimiento@alimentosvalle.com',
    phone: '300 123 4567',
  },
  machines: [
    {
      id: 'm1',
      number: 'TJ-10451',
      brandModel: 'Videojet 1620',
      serial: 'VJ1620-0098821',
      workLine: 'Línea 3 – Empaque',
      technology: 'CIJ',
      initialState: 'Equipo con alarma de fase intermitente. Cabezal con acumulación de tinta en el deflector.',
      workDone:
        'Limpieza completa de cabezal y deflector.\nCambio de filtro principal y filtro de aire.\nCalibración de viscosidad y fase.\nPrueba de impresión 30 min sin fallas.',
      finalAdjustments: cij(['42', '78', 'Auto', '4.2', '4.3', '18.540', 'V410-D', 'V706-D', 'V901-D', '6', 'Buena']),
      observations: 'Se recomienda cambio de bomba en el próximo preventivo (horas cercanas a fin de vida útil).',
      parts: [
        { reference: 'SP369615', description: 'Filtro principal tinta', quantity: 1 },
        { reference: 'SP399010', description: 'Filtro de aire', quantity: 1 },
      ],
      photos: [],
    },
    {
      id: 'm2',
      number: 'TJ-10452',
      brandModel: 'Linx 8900',
      serial: 'LX89-552310',
      workLine: 'Línea 1 – Envasado',
      technology: 'CIJ',
      initialState: 'Funcionando. Mantenimiento preventivo programado.',
      workDone: 'Limpieza de cabezal, revisión de niveles y parámetros. Prueba de impresión.',
      finalAdjustments: cij(['38', '80', 'Auto', '3.9', '3.9', '7.210', '1240', '1512', '', '6', 'Buena']),
      observations: '',
      parts: [],
      photos: [],
    },
  ],
  signOff: {
    clientName: 'Laura Gómez',
    clientDocument: '52.345.678',
    clientSignature: signature('M10 60 C 40 10, 60 80, 90 40 S 140 20, 160 55 S 220 70, 290 30'),
    technicianSignature: signature('M15 55 C 30 20, 70 20, 80 55 C 90 80, 130 10, 170 45 L 260 40'),
  },
  createdAt: '2026-10-20T08:15:00',
  updatedAt: '2026-10-20T11:40:00',
};

for (const machine of visit.machines) {
  const file = join(outDir, `${machine.number}.html`);
  writeFileSync(file, buildReportHtml({ visit, machine, logoSrc: logo }));
  console.log(file);
}
