// The exam's format: Questions 7–11 of the former TOEIC® Speaking test, with
// the clocks of the teacher's practice sheet. What each version asks is in
// versions.js; this file says how every version runs.
//
//   Questions 7–9   30 s to read the information; 15 s, 15 s and 30 s to answer
//   Question 10     30 s to prepare, 60 s to speak
//   Question 11     three topics; each one 15 s to prepare, 60 s to speak
//
// Change a clock here and the directions the students hear and read change
// with it.

const secs = (s) => `${s} seconds`;

export const INFO = { read: 30, responses: [15, 15, 30] };
export const SOLUTION = { prep: 30, response: 60 };
export const OPINION = { prep: 15, response: 60, topics: 3 };

const [SHORT, , LONG] = INFO.responses;

export const PARTS = {
  info: {
    label: 'Questions 7–9',
    title: 'Respond to questions using information provided',
    directions:
      'In this part of the test, you will answer three questions based on the information provided. ' +
      `You will have ${secs(INFO.read)} to read the information before the questions begin. ` +
      'When the reading time is over, the information disappears from the screen. ' +
      'For each question, begin responding immediately after you hear a beep. No additional preparation time is provided. ' +
      `You will have ${secs(SHORT)} to respond to Questions 7 and 8 and ${secs(LONG)} to respond to Question 9.`,
    time: `${INFO.read} s to read · ${INFO.responses.join(' s, ').replace(/, (\d+)$/, ' and $1')} s to speak`,
  },
  solution: {
    label: 'Question 10',
    title: 'Propose a solution',
    directions:
      'In this part of the test, you will be presented with a problem and asked to propose a solution. ' +
      `You will have ${secs(SOLUTION.prep)} to prepare. Then you will have ${secs(SOLUTION.response)} to speak.`,
    // What the answer has to do: on the screen, and spoken after the directions.
    mustDo: ['show that you recognize the problem, and', 'propose a way of dealing with the problem.'],
    time: `${SOLUTION.prep} s to prepare · ${SOLUTION.response} s to speak`,
  },
  opinion: {
    label: 'Question 11',
    title: 'Express an opinion',
    directions:
      'In this part of the test, you will give your opinion about three topics. ' +
      `For each topic, you will have ${secs(OPINION.prep)} to prepare and ${secs(OPINION.response)} to speak. ` +
      'Give reasons and examples to support each response.',
    time: `three topics · ${OPINION.prep} s to prepare · ${OPINION.response} s to speak each`,
  },
};

export const INTRO =
  'This is the Speaking test. It has three parts. In Questions 7 to 9, you will answer three questions using the information on your screen. ' +
  'In Question 10, you will propose a solution to a problem. In Question 11, you will give your opinion about three topics. ' +
  'The test runs by itself: the clock shows how much time you have to prepare and to speak. ' +
  'Your microphone turns on when it is time to speak and turns off when the time is up. You cannot pause or go back.';

// The recorded answers, in order, and the highest score of each (the scales
// of the TOEIC Speaking test: 0–3 for Questions 7–9, 0–5 for Questions 10 and 11).
const LETTERS = 'abcdefgh';
export const RESPONSES = [
  ...INFO.responses.map((_, i) => ({ id: `q${7 + i}`, part: 'info', label: `Question ${7 + i}`, short: String(7 + i), max: 3 })),
  { id: 'q10', part: 'solution', label: 'Question 10', short: '10', max: 5 },
  ...Array.from({ length: OPINION.topics }, (_, i) => ({
    id: `q11${LETTERS[i]}`,
    part: 'opinion',
    label: `Question 11 · Topic ${i + 1}`,
    short: `11·${i + 1}`,
    max: 5,
  })),
];

export const TOTAL_POINTS = RESPONSES.reduce((n, r) => n + r.max, 0);

// What the student hears after the directions of Question 10.
export const solutionSpoken = (solution) =>
  `${solution.role} In your response, be sure to ${PARTS.solution.mustDo.join(' ')} Now listen to the message.`;

// Every step of the exam, in order. `scale` shortens the clocks (quick tests of the page).
//   intro     – general directions, spoken
//   part      – a part's directions, spoken
//   say       – the caller's opening line, a question, the voice message or a topic: spoken and shown
//   prep      – time on the clock to read the information or to prepare
//   response  – the microphone records for `seconds`
export function buildTimeline(version, { scale = 1 } = {}) {
  const t = (s) => Math.max(3, Math.round(s * scale));
  const head = (id) => `${PARTS[id].label}. ${PARTS[id].title}. ${PARTS[id].directions}`;
  const steps = [{ type: 'intro', say: INTRO }];

  // Questions 7–9: the information appears when its reading clock starts and stays to the end of the part.
  steps.push({ type: 'part', part: 'info', say: head('info') });
  steps.push({ type: 'prep', part: 'info', seconds: t(INFO.read), say: 'Begin reading now.', phase: 'Reading time', sub: 'Read', cue: 'Read the information.' });
  steps.push({ type: 'say', part: 'info', narrator: true, say: version.info.narrator });
  version.info.questions.forEach((q, i) => {
    const n = 7 + i;
    steps.push({ type: 'say', part: 'info', question: n, say: `Question ${n}. ${q}` });
    steps.push({ type: 'response', part: 'info', question: n, id: `q${n}`, seconds: t(INFO.responses[i]), prompt: q });
  });

  // Question 10: the directions, the voice message, time to prepare, the answer.
  steps.push({ type: 'part', part: 'solution', say: `${head('solution')} ${solutionSpoken(version.solution)}` });
  steps.push({ type: 'say', part: 'solution', message: true, say: version.solution.message });
  steps.push({ type: 'prep', part: 'solution', message: true, seconds: t(SOLUTION.prep), say: 'Begin preparing now.' });
  steps.push({
    type: 'response',
    part: 'solution',
    message: true,
    id: 'q10',
    seconds: t(SOLUTION.response),
    say: 'Begin speaking now.',
    prompt: `${version.solution.role} ${version.solution.message}`,
  });

  // Question 11: for each topic, the topic, time to prepare, the answer.
  steps.push({ type: 'part', part: 'opinion', say: head('opinion') });
  version.opinion.slice(0, OPINION.topics).forEach((topic, i) => {
    const at = { part: 'opinion', topic: i + 1 };
    steps.push({ type: 'say', ...at, say: `Topic ${i + 1}. ${topic}` });
    steps.push({ type: 'prep', ...at, seconds: t(OPINION.prep), say: 'Begin preparing now.' });
    steps.push({ type: 'response', ...at, id: `q11${LETTERS[i]}`, seconds: t(OPINION.response), say: 'Begin speaking now.', prompt: topic });
  });
  return steps;
}

// How long the exam takes, in seconds, not counting the spoken directions.
export function timedSeconds(steps) {
  return steps.reduce((n, s) => n + (s.seconds || 0), 0);
}

// The recorded answer a step belongs to (the one being asked, prepared or recorded), or null.
export function responseOf(step) {
  if (step.id) return step.id;
  if (step.question) return `q${step.question}`;
  if (step.topic) return `q11${LETTERS[step.topic - 1]}`;
  if (step.part === 'solution') return 'q10';
  return null;
}

// After a reload: start again from the question that was interrupted. The
// information of Questions 7–9 is shown only once: a student who had already
// gone past its reading time doesn't get to read it again by reloading.
export function resumeIndex(steps, done, reached = 0) {
  let last = -1;
  steps.forEach((s, i) => s.type === 'response' && done.includes(s.id) && (last = i));
  const read = steps.findIndex((s) => s.type === 'prep' && s.part === 'info');
  const at = last + 1;
  return read >= 0 && reached > read && at <= read ? read + 1 : at;
}
