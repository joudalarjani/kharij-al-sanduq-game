/*
  واجهة اللعب: شاشة البداية، شاشة المرحلة، السؤال، المؤقت، التغذية الراجعة.
  يدعم 11 نوع سؤال من خلال js/ui/puzzles/.
*/

import { GameSession } from '../core/game.js';
import { STAGES_META } from '../data/questions.js';
import { SCORING, GAME, STAGE_THEMES } from '../config.js';
import { pickIntro, pickCorrect, pickWrong } from './reactions.js';
import { timerRingHTML, updateTimer } from './timer.js';
import { escapeHTML } from '../core/validation.js';
import { el, showScreen } from './screen.js';
import { formatSeconds } from '../core/dice.js';
import { renderPuzzle, bindPuzzle, revealPuzzle, gradePuzzle, typeLabel } from './puzzles/index.js';

const REACTION_MS = 2400;
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
  // خريطة المراحل قبل البداية
  showStageMap(0);
}

function root() {
  return el('gameRoot');
}

function totalSoFar() {
  return session.totalScore();
}

/* ─── رأس اللعبة: تقدم + شعار مصغّر + نقاط ─── */
function renderHead(currentStage) {
  const meta = STAGES_META[currentStage];
  return `
    <div class="game-head reveal">
      <div class="progress-track" role="progressbar"
           aria-valuemin="0" aria-valuemax="${GAME.stagesCount}" aria-valuenow="${currentStage - 1}"
           aria-label="تقدم المراحل">
        <div class="progress-fill" id="progressFill" style="width:${((currentStage - 1) / GAME.stagesCount) * 100}%"></div>
      </div>
      <div class="progress-meta">
        <span class="stage-label">
          <span class="logo-pill">
            <img src="assets/club-logo.svg" alt="" width="22" height="22" aria-hidden="true">
            <span>نادي الابتكار</span>
          </span>
          <span>المرحلة</span>
          <b class="num">${currentStage}</b>
          <span>/</span>
          <b class="num">${GAME.stagesCount}</b>
        </span>
        <span class="num score-now" style="color:var(--accent);font-weight:900">${formatPoints(totalSoFar())}</span>
      </div>
    </div>`;
}

function renderStageBanner(currentStage) {
  const meta = STAGES_META[currentStage];
  return `
    <div class="stage-banner" style="--stage-color:${meta.color}">
      <div class="ico" style="background:${meta.color}22;color:${meta.color}">${meta.emoji}</div>
      <div class="meta">
        <div class="t">${escapeHTML(meta.title)}</div>
        <div class="sm">${escapeHTML(meta.subtitle || '')}</div>
      </div>
      <span class="stage-pill" style="background:${meta.color}22;color:${meta.color}">المرحلة ${currentStage}</span>
    </div>`;
}

/* ─── خريطة المراحل (بين المراحل وفي البداية) ─── */
function showStageMap(nextStage) {
  const stages = Object.values(STAGE_THEMES);
  showScreen('game');
  const finishedCount = nextStage; // عدد المراحل المكتملة قبل هذه
  root().innerHTML = `
    ${renderHead(Math.max(1, nextStage))}
    <div class="stage-map card reveal">
      <div class="sm-head">
        <div class="sm-title">${nextStage === 0 ? '🗺️' : '✅'} ${nextStage === 0 ? 'خريطة التحدي' : 'تقدّم مذهل!'}</div>
        <div class="sm-sub">${nextStage === 0
          ? 'أربع مراحل من الألغاز — كل مرحلة بنكهة مختلفة. كم مرحلة ستكملها بذكاء؟'
          : `أكملت ${finishedCount} من ${GAME.stagesCount} مراحل. باقي ${GAME.stagesCount - finishedCount} 🔥`}</div>
      </div>
      <div class="sm-grid">
        ${stages.map((s, i) => {
          const status = i < nextStage ? 'done' : i === nextStage ? 'current' : 'locked';
          return `
            <div class="sm-card ${status}" style="--stage-color:${s.accent}">
              <div class="sm-num">${i + 1}</div>
              <div class="sm-emoji">${s.emoji}</div>
              <div class="sm-title-2">${escapeHTML(s.title)}</div>
              <div class="sm-desc">${escapeHTML(s.subtitle)}</div>
              <span class="sm-status">${
                status === 'done' ? '✅ منجزة' :
                status === 'current' ? '👉 التالية' : '🔒 مقفلة'
              }</span>
            </div>`;
        }).join('')}
      </div>
      <div class="sm-actions">
        ${nextStage === 0
          ? `<button class="btn primary" id="beginStageBtn">${pickIntro()} <span aria-hidden="true">→</span></button>`
          : `<button class="btn primary" id="beginStageBtn">المرحلة ${nextStage + 1}: ${escapeHTML(stages[nextStage].title)} →</button>`
        }
      </div>
    </div>`;
  el('beginStageBtn').addEventListener('click', () => showQuestion(nextStage));
}

/* ─── شاشة تقديم المرحلة قبل السؤال ─── */
function showStageIntro(index) {
  showStageMap(index);
}

/* ─── سؤال واحد ─── */
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
      <div class="q-kicker">${meta.emoji} ${escapeHTML(meta.title)} · ${escapeHTML(typeLabel(q.type))}</div>
    </div>
    ${timerRingHTML()}
    <div id="puzzleMount"></div>
    <div class="explain-strip" id="explainStrip" hidden aria-live="polite"></div>`;

  // تركيب اللغز
  const mount = el('puzzleMount');
  const puzzleWrap = document.createElement('div');
  puzzleWrap.className = 'puzzle-wrap';
  puzzleWrap.innerHTML = renderPuzzle(q);
  mount.appendChild(puzzleWrap);

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

  resolveRef = (selected) => {
    if (answerLocked) return;
    answerLocked = true;
    clearInterval(timerId);
    timerId = null;
    const elapsed = Date.now() - questionStart;
    const remaining = Math.max(0, questionTotalMs - elapsed);
    const result = session.resolveAnswer(index, selected, remaining, questionTotalMs, elapsed);
    showAnswerFeedback(index, result, selected);
  };

  bindPuzzle(q, puzzleWrap, (sel) => resolveRef(sel));
}

function onTimeout(index) {
  const result = session.resolveTimeout(index, questionTotalMs);
  const q = session.stageQuestion(index);
  answerLocked = true;
  // نحاول إظهار الإجابة الصحيحة حتى في انتهاء الوقت
  showAnswerFeedback(index, result, null);
}

/* ─── التغذية الراجعة بعد الإجابة ─── */
function showAnswerFeedback(index, result, selected) {
  const q = session.stageQuestion(index);
  const meta = STAGES_META[index + 1];
  const correct = result.correct;

  // تمييز بصري للإجابة الصحيحة والخاطئة
  const state = { selected, correct, locked: true };
  revealPuzzle(q, root(), state);

  // رد فعل
  const reaction = correct ? pickCorrect() : pickWrong();
  const icon = correct ? '🎉' : selected === null || selected === -1 ? '⏰' : '💡';
  showReaction(reaction, correct, icon);

  if (correct && result.points > 0) showPlusPoints(result.points);

  const explainEl = el('explainStrip');
  explainEl.hidden = false;
  const correctAnswerText = correctAnswerLabel(q, result);
  explainEl.innerHTML = `
    <div class="explain-head">
      <span class="explain-tag ${correct ? 'ok' : 'bad'}">${correct ? '✅ قرار ذكي' : '⚠️ ليست أفضل إجابة'}</span>
      ${correct && result.points ? `<b class="num">+${result.points} نقطة</b>` : ''}
    </div>
    ${!correct && correctAnswerText ? `<p class="explain-correct"><b>الإجابة:</b> ${correctAnswerText}</p>` : ''}
    <p class="explain-body">${escapeHTML(q.explain || '')}</p>
    ${q.learning ? `<p class="explain-learn">💡 ${escapeHTML(q.learning)}</p>` : ''}
  `;

  setTimeout(() => advance(index), REACTION_MS);
}

function correctAnswerLabel(q, result) {
  if (q.type === 'visual') {
    const odd = q.scene.items.find((it) => it.isOdd);
    return odd ? `${odd.emoji} ${odd.label}` : '';
  }
  if (q.type === 'findError') {
    const seg = q.segments.find((s) => s.id === q.correctId);
    return seg ? `${seg.id.toUpperCase()}) ${seg.text}` : '';
  }
  if (q.type === 'truefalse') {
    return q.correctAnswer === 'agree' ? 'أوافق 🤝' : 'أرفض ✋';
  }
  if (q.type === 'calc') {
    return `${result.expected}${q.unit ? q.unit : ''}`;
  }
  if (q.type === 'word') {
    return result.expected;
  }
  if (q.type === 'match') {
    const parts = q.pairs.map((p) => `${p.term} = ${p.def}`);
    return parts.join(' · ');
  }
  if (q.type === 'order') {
    return (result.answerOrder || []).map((id, i) => {
      const item = q.items.find((it) => it.id === id);
      return item ? `${i + 1}) ${item.text}` : '';
    }).filter(Boolean).join(' → ');
  }
  if (typeof q.answerIndex === 'number' && q.options && q.options[q.answerIndex] != null) {
    return q.options[q.answerIndex];
  }
  return '';
}

function showReaction(text, ok, icon) {
  const d = document.createElement('div');
  d.className = `reaction ${ok ? 'ok' : 'bad'}`;
  d.setAttribute('aria-live', 'assertive');
  d.innerHTML = `<span class="react-ico">${icon}</span>${escapeHTML(text)}`;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1700);
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
    showStageMap(next);
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
