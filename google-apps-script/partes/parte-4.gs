/* ── Speaking Exam II · parte 4 de 5 ── */

function recording_(d) {
  const who = person_(d);
  if (QUESTIONS.indexOf(d.qid) < 0) throw new Error('Pregunta desconocida.');
  const mime = String(d.mime || '').split(';')[0];
  if (mime.indexOf('audio/') !== 0) throw new Error('Eso no es un audio.');
  if (!d.audio) throw new Error('No llegó el audio.');
  const bytes = Utilities.base64Decode(d.audio);
  if (bytes.length > MAX_AUDIO_BYTES) throw new Error('La grabación es demasiado grande.');

  /* The same answer sent again (the first one did arrive) gets the same file back. */
  const sheet = sheet_('responses');
  const existing = findResponse_(sheet, who.attempt, d.qid);
  if (existing) return { ok: true, duplicate: true, url: existing };

  const ext = /mp4|m4a|aac/.test(d.mime) ? 'm4a' : /ogg/.test(d.mime) ? 'ogg' : 'webm';
  const label = LABELS[d.qid];
  const blob = Utilities.newBlob(bytes, mime, label + '.' + ext);
  const file = studentFolder_(who).createFile(blob);
  file.setDescription(String(d.prompt || '').slice(0, 1000));
  const url = file.getUrl();

  withLock_(function () {
    if (findResponse_(sheet, who.attempt, d.qid)) return;
    sheet.appendRow([
      date_(d.recordedAt),
      text_(who.student),
      who.version,
      label,
      text_(String(d.prompt || '').slice(0, 2000)),
      Math.round(Number(d.durationSec) || 0),
      '',
      '',
      MAX[d.qid],
      '',
      who.attempt,
    ]);
    const last = sheet.getLastRow();
    sheet.getRange(last, RE.recording).setFormula('=HYPERLINK("' + url + '","▶ Listen")');
    scoreRule_(sheet.getRange(last, RE.score), MAX[d.qid]);
    const exams = sheet_('exams');
    const row = findRow_(exams, EX.attempt, who.attempt);
    if (row) exams.getRange(row, EX.answers).setValue(countResponses_(sheet, who.attempt));
  });
  return { ok: true, url: url, id: file.getId() };
}

/* ─── helpers ─── */

function person_(d) {
  const attempt = String(d.attempt || '');
  if (!/^[\w-]{6,40}$/.test(attempt)) throw new Error('Intento inválido.');
  const student = String(d.student || '').trim().slice(0, 80);
  if (!student) throw new Error('Falta el nombre.');
  const v = Math.floor(Number(d.version));
  return { attempt: attempt, student: student, version: v >= 1 && v <= 99 ? v : '' };
}

/* The score cell only takes a number from 0 to the highest score of its
   question. If the rule can’t be set, the answer is saved all the same. */
function scoreRule_(range, max) {
  try {
    range.setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireNumberBetween(0, max)
        .setAllowInvalid(false)
        .setHelpText('A number from 0 to ' + max + '.')
        .build()
    );
  } catch (err) {
    Logger.log('Score rule: ' + err.message);
  }
}

/* The Rubric and Exam tabs are rewritten each time setup runs. */
function reference_(key, rows) {
  const sheet = sheet_(key);
  const headers = SHEETS[key].headers;
  if (sheet.getLastRow() > 0) {
    sheet.getRange(1, 1, sheet.getLastRow(), Math.max(sheet.getLastColumn(), headers.length)).clearContent();
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function sheet_(key) {
  const def = SHEETS[key];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(def.name);
  if (!sheet) {
    sheet = ss.insertSheet(def.name);
    sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/* ── fin de la parte 4 de 5 ── */
