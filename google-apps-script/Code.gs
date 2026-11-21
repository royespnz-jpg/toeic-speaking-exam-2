/*
 * ── Speaking Exam II · Google Apps Script ──
 *
 * Recibe las grabaciones del examen oral (Questions 7–11, formato TOEIC
 * Speaking) y las guarda en tu Google Drive, con una fila por respuesta en
 * esta planilla para que pongas la nota. Es aparte del primer Speaking Exam:
 * otra planilla y otra carpeta.
 *
 * Instalación (una vez):
 *   1. Creá una planilla nueva (sheets.new) → Extensiones → Apps Script.
 *   2. Borrá lo que haya, pegá todo este archivo (o las partes, en orden) y guardá.
 *   3. Elegí la función «setup» → ▶ Ejecutar → aceptá los permisos.
 *   4. Implementar → Nueva implementación → Aplicación web · Ejecutar como: Yo ·
 *      Quién tiene acceso: Cualquier persona → copiá la URL que termina en /exec.
 *   5. Pasale la URL a quien arma la página (o pegala en …/#teacher y guardá).
 * Si cambiás este código: Implementar → Administrar implementaciones → ✏ →
 * Nueva versión.
 */

const APP = 'Speaking Exam II';
const VERSION = 2;
const ROOT_FOLDER = 'Speaking Exam II — Recordings';
/* The recorded answers: id, label and highest score. Made from js/format.js: npm run gs. */
const ANSWERS = [
  ["q7","Question 7",3],
  ["q8","Question 8",3],
  ["q9","Question 9",3],
];
const QUESTIONS = ANSWERS.map(function (a) { return a[0]; });
const LABELS = {};
const MAX = {};
ANSWERS.forEach(function (a) { LABELS[a[0]] = a[1]; MAX[a[0]] = a[2]; });
const TOTAL = ANSWERS.reduce(function (n, a) { return n + a[2]; }, 0);
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

const SHEETS = {
  exams: {
    name: 'Exams',
    headers: [
      'Started', 'Student', 'Version', 'Status', 'Answers', 'Finished',
      'Left the page', 'Restarts', 'Total (of ' + TOTAL + ')', 'Folder', 'Attempt',
    ],
  },
  responses: {
    name: 'Responses',
    headers: [
      'Recorded', 'Student', 'Version', 'Question', 'Prompt',
      'Seconds', 'Recording', 'Score', 'Out of', 'Comments', 'Attempt',
    ],
  },
  rubric: {
    name: 'Rubric',
    headers: ['Score', 'Questions 7–9 (0–3)', 'Question 10 (0–5)', 'Question 11 (0–5), each topic'],
  },
  exam: {
    name: 'Exam',
    headers: ['Version', 'Item', 'Text'],
  },
};
const EX = { version: 3, status: 4, answers: 5, finished: 6, left: 7, restarts: 8, total: 9, folder: 10, attempt: 11 };
const RE = { label: 4, recording: 7, score: 8, max: 9, attempt: 11 };

/* exam:start */
/* What each version asks, as the page shows it: the «Exam» tab of the sheet.
   Made from js/versions.js: npm run gs. */
const EXAM_ROWS_1 = [
  [1,"Information","Small Business Marketing Workshop"],
  [1,"8:00 a.m.","Check-in"],
  [1,"8:30 a.m.","Opening Talk: Marketing on a Small Budget"],
  [1,"9:45 a.m.","Creating Content for Social Media"],
  [1,"11:00 a.m.","Taking Better Product Photos"],
  [1,"12:15 p.m.","Lunch Break"],
  [1,"1:15 p.m.","Building a Simple Online Store"],
  [1,"2:45 p.m.","Responding to Customer Reviews"],
  [1,"4:00 p.m.","Certificates and Closing"],
  [1,"Location","Harbor View Hotel, Conference Room B"],
  [1,"Date","March 14"],
  [1,"Registration fee","$60 ($45 for students)"],
  [1,"Register by","March 7"],
  [1,"Caller","Hi. A friend told me about the Small Business Marketing Workshop, and I am calling to get some details."],
  [1,"Question 7","What is the date of the workshop, and what time does check-in begin?"],
  [1,"Question 8","I am a university student. How much will I have to pay, and when do I need to register?"],
  [1,"Question 9","I want to learn how to promote my products with social media and photos. Could you tell me about the sessions on those topics?"],
];

/* ✂ */

const EXAM_ROWS_2 = [
  [2,"Information","Public Speaking Seminar"],
  [2,"8:45 a.m.","Sign-in"],
  [2,"9:15 a.m.","Controlling Your Nerves"],
  [2,"10:30 a.m.","Organizing Your Ideas"],
  [2,"11:45 a.m.","Lunch"],
  [2,"12:45 p.m.","Using Your Voice and Body Language"],
  [2,"2:00 p.m.","Designing Clear Slides"],
  [2,"3:15 p.m.","Practice Presentations in Small Groups"],
  [2,"4:45 p.m.","Feedback and Closing"],
  [2,"Location","Lakeside Community Center, Room 12"],
  [2,"Date","June 6"],
  [2,"Seminar fee","$50 ($40 each for groups of three or more)"],
  [2,"Lunch","Not included; there is a café on the first floor"],
  [2,"Caller","Hello. I am calling about the Public Speaking Seminar. I have a few questions before I sign up."],
  [2,"Question 7","Where will the seminar be held, and what time does sign-in begin?"],
  [2,"Question 8","Two of my coworkers want to come with me. How much will each of us pay, and is lunch included?"],
  [2,"Question 9","I get very nervous when I speak in front of people, and I never know how to plan what I am going to say. Which morning sessions would help me with that?"],
];

function examRows_() {
  return [].concat(EXAM_ROWS_1, EXAM_ROWS_2);
}
/* exam:end */

/* The scales of the TOEIC Speaking test: 0–3 for Questions 7–9 and 0–5 for
   Questions 10 and 11. One row per score, one column per kind of question. */
const RUBRIC = [
  [
    '5',
    '—',
    'Shows clearly that the problem is understood and proposes a suitable, well-developed ' +
      'solution, in the role given. Sustained, well organized and easy to understand; good ' +
      'control of grammar and vocabulary.',
    'States a clear opinion and supports it with relevant reasons and examples. Sustained, ' +
      'coherent and easy to understand; good control of grammar and vocabulary.',
  ],
  [
    '4',
    '—',
    'Recognizes the problem and proposes a solution, but with less development or small ' +
      'lapses in organization, grammar or pronunciation. Still easy to follow.',
    'States an opinion and supports it, but with less development or small lapses in ' +
      'organization, grammar or pronunciation. Still easy to follow.',
  ],
  [
    '3',
    'Complete, accurate and appropriate: gives the information the question asks for, taken ' +
      'correctly from the schedule. Easy to understand.',
    'Tries to deal with the problem, but the recognition or the solution is limited or vague. ' +
      'Pauses or errors sometimes make the meaning unclear.',
    'States an opinion, but the support is limited, vague or repetitive. Pauses or errors ' +
      'sometimes make the meaning unclear.',
  ],
  [
    '2',
    'Connected to the question, but incomplete or partly inaccurate; or it takes some effort ' +
      'to understand.',
    'Mentions the problem or a solution only minimally. Limited language; often hard to follow.',
    'Gives an opinion with little or no support. Limited language; often hard to follow.',
  ],
  [
    '1',
    'Does not answer the question effectively: the information is wrong or mostly missing, ' +
      'or it is hard to understand.',
    'Isolated words or phrases; does not deal with the task.',
    'Isolated words or phrases; no clear opinion.',
  ],
  [
    '0',
    'No answer, no English, or an answer that is not connected to the question.',
    'No answer, no English, or an answer that is not connected to the message.',
    'No answer, no English, or an answer that is not connected to the topic.',
  ],
];

/* ✂ */

function setup() {
  return withLock_(function () {
    /* The first row again, in case the exam changed (the total says how many points). */
    Object.keys(SHEETS).forEach(function (k) {
      sheet_(k).getRange(1, 1, 1, SHEETS[k].headers.length).setValues([SHEETS[k].headers]).setFontWeight('bold');
    });
    reference_('rubric', RUBRIC);
    reference_('exam', examRows_());
    rootFolder_();
    const msg = 'Listo: hojas Exams, Responses, Rubric y Exam, y la carpeta «' + ROOT_FOLDER +
      '» en tu Drive. Ahora implementá la aplicación web.';
    Logger.log(msg);
    return msg;
  });
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu(APP).addItem('Configurar (setup)', 'setup').addToUi();
}

function doGet() {
  const name = SpreadsheetApp.getActiveSpreadsheet().getName();
  return json_({ ok: true, app: APP, sheet: name, version: VERSION });
}

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (data.type === 'version') return json_(withLock_(nextVersion_));
    if (data.type === 'start') return json_(withLock_(function () { return start_(data); }));
    if (data.type === 'recording') return json_(recording_(data));
    if (data.type === 'finish') return json_(withLock_(function () { return finish_(data); }));
    throw new Error('Pedido desconocido: ' + String(data.type));
  } catch (err) {
    return json_({ ok: false, error: err.message });
  }
}

/* ─── requests ─── */

function start_(d) {
  const who = person_(d);
  const sheet = sheet_('exams');
  const row = findRow_(sheet, EX.attempt, who.attempt);
  if (row) return { ok: true, duplicate: true };
  const folder = studentFolder_(who);
  sheet.appendRow([
    date_(d.startedAt),
    text_(who.student),
    who.version,
    d.demo ? 'demo' : 'started',
    0,
    '',
    '',
    '',
    '',
    folder.getUrl(),
    who.attempt,
  ]);
  const last = sheet.getLastRow();
  sheet.getRange(last, EX.total).setFormula(
    '=IF(COUNTIFS(Responses!K:K,K' + last + ',Responses!H:H,"<>")=0,"",' +
      'SUMIFS(Responses!H:H,Responses!K:K,K' + last + '))'
  );
  return { ok: true };
}

function finish_(d) {
  const who = person_(d);
  const sheet = sheet_('exams');
  let row = findRow_(sheet, EX.attempt, who.attempt);
  if (!row) {
    start_(d);
    row = sheet.getLastRow();
  }
  sheet.getRange(row, EX.status).setValue('finished');
  sheet.getRange(row, EX.answers).setValue(countResponses_(sheet_('responses'), who.attempt));
  sheet.getRange(row, EX.finished).setValue(date_(d.finishedAt));
  sheet.getRange(row, EX.left).setValue(Number(d.leftPage) || 0);
  sheet.getRange(row, EX.restarts).setValue(Number(d.resumed) || 0);
  return { ok: true };
}

/* The general link: the versions go in turn (1, 2, 1, 2…), so a student never gets
   the same version as the one who started just before. The first one is by chance. */
function nextVersion_() {
  const count = examRows_().reduce(function (n, r) { return Math.max(n, Number(r[0]) || 0); }, 0) || 1;
  const props = PropertiesService.getScriptProperties();
  const last = Number(props.getProperty('LAST_VERSION')) || 0;
  const next = last >= 1 && last <= count ? (last % count) + 1 : 1 + Math.floor(Math.random() * count);
  props.setProperty('LAST_VERSION', String(next));
  return { ok: true, version: next };
}

/* ✂ */

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

/* ✂ */

function findRow_(sheet, col, value) {
  const last = sheet.getLastRow();
  if (last < 2) return 0;
  const values = sheet.getRange(2, col, last - 1, 1).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (String(values[i][0]) === value) return i + 2;
  }
  return 0;
}

/* The recording link of an answer already saved, or ''. */
function findResponse_(sheet, attempt, qid) {
  const last = sheet.getLastRow();
  if (last < 2) return '';
  const label = LABELS[qid];
  const rows = sheet.getRange(2, 1, last - 1, SHEETS.responses.headers.length).getValues();
  const formulas = sheet.getRange(2, RE.recording, last - 1, 1).getFormulas();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][RE.attempt - 1]) === attempt && String(rows[i][RE.label - 1]) === label) {
      const m = String(formulas[i][0]).match(/HYPERLINK\("([^"]+)"/);
      return m ? m[1] : 'saved';
    }
  }
  return '';
}

function countResponses_(sheet, attempt) {
  const last = sheet.getLastRow();
  if (last < 2) return 0;
  return sheet
    .getRange(2, RE.attempt, last - 1, 1)
    .getValues()
    .filter(function (r) { return String(r[0]) === attempt; }).length;
}

/* The exam’s folder. The script remembers which one it is, so a second folder
   with the same name is never made (and the folder can be renamed or moved). */
function rootFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('ROOT_FOLDER_ID');
  if (id) {
    try {
      const kept = DriveApp.getFolderById(id);
      if (!kept.isTrashed()) return kept;
    } catch (err) {
      Logger.log('The exam’s folder is gone: making it again.');
    }
  }
  const it = DriveApp.getFoldersByName(ROOT_FOLDER);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(ROOT_FOLDER);
  props.setProperty('ROOT_FOLDER_ID', folder.getId());
  return folder;
}

function childFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

/* Speaking Exam II — Recordings / <student> · V<version> · <attempt> */
function studentFolder_(who) {
  const name = who.student.replace(/[\\/:*?"<>|]/g, '-');
  const version = who.version ? ' · V' + who.version : '';
  return childFolder_(rootFolder_(), name + version + ' · ' + who.attempt.slice(-6));
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/* Text that looks like a formula is kept as text. */
function text_(s) {
  s = String(s || '');
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function date_(iso) {
  const d = new Date(iso);
  return isNaN(d) ? new Date() : d;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
