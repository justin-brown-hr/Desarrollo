// Tests Code.gs logic with in-memory stand-ins for Google services. Run: node backend/test.js
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const code = fs.readFileSync(require('path').join(__dirname, 'Code.gs'), 'utf8');

function makeEnv() {
  const sheets = {}, store = {}, mails = [], files = [];
  const sheetObj = (name) => {
    const rows = sheets[name];
    return {
      getLastRow: () => rows.length,
      appendRow: (r) => rows.push(r.slice()),
      setFrozenRows() {}, getRange: (r, c, nr, nc) => ({
        setFontWeight() {}, setValues: (vals) => { rows[r - 1] = vals[0].slice(); } }),
      getDataRange: () => ({ getValues: () => rows.map((r) => r.slice()) }),
    };
  };
  const ss = {
    getSheetByName: (n) => (sheets[n] ? sheetObj(n) : null),
    insertSheet: (n) => { sheets[n] = []; return sheetObj(n); },
  };
  let lockHeld = false;
  const ctx = {
    SpreadsheetApp: { getActive: () => ss, flush() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => store[k] ?? null, setProperty: (k, v) => { store[k] = String(v); } }) },
    LockService: { getScriptLock: () => ({ waitLock() { assert(!lockHeld, 'lock re-entered'); lockHeld = true; }, releaseLock() { lockHeld = false; } }) },
    Session: { getActiveUser: () => ({ getEmail: () => 'empresa@tecnijet.com' }) },
    Utilities: { getUuid: () => 'KEY123', base64Decode: (b) => Buffer.from(b, 'base64'), newBlob: (d, t, n) => ({ d, t, n }) },
    DriveApp: { createFolder: () => ({ getId: () => 'F1' }), getFolderById: () => ({ createFile: (b) => { const f = { name: b.n, trashed: false, getUrl: () => 'https://drive/' + b.n, setTrashed(v) { f.trashed = v; } }; files.push(f); return f; } }) },
    MailApp: { sendEmail: (o) => { if (ctx.failMail) throw new Error('Quota'); mails.push(o); } },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ s, setMimeType() { return this; } }) },
    Logger: { log() {} },
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  ctx.setup();
  sheets.Tecnicos.push(['Técnico1', 'Diego Castañeda', 1234, 'SI'], ['ana', 'Ana Ruiz', '5678', 'NO']);
  const post = (body) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ key: 'KEY123', ...body }) } }).s);
  return { ctx, post, sheets, store, mails, files };
}

const { ctx, post, sheets, store, mails, files } = makeEnv();
const pdf = Buffer.from('%PDF').toString('base64');

// auth
assert.equal(JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ key: 'bad', action: 'login' }) } }).s).ok, false);
assert.deepEqual(post({ action: 'login', username: ' TECNICO1 ', pin: '1234' }), { ok: true, data: { id: 'tecnico1', name: 'Diego Castañeda' } });
assert.equal(post({ action: 'login', username: 'Técnico1', pin: '1234' }).ok, true);
assert.equal(post({ action: 'login', username: 'tecnico1', pin: '0000' }).error, 'PIN incorrecto');
assert.equal(post({ action: 'login', username: 'ana', pin: '5678' }).error, 'Usuario inactivo');
assert.equal(post({ action: 'login', username: 'x', pin: '1' }).error, 'Usuario no existe');

// numbering: client's starting number (setup default)
assert.equal(store.NEXT_NUMBER, '10451');
const a = post({ action: 'reserveNumbers', visitId: 'V1', machineIds: ['m1', 'm2'], technician: 'Carlos' });
assert.deepEqual(a.data, { m1: 'TJ-10451', m2: 'TJ-10452' });
// retry is idempotent
assert.deepEqual(post({ action: 'reserveNumbers', visitId: 'V1', machineIds: ['m1', 'm2'] }).data, a.data);
// other tablet gets next numbers
assert.deepEqual(post({ action: 'reserveNumbers', visitId: 'V2', machineIds: ['x1'] }).data, { x1: 'TJ-10453' });
assert.equal(store.NEXT_NUMBER, '10454');

// submit
const submit = (over = {}) => post({ action: 'submitVisit', visitId: 'V1', technician: 'Carlos', date: '2026-10-20',
  client: { company: 'ACME', email: 'cli@acme.com' },
  reports: [{ machineId: 'm1', number: 'TJ-10451', brandModel: 'Videojet', serial: 'S1', technology: 'CIJ', fileName: 'a.pdf', pdf },
            { machineId: 'm2', number: 'TJ-10452', brandModel: 'Linx', serial: 'S2', technology: 'CIJ', fileName: 'b.pdf', pdf }], ...over });

// mail failure -> error, PDFs trashed, nothing marked sent
ctx.failMail = true;
assert.equal(submit().error, 'Quota');
assert(files.every((f) => f.trashed));
ctx.failMail = false;

assert.deepEqual(submit(), { ok: true, data: { alreadySent: false } });
assert.equal(mails.length, 1);
assert.equal(mails[0].to, 'cli@acme.com'); assert.equal(mails[0].cc, 'empresa@tecnijet.com');
assert.equal(mails[0].attachments.length, 2);
assert.match(mails[0].subject, /TJ-10451, TJ-10452 – ACME/);
const rows = sheets.Reportes.filter((r) => r[12] === 'V1');
assert(rows.every((r) => r[1] === 'Enviado' && r[9].startsWith('https://drive/')));
// resubmit does not email again
assert.deepEqual(submit(), { ok: true, data: { alreadySent: true } });
assert.equal(mails.length, 1);
// tampered number rejected
assert.match(post({ action: 'submitVisit', visitId: 'V2', client: { company: 'X', email: 'x@x.co' }, reports: [{ machineId: 'x1', number: 'TJ-000001', pdf }] }).error, /no coincide/);
// html escaping in email
post({ action: 'reserveNumbers', visitId: 'V3', machineIds: ['z'] });
post({ action: 'submitVisit', visitId: 'V3', technician: '<b>', date: 'd', client: { company: '<script>', email: 'e@e.co' }, reports: [{ machineId: 'z', number: 'TJ-10454', brandModel: '<i>', serial: 's', technology: 'CIJ', fileName: 'z.pdf', pdf }] });
assert(!mails[1].htmlBody.includes('<script>') && !mails[1].htmlBody.includes('<i>'));
console.log('ALL BACKEND TESTS PASSED');
