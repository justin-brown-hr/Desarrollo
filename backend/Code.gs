/**
 * Tecnijet – backend for the work-report app (Google Apps Script, bound to a Google Sheet).
 *
 * Sheet "Tecnicos": technicians who can log in (add a row = new technician, no code change).
 * Sheet "Reportes": one row per machine report; the consecutive number is reserved here.
 * Script properties: API_KEY, COMPANY_EMAIL, NEXT_NUMBER, PREFIX, PAD, FOLDER_ID (created by setup()).
 *
 * See README.md for installation.
 */

var SHEET_TECHS = 'Tecnicos';
var SHEET_REPORTS = 'Reportes';
var TECH_HEADERS = ['Usuario', 'Nombre', 'PIN', 'Activo'];
var REPORT_HEADERS = [
  'Numero', 'Estado', 'Fecha visita', 'Cliente', 'Correo cliente', 'Equipo', 'Serie',
  'Tecnologia', 'Tecnico', 'PDF', 'Reservado', 'Enviado', 'Visita ID', 'Maquina ID',
];
var COL = {}; // header name -> 0-based index
REPORT_HEADERS.forEach(function (h, i) { COL[h] = i; });

var props = PropertiesService.getScriptProperties();

/** Run once from the editor: creates sheets, PDF folder and default settings. */
function setup() {
  var ss = SpreadsheetApp.getActive();
  ensureSheet_(ss, SHEET_TECHS, TECH_HEADERS);
  ensureSheet_(ss, SHEET_REPORTS, REPORT_HEADERS);

  // Tecnijet continues from TJ-10451 (client, 2026-10-20).
  var defaults = { NEXT_NUMBER: '10451', PREFIX: 'TJ-', PAD: '5', COMPANY_EMAIL: Session.getActiveUser().getEmail() };
  Object.keys(defaults).forEach(function (k) {
    if (!props.getProperty(k)) props.setProperty(k, defaults[k]);
  });
  if (!props.getProperty('API_KEY')) props.setProperty('API_KEY', Utilities.getUuid());
  if (!props.getProperty('FOLDER_ID')) {
    props.setProperty('FOLDER_ID', DriveApp.createFolder('Tecnijet - Reportes PDF').getId());
  }

  Logger.log('API_KEY: %s', props.getProperty('API_KEY'));
  Logger.log('Siguiente número: %s%s', props.getProperty('PREFIX'), props.getProperty('NEXT_NUMBER'));
  Logger.log('Correo empresa: %s', props.getProperty('COMPANY_EMAIL'));
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

function doGet() {
  return ContentService.createTextOutput('Tecnijet API OK');
}

function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    if (!req.key || req.key !== props.getProperty('API_KEY')) return json_({ ok: false, error: 'Clave de API inválida' });
    switch (req.action) {
      case 'login': return json_({ ok: true, data: login_(req) });
      case 'reserveNumbers': return json_({ ok: true, data: reserveNumbers_(req) });
      case 'submitVisit': return json_({ ok: true, data: submitVisit_(req) });
      default: return json_({ ok: false, error: 'Acción desconocida' });
    }
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** "Técnico1", "tecnico1" and " TECNICO1 " are the same user. */
function normUser_(s) {
  return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function login_(req) {
  var username = normUser_(req.username);
  var rows = SpreadsheetApp.getActive().getSheetByName(SHEET_TECHS).getDataRange().getValues().slice(1);
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (normUser_(r[0]) !== username) continue;
    var active = r[3] === true || /^(si|sí|true|x|1)$/i.test(String(r[3]).trim());
    if (!active) throw new Error('Usuario inactivo');
    if (String(r[2]).trim() !== String(req.pin)) throw new Error('PIN incorrecto');
    return { id: username, name: String(r[1]).trim() || username };
  }
  throw new Error('Usuario no existe');
}

/**
 * Assigns consecutive numbers to the machines of a visit. Idempotent: calling again for the
 * same visit returns the numbers already assigned, so retries after a dropped connection never
 * consume new numbers. The script lock prevents duplicates between tablets.
 */
function reserveNumbers_(req) {
  if (!req.visitId || !req.machineIds || !req.machineIds.length) throw new Error('Datos incompletos');
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_REPORTS);
    var existing = rowsForVisit_(sheet, req.visitId);
    var result = {};
    existing.forEach(function (x) { result[x.row[COL['Maquina ID']]] = x.row[COL['Numero']]; });

    var next = Number(props.getProperty('NEXT_NUMBER'));
    var prefix = props.getProperty('PREFIX');
    var pad = Number(props.getProperty('PAD'));
    req.machineIds.forEach(function (machineId) {
      if (result[machineId]) return;
      var number = prefix + String(next).padStart(pad, '0');
      next++;
      var row = REPORT_HEADERS.map(function () { return ''; });
      row[COL['Numero']] = number;
      row[COL['Estado']] = 'Reservado';
      row[COL['Tecnico']] = req.technician || '';
      row[COL['Reservado']] = new Date();
      row[COL['Visita ID']] = req.visitId;
      row[COL['Maquina ID']] = machineId;
      sheet.appendRow(row);
      result[machineId] = number;
    });
    props.setProperty('NEXT_NUMBER', String(next));
    SpreadsheetApp.flush();
    return result;
  } finally {
    lock.releaseLock();
  }
}

function rowsForVisit_(sheet, visitId) {
  var values = sheet.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < values.length; i++) {
    if (values[i][COL['Visita ID']] === visitId) out.push({ index: i + 1, row: values[i] });
  }
  return out;
}

/**
 * Stores the PDFs in Drive, emails them to client + company and marks the rows as sent.
 * Idempotent: a visit already sent is not emailed twice.
 */
function submitVisit_(req) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var created = [];
  try {
    var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_REPORTS);
    var rows = rowsForVisit_(sheet, req.visitId);
    if (!rows.length) throw new Error('Visita sin números reservados');
    if (rows.every(function (x) { return x.row[COL['Estado']] === 'Enviado'; })) return { alreadySent: true };

    var byMachine = {};
    rows.forEach(function (x) { byMachine[x.row[COL['Maquina ID']]] = x; });
    req.reports.forEach(function (r) {
      var reserved = byMachine[r.machineId];
      if (!reserved || reserved.row[COL['Numero']] !== r.number) throw new Error('Número no coincide: ' + r.number);
    });

    var folder = DriveApp.getFolderById(props.getProperty('FOLDER_ID'));
    var blobs = req.reports.map(function (r) {
      var blob = Utilities.newBlob(Utilities.base64Decode(r.pdf), 'application/pdf', r.fileName);
      var file = folder.createFile(blob);
      created.push(file);
      r.url = file.getUrl();
      return blob;
    });

    var companyEmail = props.getProperty('COMPANY_EMAIL');
    var numbers = req.reports.map(function (r) { return r.number; }).join(', ');
    MailApp.sendEmail({
      to: req.client.email,
      cc: companyEmail,
      replyTo: companyEmail,
      name: 'Tecnijet',
      subject: 'Reporte de servicio ' + numbers + ' – ' + req.client.company,
      htmlBody: emailBody_(req),
      attachments: blobs,
    });

    var now = new Date();
    req.reports.forEach(function (r) {
      var x = byMachine[r.machineId];
      var row = x.row.slice();
      row[COL['Estado']] = 'Enviado';
      row[COL['Fecha visita']] = req.date;
      row[COL['Cliente']] = req.client.company;
      row[COL['Correo cliente']] = req.client.email;
      row[COL['Equipo']] = r.brandModel;
      row[COL['Serie']] = r.serial;
      row[COL['Tecnologia']] = r.technology;
      row[COL['Tecnico']] = req.technician;
      row[COL['PDF']] = r.url;
      row[COL['Enviado']] = now;
      sheet.getRange(x.index, 1, 1, row.length).setValues([row]);
    });
    SpreadsheetApp.flush();
    return { alreadySent: false };
  } catch (err) {
    // Don't leave orphan PDFs in Drive if the email failed; the app will retry.
    created.forEach(function (f) { f.setTrashed(true); });
    throw err;
  } finally {
    lock.releaseLock();
  }
}

function emailBody_(req) {
  var esc = function (s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  var items = req.reports.map(function (r) {
    return '<li><b>' + esc(r.number) + '</b> – ' + esc(r.brandModel) + ' · Serie ' + esc(r.serial) + '</li>';
  }).join('');
  return '<p>Estimado cliente,</p>' +
    '<p>Adjuntamos los reportes de trabajo de la visita realizada el ' + esc(req.date) +
    ' por nuestro técnico ' + esc(req.technician) + ' en ' + esc(req.client.company) + ':</p>' +
    '<ul>' + items + '</ul>' +
    '<p>Gracias por confiar en Tecnijet.</p>' +
    '<p style="color:#6b6b6b;font-size:12px">Tecnijet CA SAS · info@tecnijet.com · www.tecnijet.com</p>';
}
