/*
  ══════════════════════════════════════════════════════════════
  نظام النقاط — منطق نقي قابل للاختبار ولا يعتمد على DOM
  النقاط = (الإجابة صحيحة) × (الأساس × معامل الصعوبة + بونص السرعة)
  البونص = basePoints × difficultyMult × speedBonusRatio × (المتبقي ÷ الكلي)
  لا تُحتسب النقاط أكثر من مرة، ولا تُستخدم أرقام عشوائية
  ══════════════════════════════════════════════════════════════
*/

import { SCORING, RESULT_MESSAGES } from '../config.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

export function stageBasePoints(stage) {
  return SCORING.basePoints[stage] || 0;
}

export function stageTimeLimitSeconds(stage) {
  return SCORING.timeouts[stage] || 30;
}

export function stageDifficultyMultiplier(stage) {
  return SCORING.difficultyMultiplier[stage] || 1;
}

/* نقاط سؤال: تجمع معامل الصعوبة × الأساس + بونص السرعة */
export function answerScore(stage, correct, remainingMs, totalMs, difficulty = 1) {
  if (!correct) return 0;
  const base = stageBasePoints(stage);
  const mult = stageDifficultyMultiplier(stage);
  const stageMax = base * mult;
  if (totalMs <= 0) return Math.round(stageMax);
  const ratio = clamp(remainingMs, 0, totalMs) / totalMs;
  const bonus = Math.round(stageMax * SCORING.speedBonusRatio * ratio);
  return Math.round(stageMax + bonus);
}

export function computeTotalScore(stageResults) {
  return (stageResults || []).reduce((sum, s) => sum + (s ? s.points || 0 : 0), 0);
}

export function computeTotalSeconds(stageResults) {
  return (stageResults || []).reduce((sum, s) => sum + (s ? s.elapsedMs || 0 : 0), 0) / 1000;
}

/* إعادة حساب مطلقة من أحداث اللعب (لا تعتمد على points المرسلة) */
export function scoreFromEvents(stageResults) {
  const events = stageResults || [];
  let sum = events.reduce((acc, ev) => {
    if (!ev || !ev.correct) return acc;
    const base = stageBasePoints(ev.stage);
    const mult = stageDifficultyMultiplier(ev.stage);
    const stageMax = base * mult;
    const total = ev.totalMs || stageTimeLimitSeconds(ev.stage) * 1000;
    const remaining = Math.max(0, Math.min(ev.remainingMs || 0, total));
    const bonus = Math.round(stageMax * SCORING.speedBonusRatio * (total > 0 ? remaining / total : 0));
    return acc + Math.round(stageMax + bonus);
  }, 0);
  // مكافأة الإكمال المثالي
  const allCorrect = events.length > 0 && events.every((ev) => ev && ev.correct);
  if (allCorrect) sum += SCORING.perfectRunBonus || 0;
  return sum;
}

export function secondsFromEvents(stageResults) {
  return (stageResults || []).reduce((sum, ev) => {
    const total = (ev && ev.totalMs) || stageTimeLimitSeconds((ev && ev.stage) || 1) * 1000;
    const elapsed = ev && ev.elapsedMs != null ? ev.elapsedMs : total;
    return sum + Math.max(0, Math.min(elapsed, total));
  }, 0) / 1000;
}

export function maxPossibleScore() {
  let total = 0;
  for (const st of Object.keys(SCORING.basePoints)) {
    const base = stageBasePoints(Number(st));
    const mult = stageDifficultyMultiplier(Number(st));
    total += Math.round(base * mult) + Math.round(base * mult * SCORING.speedBonusRatio);
  }
  return total + (SCORING.perfectRunBonus || 0);
}

/* ─── رسالة حسب مستوى النتيجة (قابلة للتعديل من config) ─── */
export function resultMessage(score, maxScore) {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  return RESULT_MESSAGES.find((m) => ratio >= m.minRatio) || RESULT_MESSAGES[RESULT_MESSAGES.length - 1];
}

export function tierOf(score, maxScore) {
  return resultMessage(score, maxScore).tier;
}

/* ─── ترتيب: نقاط تنازليًا ثم زمن تصاعديًا لكسر التعادل ─── */
export function sortLeaderboard(entries) {
  return [...entries].sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) return b.score - a.score;
    return (a.total_seconds || a.seconds || 0) - (b.total_seconds || b.seconds || 0);
  });
}

export function rankEntries(entries) {
  const sorted = sortLeaderboard(entries);
  return sorted.map((e, i) => ({ ...e, rank: i + 1 }));
}
