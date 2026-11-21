/* ── Speaking Exam II · parte 1 de 5 ── */

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

/* ── fin de la parte 1 de 5 ── */
