import type { MachineReport, Visit } from '../domain/types';
import { CERTIFICATION, HABEAS_DATA } from '../domain/legal';
import { TECHNOLOGIES } from '../domain/technologies';

export const COMPANY = {
  name: 'Tecnijet CA SAS',
  address: 'Calle 63 I # 113 B - 23, Engativá, Bogotá - Colombia',
  phones: 'WhatsApp 310 698 2581',
  coordinator: 'WhatsApp Coordinador Técnico: 324 650 6252',
  serviceTech: 'WhatsApp Técnico de Servicio: 324 650 6249',
  email: 'info@tecnijet.com',
  web: 'www.tecnijet.com',
};

export interface ReportHtmlInput {
  visit: Visit;
  machine: MachineReport;
  logoSrc: string;
  /** Photo sources usable by the PDF renderer (data URIs on device). */
  photoSrcs?: string[];
}

const esc = (s: string | number | undefined | null) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const multiline = (s: string) => (s.trim() ? esc(s).replace(/\n/g, '<br>') : '<span class="empty">—</span>');

export function totalHours(entry: string, exit: string): string {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  if (!/^\d{1,2}:\d{2}$/.test(entry) || !/^\d{1,2}:\d{2}$/.test(exit)) return '';
  let diff = toMin(exit) - toMin(entry);
  if (diff < 0) diff += 24 * 60;
  return `${Math.floor(diff / 60)}h ${String(diff % 60).padStart(2, '0')}m`;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

const field = (label: string, value: string, wide = false) =>
  `<div class="f${wide ? ' wide' : ''}"><div class="l">${esc(label)}</div><div class="v">${value.trim() ? esc(value) : '<span class="empty">—</span>'}</div></div>`;

export function buildReportHtml({ visit, machine, logoSrc, photoSrcs = [] }: ReportHtmlInput): string {
  const tech = TECHNOLOGIES[machine.technology];
  const others = visit.machines.filter((m) => m.id !== machine.id && m.number).map((m) => m.number);
  const signOff = visit.signOff;

  const adjustments = machine.finalAdjustments.filter((p) => p.label.trim() || p.value.trim());
  const params = adjustments.length
    ? `<div class="params">${adjustments
        .map(
          (p) =>
            `<div class="p"><div class="l">${esc(p.label)}</div><div class="v">${p.value.trim() ? esc(p.value) + (p.unit ? ` <small>${esc(p.unit)}</small>` : '') : '<span class="empty">—</span>'}</div></div>`,
        )
        .join('')}</div>`
    : '<p class="empty">Sin parámetros registrados</p>';

  const parts = machine.parts.length
    ? `<table class="parts"><thead><tr><th style="width:25%">Referencia</th><th>Descripción</th><th style="width:12%" class="num">Cant.</th></tr></thead><tbody>${machine.parts
        .map(
          (p) =>
            `<tr><td>${esc(p.reference)}</td><td>${esc(p.description)}</td><td class="num">${esc(p.quantity)}</td></tr>`,
        )
        .join('')}</tbody></table>`
    : '<p class="empty">No se usaron piezas</p>';

  const photos = photoSrcs.length
    ? `<section><h2>Registro fotográfico</h2><div class="photos">${photoSrcs.map((src) => `<img src="${esc(src)}">`).join('')}</div></section>`
    : '';

  const sig = (src: string | undefined) => (src ? `<img src="${esc(src)}">` : '');

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Reporte ${esc(machine.number ?? 'borrador')}</title>
<style>
  @page { size: letter; margin: 10mm 12mm 10mm; }
  :root { --ink:#1a1a1a; --muted:#6b6b6b; --line:#d9d9d9; --soft:#f3f3f3; --accent:#00112a; --bar:#dde6f2; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 9.5pt; color: var(--ink); line-height: 1.35; }
  header { display:flex; align-items:center; justify-content:space-between; border-bottom: 2.5px solid var(--accent); padding-bottom: 6px; margin-bottom: 8px; }
  header img { height: 64px; }
  .doc { text-align:right; }
  .doc .t { font-size: 8pt; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
  .doc .n { font-size: 20pt; font-weight: 700; letter-spacing: .02em; }
  .doc .d { font-size: 8.5pt; color: var(--muted); }
  section { margin-bottom: 5px; }
  .keep { break-inside: avoid; }
  h2 { break-after: avoid; font-size: 8pt; letter-spacing: .1em; text-transform: uppercase; margin: 0 0 4px; padding: 3px 6px; background: var(--bar); color: var(--accent); border-left: 3px solid var(--accent); }
  .grid { display:grid; grid-template-columns: repeat(4, 1fr); gap: 3px 10px; padding: 0 2px; }
  .grid .wide { grid-column: span 2; }
  .f .l, .p .l { font-size: 7pt; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
  .f .v { font-weight: 600; border-bottom: 1px solid var(--line); min-height: 15px; padding-bottom: 1px; }
  .box { border: 1px solid var(--line); border-radius: 4px; padding: 5px 8px; min-height: 26px; }
  .params { display:grid; grid-template-columns: repeat(4, 1fr); border:1px solid var(--line); border-radius:4px; overflow:hidden; }
  .p { padding: 4px 7px; border-right:1px solid var(--line); border-bottom:1px solid var(--line); }
  .p .v { font-weight: 600; font-size: 10pt; }
  .p small { font-weight: 400; color: var(--muted); }
  table.parts { width:100%; border-collapse: collapse; }
  .parts th { text-align:left; font-size: 7pt; text-transform: uppercase; letter-spacing:.06em; color: var(--muted); border-bottom: 1.5px solid var(--accent); padding: 3px 6px; }
  .parts td { border-bottom: 1px solid var(--line); padding: 4px 6px; }
  .num { text-align: right; }
  .photos { display:flex; gap: 8px; }
  .photos img { width: 32%; height: 120px; object-fit: cover; border-radius: 4px; border:1px solid var(--line); }
  .empty { color: #a0a0a0; font-weight: 400; font-style: italic; }
  .cert { font-size: 6.5pt; line-height: 1.25; color: var(--muted); margin: 0 0 3px; text-align: justify; }
  .sigs { display:grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .sig .img { height: 40px; border-bottom: 1px solid var(--ink); display:flex; align-items:flex-end; justify-content:center; }
  .sig .img img { max-height: 38px; max-width: 100%; }
  .sig .who { font-weight: 600; margin-top: 3px; }
  .sig .sub { font-size: 8pt; color: var(--muted); }
  .note { font-size: 7.5pt; color: var(--muted); margin-top: 6px; }
  footer { margin-top: 6px; padding-top: 5px; border-top: 1px solid var(--line); font-size: 7pt; color: var(--muted); text-align: center; line-height: 1.5; }
  footer b { color: var(--accent); }
</style></head>
<body>
  <header>
    <img src="${esc(logoSrc)}" alt="Tecnijet">
    <div class="doc">
      <div class="t">Reporte de trabajo</div>
      <div class="n">${esc(machine.number ?? 'BORRADOR')}</div>
      <div class="d">${esc(formatDate(visit.date))} · ${esc(visit.visitType)}</div>
      <div class="d">Ingreso ${esc(visit.entryTime)} · Salida ${esc(visit.exitTime)} · <b>${esc(totalHours(visit.entryTime, visit.exitTime))}</b></div>
    </div>
  </header>

  <section>
    <h2>Cliente</h2>
    <div class="grid">
      ${field('Compañía', visit.client.company, true)}
      ${field('Contacto', visit.client.contact)}
      ${field('Cargo', visit.client.role)}
      ${field('Ciudad', visit.client.city)}
      ${field('Correo', visit.client.email, true)}
      ${field('Celular', visit.client.phone ?? '')}
    </div>
  </section>

  <section>
    <h2>Equipo</h2>
    <div class="grid">
      ${field('Marca / modelo', machine.brandModel)}
      ${field('Serie', machine.serial)}
      ${field('Tecnología', tech?.label ?? machine.technology)}
      ${field('Línea de trabajo', machine.workLine)}
    </div>
  </section>

  <section><h2>Estado inicial</h2><div class="box">${multiline(machine.initialState)}</div></section>
  <section><h2>Trabajos ejecutados</h2><div class="box">${multiline(machine.workDone)}</div></section>
  <section class="keep"><h2>Ajustes finales · ${esc(tech?.label ?? machine.technology)}</h2>${params}</section>
  <section><h2>Observaciones</h2><div class="box">${multiline(machine.observations)}</div></section>
  <section><h2>Piezas usadas</h2>${parts}</section>
  ${photos}

  <section class="keep">
    <h2>Conformidad</h2>
    <p class="cert">${esc(CERTIFICATION)}</p>
    <p class="cert">${esc(HABEAS_DATA)}</p>
    <div class="sigs">
      <div class="sig">
        <div class="img">${sig(signOff?.clientSignature)}</div>
        <div class="who">${esc(signOff?.clientName)}</div>
        <div class="sub">Cliente · Doc. ${esc(signOff?.clientDocument)}</div>
      </div>
      <div class="sig">
        <div class="img">${sig(signOff?.technicianSignature)}</div>
        <div class="who">${esc(visit.technicianName)}</div>
        <div class="sub">Técnico Tecnijet</div>
      </div>
    </div>
    ${others.length ? `<p class="note">Firma única para la visita, aplica también a los reportes: ${others.map(esc).join(', ')}.</p>` : ''}
  </section>

  <footer>
    <div><b>${esc(COMPANY.name)}</b> · ${esc(COMPANY.address)} · ${esc(COMPANY.phones)}</div>
    <div><b>${esc(COMPANY.coordinator)}</b> · <b>${esc(COMPANY.serviceTech)}</b> · ${esc(COMPANY.email)} · ${esc(COMPANY.web)}</div>
  </footer>
</body></html>`;
}
