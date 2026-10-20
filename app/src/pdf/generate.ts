import { File } from 'expo-file-system';
import { printToFileAsync } from 'expo-print';
import type { MachineReport, Visit } from '@/domain/types';
import { LOGO_DATA_URI } from './logo';
import { buildReportHtml } from './reportHtml';

/** Renders one machine report to PDF and returns it as base64. Images are inlined (file URIs aren't reliable in the print WebView). */
export async function renderReportPdf(visit: Visit, machine: MachineReport): Promise<string> {
  const photoSrcs: string[] = [];
  for (const uri of machine.photos) {
    try {
      photoSrcs.push(`data:image/jpeg;base64,${await new File(uri).base64()}`);
    } catch {
      // A missing photo shouldn't block the report.
    }
  }

  const html = buildReportHtml({ visit, machine, logoSrc: LOGO_DATA_URI, photoSrcs });
  const result = await printToFileAsync({ html, base64: true });
  try {
    new File(result.uri).delete();
  } catch {
    // Temp file; ignore.
  }
  if (!result.base64) throw new Error('No se pudo generar el PDF');
  return result.base64;
}

export function reportFileName(visit: Visit, machine: MachineReport) {
  const clean = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '').trim();
  return `${machine.number} - ${clean(visit.client.company)} - ${clean(machine.serial)}.pdf`;
}
