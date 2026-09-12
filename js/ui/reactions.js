/* Reactions — تختار عشوائيًا دون تكرار متتالي */

import { REACTIONS } from '../config.js';
import { pickRandom } from '../core/dice.js';

let lastCorrect = '';
let lastWrong = '';

function pick(pool, last) {
  let candidates = pool.filter((r) => r !== last);
  if (!candidates.length) candidates = pool;
  const chosen = pickRandom(candidates);
  return chosen;
}

export function pickCorrect() {
  lastCorrect = pick(REACTIONS.correct, lastCorrect);
  return lastCorrect;
}

export function pickWrong() {
  lastWrong = pick(REACTIONS.wrong, lastWrong);
  return lastWrong;
}

export function pickIntro() {
  return pickRandom(REACTIONS.intro);
}