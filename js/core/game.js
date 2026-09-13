/*
  جلسة اللعبة — نموذج دولة نقي بدون DOM (قابل للاختبار)
  يختار الألغاز، يحسب النقاط والزمن، ويُسجل النتائج.
  يدعم 11 نوع سؤال: mc, decision, whatWould, findError, order,
  match, calc, scenario, truefalse, word, visual.
*/

import { QUESTIONS } from '../data/questions.js';
import { SCORING, GAME } from '../config.js';
import { pickRandom } from './dice.js';
import { answerScore, stageBasePoints, stageTimeLimitSeconds } from './scoring.js';
import { nameKey } from './validation.js';

export class GameSession {
  constructor(name) {
    this.name = name;
    this.nameKey = nameKey(name);
    this.stages = [];      // الألغاز المختارة
    this.results = [];     // نتائج لكل سؤال
    this.startedAt = Date.now();
  }

  /* يختار عشوائيًا لغزًا واحدًا لكل مرحلة */
  pickQuestions() {
    const chosen = [];
    for (let stage = 1; stage <= GAME.stagesCount; stage++) {
      const pool = QUESTIONS[stage] || [];
      chosen.push(pickRandom(pool));
    }
    this.stages = chosen;
    return chosen;
  }

  stageQuestion(index) {
    return this.stages[index] || null;
  }

  /* الزمن المخصص لكل سؤال (مع override لكل سؤال) */
  stageTimeLimitMs(index) {
    const q = this.stages[index];
    if (q && q.timeoutMs) return q.timeoutMs;
    return stageTimeLimitSeconds(index + 1) * 1000;
  }

  record(index, patch) {
    if (!this.results[index]) this.results[index] = {};
    Object.assign(this.results[index], patch);
  }

  /* تقييم إجابة حسب نوع اللغز — يعيد {correct, answerIndex/text}
     الـ "selectedIndex" هنا معناه ترميز عام للإجابة:
       - mc/decision/whatWould/scenario/findError: index الخيار
       - match: عدد الأزواج الصحيحة
       - order: هل الترتيب صحيح (1/0)
       - calc: 1 إذا الإجابة ضمن tolerance
       - truefalse: 1 لـ agree, 0 لـ reject
       - word: 1 إذا الكلمة المكتوبة = target (مطابقة بعد تنظيف)
       - visual: index العنصر
  */
  evaluateAnswer(q, selected) {
    if (!q) return { correct: false };

    switch (q.type) {
      case 'visual': {
        const answerIndex = q.scene.items.findIndex((it) => it.isOdd);
        return { correct: Number(selected) === answerIndex, answerIndex };
      }
      case 'mc':
      case 'decision':
      case 'whatWould':
      case 'scenario':
        return { correct: Number(selected) === q.answerIndex, answerIndex: q.answerIndex };

      case 'findError':
        return { correct: selected === q.correctId, answerId: q.correctId };

      case 'truefalse':
        return { correct: selected === q.correctAnswer, answerText: q.correctAnswer };

      case 'order': {
        const order = Array.isArray(selected) ? selected : [];
        const correct = order.length === q.correctOrder.length
          && order.every((id, i) => id === q.correctOrder[i]);
        return { correct, answerOrder: q.correctOrder };
      }

      case 'match': {
        /* selected = { pairId: defId } */
        const map = selected || {};
        let correctPairs = 0;
        const total = q.pairs.length;
        for (const p of q.pairs) {
          if (map[p.id] === p.id) correctPairs++;
        }
        return { correct: correctPairs === total, correctPairs, total };
      }

      case 'calc': {
        const num = Number(selected);
        const tol = q.tolerance != null ? q.tolerance : 0;
        const correct = !Number.isNaN(num) && Math.abs(num - Number(q.correctAnswer)) <= tol;
        return { correct, expected: q.correctAnswer };
      }

      case 'word': {
        const cleaned = String(selected || '').trim().replace(/\s+/g, '').toLowerCase();
        const target = String(q.target || '').trim().replace(/\s+/g, '').toLowerCase();
        return { correct: cleaned === target, expected: q.target };
      }

      default:
        return { correct: false };
    }
  }

  /* يحل إجابة سؤال ويحدّث النقاط — selected حسب نوع اللغز */
  resolveAnswer(index, selected, remainingMs, totalMs, elapsedMs) {
    const q = this.stages[index];
    if (!q) return null;
    const ev = this.evaluateAnswer(q, selected);
    const points = answerScore(index + 1, ev.correct, remainingMs, totalMs, q.difficulty || 1);

    this.record(index, {
      stage: index + 1,
      qid: q.id,
      type: q.type,
      difficulty: q.difficulty || 1,
      correct: ev.correct,
      selected,
      answerIndex: ev.answerIndex,
      answerId: ev.answerId,
      answerText: ev.answerText,
      answerOrder: ev.answerOrder,
      correctPairs: ev.correctPairs,
      totalPairs: ev.total,
      expected: ev.expected,
      points,
      remainingMs,
      totalMs,
      elapsedMs,
    });

    // حماية: لا يتجاوز الحد النظري
    const stageMax = stageBasePoints(index + 1)
      + Math.round(stageBasePoints(index + 1) * SCORING.speedBonusRatio);
    if (this.results[index].points > stageMax) this.results[index].points = stageBasePoints(index + 1);

    return this.results[index];
  }

  resolveTimeout(index, totalMs) {
    return this.resolveAnswer(index, -1, 0, totalMs, totalMs);
  }

  totalScore() {
    let s = this.results.reduce((sum, r) => sum + (r ? r.points || 0 : 0), 0);
    // مكافأة الإكمال المثالي
    const allCorrect = this.results.length === GAME.stagesCount
      && this.results.every((r) => r && r.correct);
    if (allCorrect) s += SCORING.perfectRunBonus || 0;
    return s;
  }

  totalSeconds() {
    return this.results.reduce((s, r) => s + ((r && r.elapsedMs) || 0), 0) / 1000;
  }

  correctCount() {
    return this.results.filter((r) => r && r.correct).length;
  }

  toPayload() {
    return {
      name: this.name,
      score: this.totalScore(),
      total_seconds: this.totalSeconds(),
      stage_results: this.results.map((r) => ({
        stage: r.stage, qid: r.qid, type: r.type, difficulty: r.difficulty,
        correct: r.correct, points: r.points, selected: r.selected,
        answerIndex: r.answerIndex, answerId: r.answerId,
        answerText: r.answerText, answerOrder: r.answerOrder,
        correctPairs: r.correctPairs, totalPairs: r.totalPairs,
        expected: r.expected,
        remainingMs: r.remainingMs, totalMs: r.totalMs, elapsedMs: r.elapsedMs,
      })),
    };
  }
}
