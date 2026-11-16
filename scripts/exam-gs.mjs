#!/usr/bin/env node
// Copies the exam into Code.gs, so the teacher's script and sheet always match
// the page: the recorded answers with their highest scores (ANSWERS, from
// js/format.js) and what each version asks (the «Exam» tab, from
// js/versions.js). Then split the script again:
//
//   node scripts/exam-gs.mjs && node scripts/split-gs.mjs   (npm run gs)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RESPONSES, PARTS } from '../js/format.js';
import { VERSIONS } from '../js/versions.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'google-apps-script', 'Code.gs');

// id, label and highest score of each recorded answer.
export const answerRows = () => RESPONSES.map((r) => [r.id, r.label, r.max]);
export const answersBlock = () => `const ANSWERS = [\n${answerRows().map((row) => `  ${JSON.stringify(row)},`).join('\n')}\n];`;
export const ANSWERS_RE = /const ANSWERS = \[\n[\s\S]*?\];/;

// What a version asks, one row per item: version, item, text.
export function versionRows(v) {
  return [
    [v.n, 'Information', v.info.title],
    ...v.info.rows.map(([time, what]) => [v.n, time, what]),
    ...v.info.details.map(([k, text]) => [v.n, k, text]),
    [v.n, 'Caller', v.info.narrator],
    ...v.info.questions.map((q, i) => [v.n, `Question ${7 + i}`, q]),
    [v.n, 'Question 10 · Role', `${v.solution.role} In your response, be sure to ${PARTS.solution.mustDo.join(' ')}`],
    [v.n, 'Question 10 · Message', v.solution.message],
    ...v.opinion.map((t, i) => [v.n, `Question 11 · Topic ${i + 1}`, t]),
  ];
}

export const examRows = () => VERSIONS.flatMap(versionRows);

// Each version goes in its own part of the script, so every part stays short enough to paste.
export function examBlock() {
  const blocks = VERSIONS.map((v) => `const EXAM_ROWS_${v.n} = [\n${versionRows(v).map((row) => `  ${JSON.stringify(row)},`).join('\n')}\n];`);
  return [
    '/* exam:start */',
    '/* What each version asks, as the page shows it: the «Exam» tab of the sheet.',
    '   Made from js/versions.js: npm run gs. */',
    blocks.join('\n\n/* ✂ */\n\n'),
    '',
    `function examRows_() {\n  return [].concat(${VERSIONS.map((v) => `EXAM_ROWS_${v.n}`).join(', ')});\n}`,
    '/* exam:end */',
  ].join('\n');
}

export const EXAM_RE = /\/\* exam:start \*\/[\s\S]*?\/\* exam:end \*\//;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const code = readFileSync(SRC, 'utf8');
  if (!EXAM_RE.test(code)) throw new Error('the exam block (exam:start … exam:end) is not in Code.gs');
  if (!ANSWERS_RE.test(code)) throw new Error('ANSWERS not found in Code.gs');
  // A function as the replacement: the text has "$" (prices), which replace() would read as a pattern.
  writeFileSync(SRC, code.replace(EXAM_RE, () => examBlock()).replace(ANSWERS_RE, () => answersBlock()));
  console.log(`Code.gs: ${answerRows().length} answers, ${VERSIONS.length} versions, ${examRows().length} rows for the «Exam» tab`);
}
