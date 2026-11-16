import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PARTS, RESPONSES, INTRO, INFO, SOLUTION, OPINION, TOTAL_POINTS, buildTimeline, timedSeconds, responseOf, solutionSpoken } from '../js/format.js';
import { VERSIONS, versionOf, pickVersion, infoText } from '../js/versions.js';
import { fmt } from '../js/clock.js';

const repeated = (list) => list.filter((x, i) => list.indexOf(x) !== i);
const words = (s) => s.match(/[A-Za-z’'-]+/g) || [];
// A clock time as minutes after midnight: "12:15 p.m." → 735.
const minutes = (t) => {
  const [, h, m, half] = t.match(/^(\d{1,2}):(\d{2}) (a|p)\.m\.$/);
  return ((Number(h) % 12) + (half === 'p' ? 12 : 0)) * 60 + Number(m);
};

test('the clocks of Questions 7–11: 30 s to read, 15-15-30, 30 + 60, and three topics of 15 + 60', () => {
  assert.deepEqual(INFO, { read: 30, responses: [15, 15, 30] });
  assert.deepEqual(SOLUTION, { prep: 30, response: 60 });
  assert.deepEqual(OPINION, { prep: 15, response: 60, topics: 3 });
  for (const v of VERSIONS) {
    const steps = buildTimeline(v);
    assert.deepEqual(
      steps.filter((s) => s.seconds).map((s) => `${s.type}:${s.id || s.part}:${s.seconds}`),
      [
        'prep:info:30', 'response:q7:15', 'response:q8:15', 'response:q9:30',
        'prep:solution:30', 'response:q10:60',
        'prep:opinion:15', 'response:q11a:60', 'prep:opinion:15', 'response:q11b:60', 'prep:opinion:15', 'response:q11c:60',
      ],
      `version ${v.n}`,
    );
    assert.equal(timedSeconds(steps), 405);
    assert.deepEqual(steps.filter((s) => s.type === 'response').map((s) => s.id), RESPONSES.map((r) => r.id));
  }
});

test('the directions say the same clocks', () => {
  assert.match(PARTS.info.directions, /You will have 30 seconds to read the information before the questions begin\./);
  assert.match(PARTS.info.directions, /You will have 15 seconds to respond to Questions 7 and 8 and 30 seconds to respond to Question 9\.$/);
  assert.match(PARTS.solution.directions, /You will have 30 seconds to prepare\. Then you will have 60 seconds to speak\.$/);
  assert.match(PARTS.opinion.directions, /For each topic, you will have 15 seconds to prepare and 60 seconds to speak\./);
  assert.equal(PARTS.info.time, '30 s to read · 15 s, 15 s and 30 s to speak');
  assert.match(INTRO, /^This is the Speaking test\. It has three parts\./);
});

test('seven recorded answers: 0–3 for Questions 7–9, 0–5 for Questions 10 and 11', () => {
  assert.deepEqual(RESPONSES.map((r) => [r.id, r.label, r.max]), [
    ['q7', 'Question 7', 3],
    ['q8', 'Question 8', 3],
    ['q9', 'Question 9', 3],
    ['q10', 'Question 10', 5],
    ['q11a', 'Question 11 · Topic 1', 5],
    ['q11b', 'Question 11 · Topic 2', 5],
    ['q11c', 'Question 11 · Topic 3', 5],
  ]);
  assert.equal(TOTAL_POINTS, 29);
  // The script takes these ids as they are (letters, digits, - and _).
  for (const r of RESPONSES) assert.match(r.id, /^[\w-]+$/);
});

test('Questions 7–9: the directions, the reading clock, the caller, then each question and its answer', () => {
  const v = VERSIONS[0];
  const steps = buildTimeline(v);
  assert.equal(steps[0].type, 'intro');
  const at = steps.findIndex((s) => s.type === 'part' && s.part === 'info');
  assert.match(steps[at].say, /^Questions 7–9\. Respond to questions using information provided\. In this part of the test/);
  assert.deepEqual(
    steps.slice(at + 1, at + 9).map((s) => [s.type, s.question || (s.narrator ? 'caller' : '')]),
    [['prep', ''], ['say', 'caller'], ['say', 7], ['response', 7], ['say', 8], ['response', 8], ['say', 9], ['response', 9]],
  );
  assert.equal(steps[at + 1].say, 'Begin reading now.');
  assert.equal(steps[at + 1].phase, 'Reading time');
  assert.equal(steps[at + 2].say, v.info.narrator);
  assert.equal(steps[at + 3].say, `Question 7. ${v.info.questions[0]}`);
  // "Begin responding immediately after you hear a beep": nothing is said before the answer.
  assert.equal(steps[at + 4].say, undefined);
  assert.equal(steps[at + 4].prompt, v.info.questions[0]);
});

test('Question 10: the role and the message are heard before the time to prepare', () => {
  const v = VERSIONS[1];
  const steps = buildTimeline(v);
  const at = steps.findIndex((s) => s.type === 'part' && s.part === 'solution');
  assert.match(steps[at].say, /^Question 10\. Propose a solution\. In this part of the test/);
  assert.ok(steps[at].say.endsWith(solutionSpoken(v.solution)));
  assert.match(
    solutionSpoken(v.solution),
    /^Respond as if you are the manager of a restaurant\. In your response, be sure to show that you recognize the problem, and propose a way of dealing with the problem\. Now listen to the message\.$/,
  );
  assert.deepEqual(steps.slice(at + 1, at + 4).map((s) => [s.type, s.say]), [
    ['say', v.solution.message],
    ['prep', 'Begin preparing now.'],
    ['response', 'Begin speaking now.'],
  ]);
  assert.equal(steps[at + 3].prompt, `${v.solution.role} ${v.solution.message}`);
});

test('Question 11: each topic is heard, prepared and answered before the next one', () => {
  const v = VERSIONS[0];
  const steps = buildTimeline(v);
  const at = steps.findIndex((s) => s.type === 'part' && s.part === 'opinion');
  assert.deepEqual(
    steps.slice(at + 1).map((s) => `${s.type}:${s.topic}`),
    ['say:1', 'prep:1', 'response:1', 'say:2', 'prep:2', 'response:2', 'say:3', 'prep:3', 'response:3'],
  );
  assert.equal(steps[at + 1].say, `Topic 1. ${v.opinion[0]}`);
  assert.equal(steps.at(-1).prompt, v.opinion[2]);
  assert.equal(steps.at(-1).id, 'q11c');
});

test('every step knows the answer it belongs to', () => {
  const steps = buildTimeline(VERSIONS[0]);
  assert.equal(responseOf(steps[0]), null);
  assert.equal(responseOf(steps.find((s) => s.type === 'part' && s.part === 'info')), null);
  assert.equal(responseOf(steps.find((s) => s.type === 'say' && s.question === 8)), 'q8');
  assert.equal(responseOf(steps.find((s) => s.type === 'part' && s.part === 'solution')), 'q10');
  assert.equal(responseOf(steps.find((s) => s.type === 'prep' && s.topic === 2)), 'q11b');
  for (const s of steps.filter((x) => x.type === 'response')) assert.equal(responseOf(s), s.id);
});

test('the quick demo shortens every clock but keeps at least 3 seconds', () => {
  assert.deepEqual(buildTimeline(VERSIONS[0], { scale: 0.1 }).filter((s) => s.seconds).map((s) => s.seconds), [3, 3, 3, 3, 3, 6, 3, 6, 3, 6, 3, 6]);
  assert.ok(buildTimeline(VERSIONS[0], { scale: 0.01 }).filter((s) => s.seconds).every((s) => s.seconds === 3));
});

test('every version has what the format needs', () => {
  assert.ok(VERSIONS.length >= 2);
  assert.deepEqual(VERSIONS.map((v) => v.n), VERSIONS.map((_, i) => i + 1));
  for (const v of VERSIONS) {
    const where = `version ${v.n}`;
    // A schedule of eight rows in the order of the day, and four details.
    assert.deepEqual(v.info.columns, ['Time', 'Activity'], where);
    assert.equal(v.info.rows.length, 8, where);
    const times = v.info.rows.map(([t]) => minutes(t));
    assert.deepEqual(times, [...times].sort((a, b) => a - b), `${where}: the times go forward`);
    assert.deepEqual(repeated(times), [], where);
    assert.equal(v.info.details.length, 4, where);
    assert.ok(v.info.narrator.includes(v.info.title), `${where}: the caller names the event`);
    // Three questions (7, 8, 9) and three topics (11), all of them questions.
    assert.equal(v.info.questions.length, 3, where);
    assert.equal(v.opinion.length, OPINION.topics, where);
    for (const q of [...v.info.questions, ...v.opinion]) assert.match(q, /\?$/, q);
    for (const t of v.opinion) assert.match(t, /^Some people (believe|prefer)/, t);
    // The message: someone who gives a name, has a problem and asks for a call back.
    assert.match(v.solution.role, /^Respond as if you (work|are) .+\.$/, where);
    assert.match(v.solution.message, /^(Hi|Hello), this is [A-Z][a-z]+ [A-Z][a-z]+\. /, where);
    assert.match(v.solution.message, /Please call me back/, where);
    const n = words(v.solution.message).length;
    assert.ok(n >= 65 && n <= 85, `${where}: the message has ${n} words`);
  }
});

test('the versions are different exams of the same difficulty', () => {
  const all = (pick) => VERSIONS.flatMap(pick);
  assert.deepEqual(repeated(all((v) => [v.info.title])), []);
  assert.deepEqual(repeated(all((v) => v.info.questions)), []);
  assert.deepEqual(repeated(all((v) => v.opinion)), []);
  assert.deepEqual(repeated(all((v) => [v.solution.role])), []);
  assert.deepEqual(repeated(all((v) => v.info.rows.map(([, what]) => what)).filter((w) => !/^Lunch/.test(w))), []);
  // The messages are about the same length, and so are the questions.
  const lengths = VERSIONS.map((v) => words(v.solution.message).length);
  assert.ok(Math.max(...lengths) - Math.min(...lengths) <= 8, lengths.join(', '));
});

test('nothing comes from the practice sheet the students already did (Practices A and B)', () => {
  const text = JSON.stringify(VERSIONS).toLowerCase();
  for (const taken of [
    'career development', 'health and wellness', 'riverside business center', 'grandview conference center',
    'daniel ruiz', 'melissa chen', 'bright future', 'bookstore', 'textbook', 'projector', 'event-planning',
    'community service', 'online courses', 'flexible work', 'close to their workplace', 'work from home', 'public transportation',
    'august 18', 'september 12',
  ]) {
    assert.ok(!text.includes(taken), `“${taken}” is in the practice sheet`);
  }
});

test('the version a student gets: the one the link names, or one by chance', () => {
  assert.equal(pickVersion('2'), 2);
  assert.equal(pickVersion(1), 1);
  assert.equal(versionOf('2').info.title, 'Public Speaking Seminar');
  assert.equal(versionOf(9), null);
  // No version in the link, or one that isn't in the exam: by chance.
  assert.equal(pickVersion(null, () => 0), 1);
  assert.equal(pickVersion('9', () => 0.99), VERSIONS.length);
  assert.equal(pickVersion('', () => 1), VERSIONS.length);
  const got = new Set(Array.from({ length: 200 }, (_, i) => pickVersion(null, () => (i % 20) / 20)));
  assert.deepEqual([...got].sort(), VERSIONS.map((v) => v.n));
});

test('the schedule as one line, for the teacher’s sheet', () => {
  const line = infoText(VERSIONS[0].info);
  assert.match(line, /^Small Business Marketing Workshop — 8:00 a\.m\. Check-in · 8:30 a\.m\. /);
  assert.match(line, / — Location: Harbor View Hotel, Conference Room B · Date: March 14 · /);
});

test('the clock shows mm:ss and rounds up', () => {
  assert.equal(fmt(60), '01:00');
  assert.equal(fmt(44.2), '00:45');
  assert.equal(fmt(0.01), '00:01');
  assert.equal(fmt(-1), '00:00');
});
