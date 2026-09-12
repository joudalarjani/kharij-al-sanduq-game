/*
  جلسة اللعبة — نموذج دولة نقي بدون DOM (قابل للاختبار)
  يختار الألغاز، يحسب النقاط والزمن، ويُسجل النتائج.
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
    this.stages = [];      // الألغاز المختارة (سؤال واحد لكل مرحلة)
    this.results = [];     // نتائج لكل مرحلة
    this.startedAt = Date.now();
  }

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

  stageTimeLimitMs(index) {
    const q = this.stages[index];
    return (q && q.timeoutMs ? q.timeoutMs : stageTimeLimitSeconds(index + 1) * 1000);
  }

  record(index, patch) {
    if (!this.results[index]) this.results[index] = {};
    Object.assign(this.results[index], patch);
  }

  resolveAnswer(index, selectedIndex, remainingMs, totalMs, elapsedMs) {
    const q = this.stages[index];
    if (!q) return null;
    const answerIndex = q.type === 'visual'
      ? q.scene.items.findIndex((it) => it.isOdd)
      : q.answerIndex;
    const correct = selectedIndex >= 0 && selectedIndex === answerIndex;
    const points = answerScore(index + 1, correct, remainingMs, totalMs);
    this.record(index, {
      stage: index + 1,
      qid: q.id,
      type: q.type,
      correct,
      selectedIndex: correct ? selectedIndex : -1,
      points,
      remainingMs,
      totalMs,
      elapsedMs,
    });
    // إلغاء أي زيادة عن الحد (حماية مضاعفة)
    if (this.results[index].points > stageBasePoints(index + 1) + stageBasePoints(index + 1) * SCORING.speedBonusRatio) {
      this.results[index].points = stageBasePoints(index + 1);
    }
    return this.results[index];
  }

  resolveTimeout(index, totalMs) {
    return this.resolveAnswer(index, -1, 0, totalMs, totalMs);
  }

  totalScore() {
    return this.results.reduce((s, r) => s + (r ? r.points || 0 : 0), 0);
  }

  totalSeconds() {
    return this.results.reduce((s, r) => s + ((r && r.elapsedMs) || 0), 0) / 1000;
  }

  toPayload() {
    return {
      name: this.name,
      score: this.totalScore(),
      total_seconds: this.totalSeconds(),
      stage_results: this.results.map((r) => ({
        stage: r.stage, qid: r.qid, type: r.type,
        correct: r.correct, points: r.points, selectedIndex: r.selectedIndex,
        remainingMs: r.remainingMs, totalMs: r.totalMs, elapsedMs: r.elapsedMs,
      })),
    };
  }
}