/*
  واجهة اللعب: المقدمة بين المراحل، السؤال، المؤقت، الـReactions، الشرح.
  يدعم نوعَي السؤال: اختيارات (mc) ومشهد بصري (visual).
*/

import { GameSession } from '../core/game.js';
import { STAGES_META } from '../data/questions.js';
import { SCORING, GAME } from '../config.js';
import { pickIntro, pickCorrect, pickWrong } from './reactions.js';
import { timerRingHTML, updateTimer } from './timer.js';
import { escapeHTML } from '../core/validation.js';
import { el, showScreen } from './screen.js';
import { formatSeconds } from '../core/dice.js';

const REACTION_MS = 2300;
const TICK_MS = 100;

let session = null;
let onFinish = null;
let timerId = null;
let answerLocked = false;
let questionStart = 0;
let questionTotalMs = 0;
let resolveRef = null;

export function startGame(name, finishCb) {
  session = new GameSession(name);
  session.pickQuestions();
  onFinish = finishCb;
  answerLocked = false;
  showStageIntro(0);
}

function root() {
  return el('gameRoot');
}

function totalSoFar() {
  return session.totalScore();
}

function renderHead(currentStage) {
  const meta = STAGES_META[currentStage];
  return `
    <div class="game-head reveal">
      <div class="progress-track" role="progressbar"
           aria-valuemin="0" aria-valuemax="${GAME.stagesCount}" aria-valuenow="${currentStage}"
           aria-label="تقدم المراحل">
        <div class="progress-fill" id="progressFill" style="width:${((currentStage - 1) / GAME.stagesCount) * 100}%"></div>
      </div>
      <div class="progress-meta">
        <span class="stage-label"><span>المرحلة</span>
          <b class="num">${currentStage}</b>
          <span>من</span> <b class="num">${GAME.stagesCount}</b></span>
        <span class="num score-now" style="color:var(--accent);font-weight:900">${formatPoints(totalSoFar())}</span>
      </div>
    </div>`;
}

function renderStageBanner(currentStage) {
  const meta = STAGES_META[currentStage];
  return `
    <div class="stage-banner">
      <div class="ico" style="background:${meta.color}22;color:${meta.color}">${meta.emoji}</div>
      <div class="meta">
        <div class="t">${meta.title}</div>
        <div class="sm">المرحلة ${currentStage} · ${meta.color === STAGES_META[4].color ? 'الفرصة الأخيرة — النقاط مضاعفة' : '+ نقاط × البونص السريع'}</div>
      </div>
    </div>`;
}

function showStageIntro(index) {
  const stage = index + 1;
  const meta = STAGES_META[stage];
  const isVisual = session.stageQuestion(index)?.type === 'visual';
  const instruction = isVisual
    ? 'لاحظ المشهد جيدًا ثم اضغط على العنصر الذي لا ينتمي.'
    : 'اقرأ السؤال بسرعة واختر إجابتك قبل انتهاء الوقت.';

  showScreen('game');
  root().innerHTML = `
    ${renderHead(stage)}
    <div class="card inter-stage reveal">
      <div class="big-emoji">${meta.emoji}</div>
      <h2 style="color:${meta.color}">${meta.title}</h2>
      <p>${instruction}</p>
      <p style="font-size:.8rem;opacity:.8">${pickIntro()}</p>
      <button class="btn" id="beginStageBtn" style="background:linear-gradient(135deg,${meta.color},${meta.color}CC)">
        ابدأ <span class="num">${'⏱'}</span> <span class="num">${SCORING.timeouts[stage]}</span>ث
      </button>
    </div>`;
  el('beginStageBtn').addEventListener('click', () => showQuestion(index));
}

function showQuestion(index) {
  const q = session.stageQuestion(index);
  if (!q) return;
  const stage = index + 1;
  const meta = STAGES_META[stage];
  answerLocked = false;

  showScreen('game');
  root().innerHTML = `
    ${renderHead(stage)}
    ${renderStageBanner(stage)}
    <div class="card question-box reveal">
      <div class="q-kicker">${meta.emoji} ${meta.title} — السؤال ${index + 1}</div>
      <p class="question-text">${escapeHTML(q.question)}</p>
    </div>
    ${timerRingHTML()}
    ${renderQuestionBody(q)}
    <div class="explain-strip" id="explainStrip" hidden aria-live="polite"></div>`;

  questionTotalMs = session.stageTimeLimitMs(index);
  questionStart = Date.now();
  const fg = el('timerFg');
  const num = el('timerNum');
  updateTimer(fg, num, questionTotalMs, questionTotalMs);

  timerId = setInterval(() => {
    const remaining = questionTotalMs - (Date.now() - questionStart);
    if (remaining <= 0) {
      clearInterval(timerId);
      timerId = null;
      if (!answerLocked) onTimeout(index);
      return;
    }
    updateTimer(fg, num, remaining, questionTotalMs);
  }, TICK_MS);

  resolveRef = (selectedIndex) => {
    if (answerLocked) return;
    answerLocked = true;
    clearInterval(timerId);
    timerId = null;
    const elapsed = Date.now() - questionStart;
    const remaining = Math.max(0, questionTotalMs - elapsed);
    const result = session.resolveAnswer(index, selectedIndex, remaining, questionTotalMs, elapsed);
    showAnswerFeedback(index, result, selectedIndex);
  };

  bindQuestionEvents(q, index, meta);
}

function renderQuestionBody(q) {
  if (q.type === 'visual') {
    const items = q.scene.items;
    return `
      <div class="card scene-box reveal reveal-1">
        <div class="scene-title">${q.scene.title}</div>
        <div class="scene-grid">
          ${items.map((it, i) => `
            <button class="scene-item" data-qindex="${i}" data-oid="${it.id}"
                    aria-label="${escapeHTML(it.label)} — اختر العنصر الغريب">
              <span class="si-emoji">${it.emoji}</span>
              <span class="si-label">${escapeHTML(it.label)}</span>
            </button>`).join('')}
        </div>
      </div>`;
  }

  const letters = ['أ', 'ب', 'ج', 'د'];
  return `
    <div class="options">
      ${q.options.map((opt, i) => `
        <button class="option" data-qindex="${i}" aria-pressed="false">
          <span class="k">${letters[i]}</span>
          <span>${escapeHTML(opt)}</span>
        </button>`).join('')}
    </div>`;
}

function bindQuestionEvents(q, index, meta) {
  root().querySelectorAll('[data-qindex]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.qindex);
      resolveRef(i);
    });
  });
}

function onTimeout(index) {
  const result = session.resolveTimeout(index, questionTotalMs);
  const q = session.stageQuestion(index);
  answerLocked = true;
  showAnswerFeedback(index, result, -1);
}

function showAnswerFeedback(index, result, selectedIndex) {
  const q = session.stageQuestion(index);
  const correct = result.correct;
  const meta = STAGES_META[index + 1];

  // تمييز بصري (لا يعتمد على اللون وحده)
  if (q.type === 'visual') {
    if (selectedIndex >= 0) markScene(selectedIndex, correct);
    if (!correct) markScene(q.scene.items.findIndex((it) => it.isOdd), true, true);
  } else {
    if (selectedIndex >= 0) markOption(selectedIndex, correct);
    if (!correct) markOption(q.answerIndex, true, true);
  }

  const reaction = correct ? pickCorrect() : pickWrong();
  const icon = correct ? '🎉' : selectedIndex === -1 ? '⏰' : '😅';
  showReaction(reaction, correct, icon);

  if (correct && result.points > 0) {
    showPlusPoints(result.points);
  }

  const explainEl = el('explainStrip');
  explainEl.hidden = false;
  explainEl.innerHTML = correct
    ? `<b>${result.points} نقطة</b> — ${escapeHTML(q.explain)}`
    : `<b>الإجابة: ${escapeHTML(correctText(q))}</b> — ${escapeHTML(q.explain)}`;

  setTimeout(() => advance(index), REACTION_MS);
}

function correctText(q) {
  if (q.type === 'visual') {
    const odd = q.scene.items.find((it) => it.isOdd);
    return odd ? odd.label : '';
  }
  return q.options[q.answerIndex] || '';
}

function markOption(index, correct, revealOnly = false) {
  const btns = root().querySelectorAll('.option');
  if (!btns[index]) return;
  btns[index].classList.add(correct ? 'correct' : 'wrong');
  btns[index].setAttribute('aria-pressed', correct ? 'true' : 'false');
  if (revealOnly) btns[index].classList.add('reveal-correct');
  btns.forEach((b) => { if (b !== btns[index]) b.disabled = true; });
}

function markScene(index, correct, revealOnly = false) {
  const items = root().querySelectorAll('.scene-item');
  if (!items[index]) return;
  items[index].classList.add(correct ? 'correct' : 'wrong');
  if (revealOnly) items[index].classList.add('correct');
  items.forEach((b) => { if (b !== items[index]) b.disabled = true; });
}

function showReaction(text, ok, icon) {
  const d = document.createElement('div');
  d.className = `reaction ${ok ? 'ok' : 'bad'}`;
  d.setAttribute('aria-live', 'assertive');
  d.innerHTML = `<span class="react-ico">${icon}</span>${escapeHTML(text)}`;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1500);
}

function showPlusPoints(points) {
  const d = document.createElement('div');
  d.className = 'plus-points';
  d.innerHTML = `+${points}`;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1400);
}

function advance(index) {
  const next = index + 1;
  if (next < GAME.stagesCount) {
    showStageIntro(next);
  } else {
    finish();
  }
}

function finish() {
  if (onFinish) onFinish(session);
}

function formatPoints(p) {
  return `${p} نقطة`;
}

export function stopCurrentTimer() {
  if (timerId) { clearInterval(timerId); timerId = null; }
}