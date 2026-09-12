/*
  ══════════════════════════════════════════════════════════════
  نظام النقاط — منطق نقي قابل للاختبار ولا يعتمد على DOM
  النقاط = إجابة صحيحة فقط
  البونص = basePoints × speedBonusRatio × (المتبقي ÷ الكلي)
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
  return SCORING.timeouts[stage] || 10;
}

export function answerScore(stage, correct, remainingMs, totalMs) {
  if (!correct) return 0;
  const base = stageBasePoints(stage);
  if (totalMs <= 0) return base;
  const ratio = clamp(remainingMs, 0, totalMs) / totalMs;
  const bonus = Math.round(base * SCORING.speedBonusRatio * ratio);
  return base + bonus;
}

export function computeTotalScore(stageResults) {
  return (stageResults || []).reduce((sum, s) => sum + (s ? s.points || 0 : 0), 0);
}

export function computeTotalSeconds(stageResults) {
  return (stageResults || []).reduce((sum, s) => sum + (s ? s.elapsedMs || 0 : 0), 0) / 1000;
}

/* إعادة حساب مطلقة من أحداث اللعب (لا تعتمد على points المرسلة) —
   تُستخدم في الوضع التجريبي المحلي لتطابق منطق الخادم تمامًا. */
export function scoreFromEvents(stageResults) {
  return (stageResults || []).reduce((sum, ev) => {
    if (!ev || !ev.correct) return sum;
    const base = stageBasePoints(ev.stage);
    const total = ev.totalMs || stageTimeLimitSeconds(ev.stage) * 1000;
    const remaining = Math.max(0, Math.min(ev.remainingMs || 0, total));
    const bonus = Math.round(base * SCORING.speedBonusRatio * (total > 0 ? remaining / total : 0));
    return sum + base + bonus;
  }, 0);
}

export function secondsFromEvents(stageResults) {
  return (stageResults || []).reduce((sum, ev) => {
    const total = (ev && ev.totalMs) || stageTimeLimitSeconds((ev && ev.stage) || 1) * 1000;
    const elapsed = ev && ev.elapsedMs != null ? ev.elapsedMs : total;
    return sum + Math.max(0, Math.min(elapsed, total));
  }, 0) / 1000;
}

export function maxPossibleScore() {
  return Object.keys(SCORING.basePoints).reduce((sum, st) => {
    const base = stageBasePoints(Number(st));
    return sum + base + Math.round(base * SCORING.speedBonusRatio);
  }, 0);
}

/* ─── رسالة حسب مستوى النتيجة (قابلة للتعديل من config) ─── */
export function resultMessage(score, maxScore) {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  return RESULT_MESSAGES.find((m) => ratio >= m.minRatio) || RESULT_MESSAGES[RESULT_MESSAGES.length - 1];
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