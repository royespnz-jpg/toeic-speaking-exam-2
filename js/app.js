import { PARTS, PARTS_ON, RESPONSES, INTRO, OPINION, TOTAL_POINTS, buildTimeline, timedSeconds, responseOf, resumeIndex } from './format.js?v=202611210055';
import { VERSIONS, versionOf, pickVersion } from './versions.js?v=202611210055';
import { clockHtml, runClock, idleClock, fmt } from './clock.js?v=202611210055';
import { unlockAudio, beep, speak, stopSpeaking, openMicrophone, closeMicrophone, levelMeter, startRecording } from './audio.js?v=202611210055';
import { scriptUrl, saveScriptUrl, isScriptUrl, ping, post, report, enqueue, onUpload, pendingUploads, resumeUploads } from './api.js?v=202611210055';
import { saveRecording, allRecordings } from './store.js?v=202611210055';
import { TEACHER_CODE, SCRIPT_VERSION, SCRIPT_APP } from './config.js?v=202611210055';

const app = document.getElementById('app');
const params = new URLSearchParams(location.search);
// ?demo=1: the teacher's try-out, with the real clocks; the sheet marks it "demo".
const DEMO = params.has('demo');
// ?quick=1 shortens every clock to 10 % (for testing the page only).
const SCALE = params.has('quick') ? 0.1 : 1;
const SESSION = 'speaking2.session';
const NAME = 'Speaking Exam II';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let S = null; // the student's exam: { student, version, attempt, steps, stepIndex, done, leftPage, resumed, finished }

function persist() {
  if (!S) return;
  const { steps, ...keep } = S;
  try {
    sessionStorage.setItem(SESSION, JSON.stringify(keep));
  } catch {
    /* storage unavailable */
  }
}

function savedSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION) || 'null');
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION);
  } catch {
    /* storage unavailable */
  }
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const who = () => (S ? `${esc(S.student)} · Version ${S.version}` : 'Student name');
const timeline = (n, scale = SCALE) => buildTimeline(versionOf(n), { scale });
// The questions the exam gives (Questions 10 and 11 can be off: PARTS_ON in format.js).
const RANGE = `Questions 7 to ${PARTS_ON.includes('opinion') ? 11 : PARTS_ON.includes('solution') ? 10 : 9}`;

// ─── 1 · start ──────────────────────────────────────────────────────────────

function renderStart(error = '') {
  const saved = S || {};
  app.innerHTML = `<main class="screen start">
    <section class="start-hero">
      <p class="eyebrow">${NAME}${DEMO ? ' · <b>demo</b>' : ''}</p>
      <h1>Speak when the clock says so.</h1>
      <p class="lede">${RANGE}, in the format of the TOEIC® Speaking test. A clock counts down each step; when it is time
        to speak you hear a beep, your microphone turns on, and it records until the time is up.</p>
      <ol class="parts-overview">
        ${PARTS_ON
          .map((id) => {
            const p = PARTS[id];
            return `<li><span class="po-label">${esc(p.label)}</span><span class="po-title">${esc(p.title)}</span>
              <span class="po-time">${esc(p.time)}</span></li>`;
          })
          .join('')}
      </ol>
    </section>
    <form class="card start-form" data-start novalidate>
      <h2>Your details</h2>
      <label>Full name<input name="student" required maxlength="80" autocomplete="name" value="${esc(saved.student || '')}"></label>
      <p class="form-error" data-error role="alert">${esc(error)}</p>
      <button class="btn primary big" type="submit">Continue</button>
      <p class="muted small">${scriptUrl() ? 'Your answers go to your teacher’s Google Drive.' : 'This exam is not connected to your teacher’s sheet yet.'}
        · <a href="#teacher">Teacher</a></p>
    </form>
    <p class="fineprint">A classroom exam in the style of the former TOEIC® Speaking test. It is not an official ETS test.</p>
  </main>`;
}

// The teacher's link can name the version (?v=2). Otherwise the teacher's
// script hands them out in turn (1, 2, 1, 2…), so a student never gets the
// same version as the one who started just before. Without the script, or if
// it doesn't answer in time, the version is one of them by chance.
async function chooseVersion() {
  const asked = versionOf(params.get('v'));
  if (asked) return asked.n;
  if (scriptUrl()) {
    const late = new Promise((_, fail) => setTimeout(() => fail(new Error('no answer')), 10000));
    try {
      const given = versionOf((await Promise.race([post({ type: 'version' }), late])).version);
      if (given) return given.n;
    } catch {
      /* an older script, or no answer: by chance */
    }
  }
  return pickVersion();
}

async function submitStart(form) {
  const data = Object.fromEntries(new FormData(form));
  const err = form.querySelector('[data-error]');
  if (!String(data.student || '').trim()) {
    err.textContent = 'Write your full name.';
    return;
  }
  if (form.dataset.busy) return;
  form.dataset.busy = '1';
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Starting…';
  const version = await chooseVersion();
  S = {
    student: data.student.trim(),
    version,
    attempt: newId(),
    steps: timeline(version),
    stepIndex: 0,
    done: [],
    leftPage: 0,
    resumed: 0,
  };
  persist();
  renderCheck();
}

// ─── 2 · microphone and sound check ─────────────────────────────────────────

let stopMeter = () => {};

function meterHtml() {
  return `<div class="meter" aria-hidden="true">${'<i></i>'.repeat(14)}</div>`;
}

function showLevel(el, level) {
  const bars = el.querySelectorAll('.meter i');
  const lit = Math.round(level * bars.length);
  bars.forEach((b, i) => b.classList.toggle('on', i < lit));
}

function renderCheck(resuming = false) {
  const total = timedSeconds(S.steps);
  app.innerHTML = `<main class="screen check">
    <header class="check-head">
      <p class="eyebrow">${who()}</p>
      <h1>${resuming ? 'Continue your exam' : 'Check your microphone and sound'}</h1>
      <p class="lede">${
        resuming
          ? 'Your exam was interrupted. It will continue from the question you were answering.'
          : `About ${Math.round(total / 60) + 3} minutes. Use headphones if you can, in a quiet place.`
      }</p>
    </header>
    <div class="check-grid">
      <section class="card check-step" data-mic-step>
        <span class="step-num">1</span>
        <h2>Microphone</h2>
        <p>Allow the microphone, then say something: the bars should move.</p>
        ${meterHtml()}
        <div class="row"><button type="button" class="btn" data-mic>Allow the microphone</button>
          <button type="button" class="btn ghost" data-test-rec disabled>Record a 3-second test</button></div>
        <p class="status" data-mic-status aria-live="polite"></p>
        <audio data-test-audio controls hidden></audio>
      </section>
      <section class="card check-step">
        <span class="step-num">2</span>
        <h2>Sound</h2>
        <p>You will hear the directions, the questions and a beep before you speak.</p>
        <div class="row"><button type="button" class="btn" data-sound>Play the beep and a voice</button></div>
        <p class="status" data-sound-status aria-live="polite"></p>
      </section>
      <section class="card check-step rules">
        <span class="step-num">3</span>
        <h2>Once you start</h2>
        <ul>
          <li>The exam runs by itself. You can’t pause it or go back.</li>
          <li>Each question is spoken and shown on the screen.</li>
          <li>When the clock says <b>Response time</b>, the microphone is recording: speak until the time is up.</li>
          <li>Stay on this page until the end, when your answers are sent.</li>
        </ul>
      </section>
    </div>
    <div class="check-go">
      <button type="button" class="btn primary big" data-begin disabled>${resuming ? 'Continue the exam' : 'Start the exam'}</button>
      <button type="button" class="btn ghost" data-back>Back</button>
    </div>
  </main>`;
}

async function allowMic(button) {
  const status = app.querySelector('[data-mic-status]');
  button.disabled = true;
  try {
    await openMicrophone();
    unlockAudio();
    stopMeter();
    const card = app.querySelector('[data-mic-step]');
    stopMeter = levelMeter((l) => showLevel(card, l));
    status.textContent = '✓ The microphone is on.';
    status.className = 'status ok';
    button.textContent = 'Microphone on';
    app.querySelector('[data-test-rec]').disabled = false;
    app.querySelector('[data-begin]').disabled = false;
  } catch (e) {
    button.disabled = false;
    status.textContent = e.message;
    status.className = 'status bad';
  }
}

async function testRecording(button) {
  const status = app.querySelector('[data-mic-status]');
  button.disabled = true;
  status.textContent = 'Recording… say a sentence.';
  const rec = startRecording();
  await new Promise((r) => setTimeout(r, 3000));
  const { blob } = await rec.stop();
  const audio = app.querySelector('[data-test-audio]');
  audio.src = URL.createObjectURL(blob);
  audio.hidden = false;
  audio.play().catch(() => {});
  status.textContent = '✓ Listen to your test. If you can’t hear yourself, check the microphone.';
  status.className = 'status ok';
  button.disabled = false;
}

async function testSound(button) {
  unlockAudio();
  button.disabled = true;
  const status = app.querySelector('[data-sound-status]');
  await beep();
  await speak('This is the sound check. If you can hear this voice, your sound is working.');
  status.textContent = '✓ If you heard the beep and the voice, your sound works.';
  status.className = 'status ok';
  button.disabled = false;
}

// ─── 3 · the exam ───────────────────────────────────────────────────────────

let wakeLock = null;
async function keepAwake() {
  try {
    wakeLock = await navigator.wakeLock?.request('screen');
  } catch {
    /* not supported */
  }
}

// Where a step is in the exam: the answer it belongs to, or the first one of its part.
const currentAnswer = (step) => responseOf(step) || RESPONSES.find((r) => r.part === step.part)?.id || null;
const progressLabel = (step) => {
  if (step.type === 'intro') return 'Introduction';
  const id = responseOf(step);
  return id ? RESPONSES.find((r) => r.id === id).label : PARTS[step.part].label;
};

function examShell() {
  app.innerHTML = `<div class="stage">
    <header class="stage-top">
      <div class="brand"><span class="dot"></span>${NAME}</div>
      <div class="progress">
        <span class="progress-label" data-progress-label>${esc(RESPONSES[0].label)}</span>
        <span class="progress-bars" aria-hidden="true">${RESPONSES.map((r) => `<i data-q="${r.id}"></i>`).join('')}</span>
      </div>
      <div class="who">${who()}</div>
    </header>
    <main class="stage-main">
      <section class="task" data-task aria-live="polite"></section>
      <aside class="clock-panel">
        ${clockHtml()}
        <div class="rec" data-rec hidden><span class="rec-dot"></span><b>Recording</b>${meterHtml()}</div>
        <p class="cue" data-cue aria-live="assertive"></p>
      </aside>
    </main>
  </div>`;
  S.done.forEach((id) => app.querySelector(`[data-q="${id}"]`)?.classList.add('done'));
}

// The information for Questions 7–9: a schedule and its details.
function infoHtml(info) {
  return `<section class="info-card" aria-label="Information">
    <h3>${esc(info.title)}</h3>
    <table>
      <thead><tr>${info.columns.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${info.rows.map(([time, what]) => `<tr><td>${esc(time)}</td><td>${esc(what)}</td></tr>`).join('')}</tbody>
    </table>
    <dl>${info.details.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
  </section>`;
}

// Who the student answers as in Question 10, and what the answer has to do.
function roleHtml(solution) {
  return `<div class="role-card"><p class="role">${esc(solution.role)}</p>
    <p>In your response, be sure to:</p>
    <ul>${PARTS.solution.mustDo.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>`;
}

const messageHtml = (solution) => `<div class="voice-message"><span>Voice message</span><p>${esc(solution.message)}</p></div>`;
const questionHtml = (n, text) => `<p class="question"><span class="q-num">${n}</span>${esc(text)}</p>`;
// Question 10 and the topics of Question 11 while they are answered.
const goneHtml = (what) => `<p class="gone">The ${what} is no longer on the screen. Answer with what you prepared.</p>`;

// What the student sees at a step of version `v`.
function taskHtml(step, v, label = who()) {
  if (step.type === 'intro') {
    return `<p class="task-label">${label}</p><h2>Speaking test</h2>
      <p class="directions">${esc(INTRO)}</p>`;
  }
  const p = PARTS[step.part];
  const where = step.question ? `Question ${step.question}` : step.topic ? `${p.label} · Topic ${step.topic} of ${OPINION.topics}` : p.label;
  const head = `<p class="task-label">${esc(where)}</p><h2>${esc(p.title)}</h2>`;
  const directions = `<p class="directions"><b>Directions:</b> ${esc(p.directions)}</p>`;
  if (step.part === 'info') {
    // The information appears when its reading clock starts (during the
    // directions there is nothing to read, so everyone gets the same 30
    // seconds) and stays on the screen to the end of the part. The caller and
    // the questions are only heard, never shown, as the teacher asked.
    if (step.type === 'part') return head + directions;
    return `<div class="info-step">${head}${infoHtml(v.info)}</div>`;
  }
  // Question 10 and each topic of Question 11: the message or the topic is on
  // the screen while the students listen and prepare, and gone while they
  // answer (as the teacher asked). Who they answer as stays.
  if (step.part === 'solution') {
    if (step.type === 'part') return head + directions + roleHtml(v.solution);
    if (step.type === 'response') return head + roleHtml(v.solution) + goneHtml('voice message');
    return head + roleHtml(v.solution) + messageHtml(v.solution);
  }
  if (step.type === 'part') return head + directions;
  if (step.type === 'response') return head + goneHtml('topic');
  return head + questionHtml(step.topic, v.opinion[step.topic - 1]);
}

function setCue(text, kind = '') {
  const cue = app.querySelector('[data-cue]');
  cue.textContent = text;
  cue.className = `cue ${kind}`;
}

// What a spoken step is: the clock's small print and the line under it.
function listening(step) {
  if (step.question) return { phase: `Question ${step.question}`, sub: 'Question', cue: 'Listen to the question.' };
  if (step.topic) return { phase: `Topic ${step.topic}`, sub: 'Topic', cue: 'Listen to the topic.' };
  if (step.message) return { phase: 'Listen', sub: 'Message', cue: 'Listen to the message.' };
  if (step.narrator) return { phase: 'Listen', sub: 'Caller', cue: 'Listen to the caller.' };
  return { phase: 'Listen', sub: 'Directions', cue: 'Listen to the directions.' };
}

let running = false;

async function runExam() {
  running = true;
  examShell();
  keepAwake();
  const v = versionOf(S.version);
  const clock = app.querySelector('.clock');
  const recEl = app.querySelector('[data-rec]');
  if (S.stepIndex === 0) report({ type: 'start', attempt: S.attempt, student: S.student, version: S.version, demo: DEMO || SCALE < 1, startedAt: new Date().toISOString(), userAgent: navigator.userAgent });

  for (let i = S.stepIndex; i < S.steps.length; i++) {
    S.stepIndex = i;
    persist();
    const step = S.steps[i];
    const task = app.querySelector('[data-task]');
    const show = (html) => {
      if (task.dataset.html === html) return;
      task.innerHTML = html;
      task.dataset.html = html;
      // New content starts at the top (on a phone, the page may be scrolled down).
      window.scrollTo({ top: 0 });
    };
    // What a clock is for (the information, in Questions 7–9) appears when the clock starts, after its cue.
    if (step.type !== 'prep') show(taskHtml(step, v));
    else if (!task.dataset.html) show(taskHtml({ type: 'part', part: step.part }, v));
    const current = currentAnswer(step);
    app.querySelectorAll('.progress [data-q]').forEach((bar) => bar.classList.toggle('now', bar.dataset.q === current));
    app.querySelector('[data-progress-label]').textContent = progressLabel(step);

    if (step.type === 'intro' || step.type === 'part' || step.type === 'say') {
      const l = listening(step);
      idleClock(clock, { phase: l.phase, time: '··', sub: l.sub });
      setCue(l.cue);
      await speak(step.say);
    } else if (step.type === 'prep') {
      const phase = step.phase || 'Preparation time';
      idleClock(clock, { phase, time: fmt(step.seconds) });
      setCue(step.say);
      await speak(step.say);
      show(taskHtml(step, v));
      setCue(step.cue || 'Prepare your answer.', 'prep');
      await runClock(clock, step.seconds, { mode: 'prep', phase, sub: step.sub || 'Prepare' }).done;
    } else if (step.type === 'response') {
      idleClock(clock, { phase: 'Response time', time: fmt(step.seconds) });
      if (step.say) {
        setCue(step.say);
        await speak(step.say);
      }
      await beep();
      const rec = startRecording();
      recEl.hidden = false;
      const stop = levelMeter((l) => showLevel(recEl, l));
      setCue('Speak now: the microphone is recording.', 'live');
      await runClock(clock, step.seconds, { mode: 'response', phase: 'Response time', sub: 'Recording' }).done;
      const { blob, seconds } = await rec.stop();
      stop();
      recEl.hidden = true;
      setCue('Time is up.', 'done');
      const meta = RESPONSES.find((r) => r.id === step.id);
      const saved = {
        key: `${S.attempt}:${step.id}`,
        attempt: S.attempt,
        student: S.student,
        version: S.version,
        qid: step.id,
        label: meta.label,
        prompt: step.prompt,
        seconds,
        blob,
        recordedAt: new Date().toISOString(),
        uploaded: false,
      };
      await saveRecording(saved);
      enqueue(saved);
      if (!S.done.includes(step.id)) S.done.push(step.id);
      app.querySelector(`[data-q="${step.id}"]`)?.classList.add('done');
      persist();
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
  running = false;
  S.stepIndex = S.steps.length;
  S.finished = true;
  persist();
  closeMicrophone();
  stopSpeaking();
  wakeLock?.release?.().catch(() => {});
  report({ type: 'finish', attempt: S.attempt, student: S.student, version: S.version, responses: S.done.length, leftPage: S.leftPage, resumed: S.resumed, finishedAt: new Date().toISOString() });
  renderDone();
}


// ─── 4 · the end ────────────────────────────────────────────────────────────

const STATUS = {
  waiting: 'Waiting…',
  sending: 'Sending…',
  retrying: 'Trying again…',
  sent: '✓ Sent',
  local: 'Saved on this device',
};

async function renderDone() {
  const recs = (await allRecordings()).filter((r) => r.attempt === S.attempt);
  const connected = Boolean(scriptUrl());
  app.innerHTML = `<main class="screen done">
    <p class="eyebrow">${who()}</p>
    <h1 data-done-title>${connected ? 'Sending your answers…' : 'The exam is over'}</h1>
    <p class="lede" data-done-lede>${
      connected
        ? 'Keep this page open until every answer says “Sent”.'
        : 'This exam isn’t connected to your teacher’s sheet. Download your answers and send them to your teacher.'
    }</p>
    <ol class="card uploads">
      ${RESPONSES.map((r) => {
        const rec = recs.find((x) => x.qid === r.id);
        const status = !rec ? 'missing' : rec.uploaded ? 'sent' : connected ? 'waiting' : 'local';
        return `<li data-up="${r.id}" data-status="${status}">
          <span class="up-label">${esc(r.label)}</span>
          <span class="up-time">${rec ? fmt(Math.round(rec.seconds)) : '—'}</span>
          <span class="up-status">${status === 'missing' ? 'Not recorded' : STATUS[status]}</span>
          ${rec ? `<a class="btn ghost small" download="${esc(S.student)} - ${esc(r.label)}.${/mp4/.test(rec.blob.type) ? 'm4a' : 'webm'}" href="${URL.createObjectURL(rec.blob)}">Download</a>` : ''}
        </li>`;
      }).join('')}
    </ol>
  </main>`;
  updateDone();
}

function updateDone() {
  if (!S?.finished) return;
  const title = app.querySelector('[data-done-title]');
  if (!title || !scriptUrl()) return;
  const rows = [...app.querySelectorAll('[data-up]')];
  const recorded = rows.filter((r) => r.dataset.status !== 'missing');
  if (recorded.length && recorded.every((r) => r.dataset.status === 'sent') && !pendingUploads()) {
    title.textContent = '✓ Your answers were sent';
    app.querySelector('[data-done-lede]').textContent = 'Your teacher has your answers. You can close this page.';
    clearSession();
  }
}

onUpload(({ qid, key, status, error }) => {
  if (S && !key.startsWith(`${S.attempt}:`)) return;
  const row = app.querySelector(`[data-up="${qid}"]`);
  if (!row) return;
  row.dataset.status = status;
  row.querySelector('.up-status').textContent = STATUS[status] || status;
  if (error) row.querySelector('.up-status').title = error;
  updateDone();
});

// ─── teacher ────────────────────────────────────────────────────────────────

// Everything a version asks (in the parts the exam gives), to read before the
// exam and while grading. The teacher sees the caller and the questions, which
// the students only hear.
function versionHtml(v) {
  const part = {
    info: () => `${infoHtml(v.info)}
      <p class="narrator"><span>Caller (heard)</span>${esc(v.info.narrator)}</p>
      <p class="muted small">The questions (heard, not shown):</p>
      <ol class="tv-list" start="7">${v.info.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>`,
    solution: () => `${roleHtml(v.solution)}${messageHtml(v.solution)}`,
    opinion: () => `<ol class="tv-list">${v.opinion.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>`,
  };
  return `<section class="tv">
    <h3>Version ${v.n}</h3>
    ${PARTS_ON.map((id) => `<h4>${esc(PARTS[id].label)} · ${esc(PARTS[id].title)}</h4>${part[id]()}`).join('')}
  </section>`;
}

function renderTeacher(message = '') {
  const url = scriptUrl();
  const base = `${location.origin}${location.pathname}`;
  const link = (extra = '') => `${base}?${url ? `s=${encodeURIComponent(url)}&` : ''}${extra}`.replace(/[?&]$/, '');
  const linkRow = (label, href) =>
    `<div class="link-row"><span class="link-label">${esc(label)}</span><code>${esc(href)}</code><button class="btn small" data-copy="${esc(href)}">Copy</button></div>`;
  const minutes = Math.round(timedSeconds(timeline(VERSIONS[0].n, 1)) / 60) + 3;
  app.innerHTML = `<main class="screen teacher">
    <div class="teacher-head"><div><p class="eyebrow">Teacher</p>
    <h1>Set up the exam</h1></div><button type="button" class="btn ghost small" data-lock>Lock and leave</button></div>
    <form class="card" data-teacher>
      <h2>1 · Your Google Script</h2>
      <p>Paste the web app URL of the exam’s Google Apps Script (it ends in <code>/exec</code>). Recordings go to your Drive and
        a row for each one to your sheet.</p>
      <div class="row"><input name="url" value="${esc(url)}" placeholder="https://script.google.com/macros/s/…/exec" spellcheck="false">
        <button class="btn" type="button" data-test-script>Test</button><button class="btn primary" type="submit">Save</button></div>
      <p class="status" data-teacher-status aria-live="polite">${esc(message)}</p>
    </form>
    <section class="card">
      <h2>2 · The links for your students</h2>
      <p>They carry your script, so the recordings go to your sheet. Students write their full name and start. With the
        first link your script hands out the versions in turn: if a student gets version 1, the next one to start gets
        version 2, and so on (the first one is by chance). The others give everyone the same version. The sheet says which
        version each student had.</p>
      ${linkRow('Versions in turn', link())}
      ${VERSIONS.map((v) => linkRow(`Version ${v.n}`, link(`v=${v.n}`))).join('')}
    </section>
    <section class="card">
      <h2>3 · Go through the exam</h2>
      <p>See every step as the students see it — the directions, the information, each question and each clock — in any
        order, with the clock and the voice. Nothing is recorded or sent.</p>
      <p><a class="btn primary" href="#preview">Open the preview</a></p>
    </section>
    <section class="card">
      <h2>4 · The versions</h2>
      <p class="muted small">What each version asks. ${PARTS_ON.length > 1 ? 'Questions 7–9 are scored 0–3; Questions 10 and 11, 0–5' : 'Each question is scored 0–3'}
        (${TOTAL_POINTS} points in all).</p>
      ${VERSIONS.map(versionHtml).join('')}
    </section>
    <section class="card">
      <h2>5 · Try it</h2>
      <p>Try the whole exam with its real clocks (about ${minutes} minutes); your recordings go to your sheet like a student’s,
        marked <i>demo</i>.</p>
      <p class="row">${VERSIONS.map((v) => `<a class="btn ghost" href="${esc(link(`demo=1&v=${v.n}`))}">Try version ${v.n}</a>`).join('')}</p>
    </section>
  </main>`;
}

// ─── teacher access ─────────────────────────────────────────────────────────
// The teacher pages show every version, so students get a code screen first.
// The code opens them for this tab only (sessionStorage).

const UNLOCK = 'speaking2.teacher';

function unlocked() {
  try {
    return sessionStorage.getItem(UNLOCK) === TEACHER_CODE;
  } catch {
    return false;
  }
}

function setUnlocked(on) {
  try {
    if (on) sessionStorage.setItem(UNLOCK, TEACHER_CODE);
    else sessionStorage.removeItem(UNLOCK);
  } catch {
    /* storage unavailable */
  }
}

function renderCode(error = '') {
  app.innerHTML = `<main class="screen code">
    <form class="card code-card" data-code novalidate>
      <p class="eyebrow">Teacher</p>
      <h1>Teacher access</h1>
      <p class="muted">Write the teacher’s code to set up the exam and to go through its versions.</p>
      <label>Code<input name="code" inputmode="numeric" autocomplete="off" maxlength="12" autofocus></label>
      <p class="form-error" data-error role="alert">${esc(error)}</p>
      <div class="row"><button class="btn primary" type="submit">Enter</button><a class="btn ghost" href="#">Back</a></div>
    </form>
  </main>`;
  app.querySelector('[name="code"]').focus();
}

// ─── teacher preview ────────────────────────────────────────────────────────
// Every step of a version, as the students see it, in any order: nothing is
// recorded or sent.

const PREVIEW = { version: VERSIONS[0].n, steps: timeline(VERSIONS[0].n, 1), at: 0, clock: null };
const PARTS_ORDER = PARTS_ON;

// A short name for a step, for its button.
function stepName(step) {
  if (step.type === 'intro') return 'Introduction';
  if (step.type === 'part') return 'Directions';
  if (step.type === 'prep') return step.part === 'info' ? 'Read' : step.topic ? `Prepare ${step.topic}` : 'Prepare';
  if (step.type === 'say') return step.narrator ? 'Caller' : step.question ? `Question ${step.question}` : step.message ? 'Message' : `Topic ${step.topic}`;
  return step.question ? `Answer ${step.question}` : step.topic ? `Answer ${step.topic}` : 'Answer';
}

function renderPreview() {
  const P = PREVIEW;
  P.clock?.stop();
  P.clock = null;
  stopSpeaking();
  const v = versionOf(P.version);
  const step = P.steps[P.at];
  const first = (part) => P.steps.findIndex((s) => s.part === part);
  const chip = (label, go, now, title = label) =>
    `<button type="button" class="pv-step${now ? ' now' : ''}" data-pv-go="${go}" title="${esc(title)}" aria-current="${now ? 'true' : 'false'}">${esc(label)}</button>`;
  const versions = VERSIONS.length > 1
    ? `<div class="pv-group"><span class="pv-group-label">Version</span>${VERSIONS.map((x) =>
        `<button type="button" class="pv-step${x.n === P.version ? ' now' : ''}" data-pv-version="${x.n}" aria-current="${x.n === P.version ? 'true' : 'false'}">${x.n}</button>`).join('')}</div>`
    : '';
  const parts = `<div class="pv-group pv-readings"><span class="pv-group-label">Parts</span>${chip('Intro', 0, step.type === 'intro', 'Introduction')}${PARTS_ORDER.map((id) =>
    chip(PARTS[id].label, first(id), step.part === id, PARTS[id].title)).join('')}</div>`;
  const mine = step.part ? P.steps.map((s, i) => [s, i]).filter(([s]) => s.part === step.part) : [];
  const steps = mine.length
    ? `<div class="pv-group"><span class="pv-group-label">${esc(PARTS[step.part].label)}</span>${mine.map(([s, i]) => chip(stepName(s), i, i === P.at)).join('')}</div>`
    : '';
  const current = currentAnswer(step);
  app.innerHTML = `<div class="stage preview">
    <header class="stage-top">
      <div class="brand"><span class="dot"></span>${NAME}</div>
      <div class="progress">
        <span class="progress-label">${esc(progressLabel(step))}</span>
        <span class="progress-bars" aria-hidden="true">${RESPONSES.map((x) => `<i class="${x.id === current ? 'now' : ''}"></i>`).join('')}</span>
      </div>
      <div class="who"><span class="pv-badge">Teacher preview · Version ${P.version}</span></div>
    </header>
    <nav class="pv-bar" aria-label="Steps of the exam">
      <div class="pv-steps">${versions}${parts}${steps}</div>
      <div class="pv-actions">
        <button type="button" class="btn small" data-pv-prev ${P.at === 0 ? 'disabled' : ''}>← Previous</button>
        <button type="button" class="btn small" data-pv-next ${P.at === P.steps.length - 1 ? 'disabled' : ''}>Next →</button>
        <button type="button" class="btn small ghost" data-pv-say>▶ Hear what they hear</button>
        ${step.seconds ? `<button type="button" class="btn small ghost" data-pv-clock>Start the ${step.seconds}-second clock</button>` : ''}
        <a class="btn small ghost" href="#teacher">Teacher page</a>
      </div>
      <p class="pv-note">${esc(step.part ? `${PARTS[step.part].label} · ${stepName(step)}` : 'Introduction')} · step ${P.at + 1} of ${P.steps.length}. Nothing is recorded or sent in the preview. Use ← → to move.</p>
    </nav>
    <main class="stage-main">
      <section class="task" data-task>${taskHtml(step, v, `Version ${P.version}`)}</section>
      <aside class="clock-panel">
        ${clockHtml()}
        ${step.type === 'response' ? `<div class="rec"><span class="rec-dot"></span><b>Recording</b><span class="muted small">(not in the preview)</span></div>` : ''}
        <p class="cue" data-cue></p>
      </aside>
    </main>
  </div>`;
  const clock = app.querySelector('.clock');
  if (step.type === 'prep') {
    idleClock(clock, { phase: step.phase || 'Preparation time', time: fmt(step.seconds), sub: step.sub || 'Prepare' });
    setCue(step.cue || 'Prepare your answer.', 'prep');
  } else if (step.type === 'response') {
    idleClock(clock, { phase: 'Response time', time: fmt(step.seconds), sub: 'Recording' });
    setCue('Speak now: the microphone is recording.', 'live');
  } else {
    const l = listening(step);
    idleClock(clock, { phase: l.phase, time: '··', sub: l.sub });
    setCue(l.cue);
  }
}

function previewGo(i) {
  PREVIEW.at = Math.max(0, Math.min(PREVIEW.steps.length - 1, i));
  renderPreview();
  window.scrollTo({ top: 0 });
}

// The same place in another version (every version has the same steps).
function previewVersion(n) {
  if (!versionOf(n)) return;
  PREVIEW.version = versionOf(n).n;
  PREVIEW.steps = timeline(PREVIEW.version, 1);
  previewGo(PREVIEW.at);
}

function previewClock(button) {
  const step = PREVIEW.steps[PREVIEW.at];
  if (PREVIEW.clock) {
    PREVIEW.clock.stop();
    return;
  }
  const clock = app.querySelector('.clock');
  const prep = step.type === 'prep';
  PREVIEW.clock = runClock(clock, step.seconds, {
    mode: prep ? 'prep' : 'response',
    phase: prep ? step.phase || 'Preparation time' : 'Response time',
    sub: prep ? step.sub || 'Prepare' : 'Recording',
  });
  button.textContent = 'Stop the clock';
  PREVIEW.clock.done.then(() => {
    PREVIEW.clock = null;
    if (button.isConnected) button.textContent = `Start the ${step.seconds}-second clock`;
  });
}

// ─── events ─────────────────────────────────────────────────────────────────

document.addEventListener('submit', (e) => {
  const form = e.target;
  e.preventDefault();
  if (form.matches('[data-start]')) submitStart(form);
  if (form.matches('[data-code]')) {
    if (String(new FormData(form).get('code') || '').trim() !== TEACHER_CODE) return renderCode('That is not the teacher’s code.');
    setUnlocked(true);
    start();
  }
  if (form.matches('[data-teacher]')) {
    const url = String(new FormData(form).get('url') || '').trim();
    if (url && !isScriptUrl(url)) return renderTeacher('That is not an Apps Script web app URL (it ends in /exec).');
    saveScriptUrl(url);
    renderTeacher(url ? '✓ Saved. The links below now send the recordings to your sheet.' : 'Removed.');
  }
});

document.addEventListener('click', async (e) => {
  const t = e.target.closest('button, a');
  if (!t) return;
  if (t.matches('[data-pv-go]')) previewGo(Number(t.dataset.pvGo));
  else if (t.matches('[data-pv-version]')) previewVersion(Number(t.dataset.pvVersion));
  else if (t.matches('[data-pv-prev]')) previewGo(PREVIEW.at - 1);
  else if (t.matches('[data-pv-next]')) previewGo(PREVIEW.at + 1);
  else if (t.matches('[data-pv-say]')) {
    unlockAudio();
    stopSpeaking();
    speak(PREVIEW.steps[PREVIEW.at].say);
  } else if (t.matches('[data-pv-clock]')) previewClock(t);
  else if (t.matches('[data-lock]')) {
    setUnlocked(false);
    location.hash = '';
  } else if (t.matches('[data-mic]')) allowMic(t);
  else if (t.matches('[data-test-rec]')) testRecording(t);
  else if (t.matches('[data-sound]')) testSound(t);
  else if (t.matches('[data-back]')) {
    stopMeter();
    closeMicrophone();
    renderStart();
  } else if (t.matches('[data-begin]')) {
    stopMeter();
    unlockAudio();
    runExam();
  } else if (t.matches('[data-copy]')) {
    try {
      await navigator.clipboard.writeText(t.dataset.copy);
      t.textContent = 'Copied';
    } catch {
      t.textContent = 'Select and copy';
    }
  } else if (t.matches('[data-test-script]')) {
    const status = app.querySelector('[data-teacher-status]');
    const url = app.querySelector('[name="url"]').value.trim();
    status.textContent = 'Testing…';
    try {
      const info = await ping(url);
      status.textContent =
        info.app !== SCRIPT_APP
          ? `That is the script of “${info.sheet}” (${info.app || 'another exam'}), not the ${SCRIPT_APP} one.`
          : (info.version || 1) < SCRIPT_VERSION
            ? `Connected to “${info.sheet}”, but its script is an old version: paste the new Code.gs, run setup, and deploy a new version (Deploy → Manage deployments → ✏ → New version).`
            : `✓ Connected to “${info.sheet}”. Press Save.`;
    } catch (err) {
      status.textContent = `Couldn’t connect: ${err.message}`;
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (location.hash !== '#preview' || !unlocked() || e.target.closest('input, textarea')) return;
  if (e.key === 'ArrowRight') previewGo(PREVIEW.at + 1);
  if (e.key === 'ArrowLeft') previewGo(PREVIEW.at - 1);
});

document.addEventListener('visibilitychange', () => {
  if (!running) return;
  if (document.hidden) {
    S.leftPage++;
    persist();
  } else keepAwake();
});

window.addEventListener('beforeunload', (e) => {
  if (running || (S?.finished && pendingUploads())) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ─── start ──────────────────────────────────────────────────────────────────

function start() {
  resumeUploads();
  stopSpeaking();
  PREVIEW.clock?.stop();
  if (location.hash === '#teacher' || location.hash === '#preview') {
    if (!unlocked()) return renderCode();
    return location.hash === '#preview' ? renderPreview() : renderTeacher();
  }
  const saved = savedSession();
  // A session of a version that is no longer in the exam starts again.
  if (saved && !versionOf(saved.version)) clearSession();
  else if (saved && !saved.finished) {
    S = { ...saved, steps: timeline(saved.version) };
    S.stepIndex = resumeIndex(S.steps, S.done, saved.stepIndex || 0);
    S.resumed = (S.resumed || 0) + 1;
    persist();
    return renderCheck(true);
  } else if (saved?.finished) {
    S = { ...saved, steps: timeline(saved.version) };
    return renderDone();
  }
  renderStart();
}

window.addEventListener('hashchange', () => !running && start());
start();
