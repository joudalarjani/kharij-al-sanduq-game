/*
  ══════════════════════════════════════════════════════════════
  منسّق أنواع الألغاز — يختار المُناسب حسب نوع السؤال
  كل مُلغز يُرجع:
    { render(q): HTML string
      bind(q, callbacks): يربط الأحداث
      revealCorrect(q, opts): يُظهر الإجابة الصحيحة بعد الحل
      grade(q): يعيد {selected, ...} من حالة الـ DOM }
  ══════════════════════════════════════════════════════════════
*/

import { renderMC, bindMC, revealMC, gradeMC } from './mc.js';
import { renderDecision, bindDecision, revealDecision, gradeDecision } from './decision.js';
import { renderWhatWould, bindWhatWould, revealWhatWould, gradeWhatWould } from './whatWould.js';
import { renderFindError, bindFindError, revealFindError, gradeFindError } from './findError.js';
import { renderOrder, bindOrder, revealOrder, gradeOrder } from './order.js';
import { renderMatch, bindMatch, revealMatch, gradeMatch } from './match.js';
import { renderCalc, bindCalc, revealCalc, gradeCalc } from './calc.js';
import { renderScenario, bindScenario, revealScenario, gradeScenario } from './scenario.js';
import { renderTrueFalse, bindTrueFalse, revealTrueFalse, gradeTrueFalse } from './truefalse.js';
import { renderWord, bindWord, revealWord, gradeWord } from './word.js';
import { renderVisual, bindVisual, revealVisual, gradeVisual } from './visual.js';

const REGISTRY = {
  mc:         { render: renderMC,        bind: bindMC,        reveal: revealMC,        grade: gradeMC },
  decision:   { render: renderDecision,  bind: bindDecision,  reveal: revealDecision,  grade: gradeDecision },
  whatWould:  { render: renderWhatWould, bind: bindWhatWould, reveal: revealWhatWould, grade: gradeWhatWould },
  findError:  { render: renderFindError, bind: bindFindError, reveal: revealFindError, grade: gradeFindError },
  order:      { render: renderOrder,     bind: bindOrder,     reveal: revealOrder,     grade: gradeOrder },
  match:      { render: renderMatch,     bind: bindMatch,     reveal: revealMatch,     grade: gradeMatch },
  calc:       { render: renderCalc,      bind: bindCalc,      reveal: revealCalc,      grade: gradeCalc },
  scenario:   { render: renderScenario,  bind: bindScenario,  reveal: revealScenario,  grade: gradeScenario },
  truefalse:  { render: renderTrueFalse, bind: bindTrueFalse, reveal: revealTrueFalse, grade: gradeTrueFalse },
  word:       { render: renderWord,      bind: bindWord,      reveal: revealWord,      grade: gradeWord },
  visual:     { render: renderVisual,    bind: bindVisual,    reveal: revealVisual,    grade: gradeVisual },
};

export function getPuzzleRenderer(type) {
  return REGISTRY[type] || REGISTRY.mc;
}

export function renderPuzzle(q) {
  const r = getPuzzleRenderer(q.type);
  return r.render(q);
}

export function bindPuzzle(q, root, onPick) {
  const r = getPuzzleRenderer(q.type);
  return r.bind(q, root, onPick);
}

export function revealPuzzle(q, root, state) {
  const r = getPuzzleRenderer(q.type);
  return r.reveal(q, root, state);
}

export function gradePuzzle(q, root) {
  const r = getPuzzleRenderer(q.type);
  return r.grade(q, root);
}

/* ─── اسم نوع مقروء بالعربية ─── */
export function typeLabel(type) {
  return {
    mc:        'اختيار من متعدد',
    decision:  'اتخاذ قرار',
    whatWould: 'وش تسوي؟',
    findError: 'اكتشف الخطأ',
    order:     'ترتيب الخطوات',
    match:     'مطابقة',
    calc:      'لغز حسابي',
    scenario:  'سيناريو استثماري',
    truefalse: 'موافق أو ترفض',
    word:      'لغز الكلمات',
    visual:    'لغز بصري',
  }[type] || 'تحدي';
}
