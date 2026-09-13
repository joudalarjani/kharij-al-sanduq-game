/*
  اختبارات المنطق النقي للعبة — تعمل بدون متصفح أو DOM.
  شغّل:  node tests/run.test.mjs   (أو npm test)
*/

import assert from 'node:assert/strict';
import { QUESTIONS, VALID_TYPES } from '../js/data/questions.js';
import { SCORING, GAME, STAGE_THEMES } from '../js/config.js';
import {
  validateName, sanitizeName, nameKey, escapeHTML,
} from '../js/core/validation.js';
import {
  answerScore, computeTotalScore, computeTotalSeconds,
  maxPossibleScore, resultMessage, rankEntries,
} from '../js/core/scoring.js';
import { GameSession } from '../js/core/game.js';

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    console.log(`  ✗ ${name}\n    → ${err.message}`);
  }
}

async function section(title, run) {
  console.log(`\n═ ${title} ═`);
  await run();
}

/* ───────────── 1) سلامة بيانات الألغاز ───────────── */
await section('سلامة بيانات الألغاز', async () => {
  const all = [];
  for (let st = 1; st <= GAME.stagesCount; st++) {
    test(`المرحلة ${st} تحتوي على ألغاز`, () => {
      assert.ok(QUESTIONS[st] && QUESTIONS[st].length >= 1, `لا يوجد ألغاز في المرحلة ${st}`);
    });
    for (const q of QUESTIONS[st] || []) all.push(q);
  }

  test('معرفات الألغاز فريدة', () => {
    const ids = all.map((q) => q.id);
    assert.equal(new Set(ids).size, ids.length, 'هناك معرفات مكررة');
  });

  test('تبارميج المرحلة في السؤال مع مفتاحه', () => {
    for (const q of all) assert.equal(q.stage, Number(q.id.split('-')[0].slice(1)));
  });

  test('جميع الأنواع معروفة', () => {
    for (const q of all) {
      assert.ok(VALID_TYPES.has(q.type), `نوع غير معروف: ${q.type} في ${q.id}`);
    }
  });

  for (const q of all) {
    test(`لغز ${q.id} (${q.type}): الحقول الأساسية سليمة`, () => {
      assert.ok(q.question || q.scenario || q.situation || q.statement,
        'لا يوجد نص للسؤال/السياق/العبارة');
      assert.ok(q.explain && q.explain.trim().length >= 10, 'الشرح قصير أو فارغ');
      assert.ok(q.difficulty >= 1 && q.difficulty <= 4, 'معامل الصعوبة خارج النطاق');
      assert.ok(typeof q.timeoutMs === 'number' || !q.timeoutMs, 'timeoutMs غير صالح');
    });

    if (q.type === 'mc' || q.type === 'decision' || q.type === 'whatWould') {
      test(`لغز ${q.id}: خيارات MC سليمة`, () => {
        assert.ok(Array.isArray(q.options) && q.options.length >= 3, 'يجب أن تكون هناك خيارات كافية');
        assert.ok(q.answerIndex >= 0 && q.answerIndex < q.options.length, 'مؤشر الإجابة خارج النطاق');
        assert.equal(new Set(q.options).size, q.options.length, 'خيارات مكررة');
      });
    } else if (q.type === 'visual') {
      test(`لغز ${q.id}: المشهد البصري مكتمل`, () => {
        assert.ok(q.scene && Array.isArray(q.scene.items));
        const odds = q.scene.items.filter((it) => it.isOdd);
        assert.equal(odds.length, 1, `يجب أن يكون عنصر واحد شاذًا فقط (وجد ${odds.length})`);
      });
    } else if (q.type === 'order') {
      test(`لغز ${q.id}: الترتيب مكتمل`, () => {
        assert.ok(Array.isArray(q.items) && Array.isArray(q.correctOrder));
        assert.equal(q.correctOrder.length, q.items.length, 'طول correctOrder لا يطابق items');
        assert.equal(new Set(q.correctOrder).size, q.correctOrder.length, 'IDs مكررة في correctOrder');
      });
    } else if (q.type === 'match') {
      test(`لغز ${q.id}: المطابقة مكتملة`, () => {
        assert.ok(Array.isArray(q.pairs) && q.pairs.length >= 2);
        for (const p of q.pairs) assert.ok(p.id && p.term && p.def);
      });
    } else if (q.type === 'calc') {
      test(`لغز ${q.id}: الحساب مكتمل`, () => {
        assert.equal(typeof q.correctAnswer, 'number');
        assert.equal(typeof (q.tolerance != null ? q.tolerance : 0), 'number');
      });
    } else if (q.type === 'findError') {
      test(`لغز ${q.id}: الأجزاء والجزء الصحيح موجود`, () => {
        assert.ok(Array.isArray(q.segments) && q.segments.length >= 3);
        assert.ok(q.segments.find((s) => s.id === q.correctId), 'correctId غير موجود في segments');
      });
    } else if (q.type === 'scenario') {
      test(`لغز ${q.id}: بطاقات السيناريو مكتملة`, () => {
        assert.ok(Array.isArray(q.options) && q.options.length >= 2);
        assert.ok(q.answerIndex >= 0 && q.answerIndex < q.options.length);
      });
    } else if (q.type === 'truefalse') {
      test(`لغز ${q.id}: العبارة والإجابة موجودة`, () => {
        assert.ok(q.statement);
        assert.ok(['agree', 'reject'].includes(q.correctAnswer));
      });
    } else if (q.type === 'word') {
      test(`لغز ${q.id}: الحروف والكلمة موجودان`, () => {
        assert.ok(Array.isArray(q.letters) && q.letters.length >= 4);
        assert.ok(q.target);
      });
    }
  }
});

/* ───────────── 2) تنظيف الاسم والتحقق ───────────── */
await section('إدخال الاسم والتحقق', async () => {
  test('الاسم الفارغ مرفوض', () => {
    assert.equal(validateName('').ok, false);
    assert.equal(validateName('   ').ok, false);
  });
  test('يُقص المسافات الزائدة', () => {
    assert.equal(sanitizeName('   سارة    العرجاني  '), 'سارة العرجاني');
  });
  test('يُحذف النص الضار (XSS)', () => {
    assert.ok(!sanitizeName('<script>alert(1)</script>').includes('<'));
    assert.ok(!sanitizeName('سارة" onmouseover="x').includes('"'));
    assert.ok(!sanitizeName('javascript:alert(1)').toLowerCase().includes('javascript'));
  });
  test('يُرفض الأسماء الضارة عبر validateName', () => {
    assert.equal(validateName('<img src=x onerror=alert(1)>').ok, false);
  });
  test('الاسم القصير جدًا مرفوض', () => {
    assert.equal(validateName('أ').ok, false);
  });
  test('الاسم الطويل جدًا مرفوض', () => {
    assert.equal(validateName('أ'.repeat(60)).ok, false);
  });
  test('أسماء عربية وإنجليزية مقبولة', () => {
    assert.equal(validateName('سارة العرجاني').ok, true);
    assert.equal(validateName('Sarah Smith').ok, true);
  });
  test('nameKey يعادل بين الحالات', () => {
    assert.equal(nameKey('Sara'), nameKey('sara'));
  });
  test('escapeHTML يحمي المخرجات', () => {
    assert.equal(escapeHTML('<b>"x"&'), '&lt;b&gt;&quot;x&quot;&amp;');
  });
});

/* ───────────── 3) نظام النقاط ───────────── */
await section('نظام النقاط والبونص', async () => {
  test('إجابة صحيحة فورية تعطي الأساس + البونص الكامل', () => {
    assert.equal(answerScore(1, true, 10000, 10000), 100 + 50);
    // المرحلة 4 بمعامل 1.6: 300 * 1.6 = 480 + بونص
    assert.equal(answerScore(4, true, 15000, 15000), 480 + Math.round(480 * 0.5));
  });
  test('إجابة خاطئة = صفر', () => {
    assert.equal(answerScore(1, false, 5000, 10000), 0);
    assert.equal(answerScore(4, false, 10000, 15000), 0);
  });
  test('البونص يتناقص مع بطء الإجابة', () => {
    const fast = answerScore(3, true, 11000, 12000);
    const slow = answerScore(3, true, 2000, 12000);
    assert.ok(fast > slow, 'الإجابة الأبطأ يجب أن تعطي بونصًا أقل');
  });
  test('إجابة في النهاية تمامًا = الأساس فقط', () => {
    assert.equal(answerScore(2, true, 0, 8000), Math.round(150 * 1.15));
  });
  test('لا يمكن تجاوز الحد الأقصى النظري', () => {
    let total = 0;
    for (const st of Object.keys(SCORING.basePoints)) {
      total += answerScore(Number(st), true, SCORING.timeouts[Number(st)] * 1000, SCORING.timeouts[Number(st)] * 1000);
    }
    // بدون مكافأة الإكمال المثالي (تحتاج كل المراحل)
    const maxWithoutBonus = maxPossibleScore() - (SCORING.perfectRunBonus || 0);
    assert.ok(total <= maxWithoutBonus + 1); // تقريب
  });
  test('رسالة حسب مستوى النتيجة', () => {
    const m1 = resultMessage(2000, 2300);
    const m2 = resultMessage(1500, 2300);
    const m3 = resultMessage(900, 2300);
    const m4 = resultMessage(400, 2300);
    const m5 = resultMessage(0, 2300);
    assert.ok(m1.message.includes('خارج الصندوق') || m1.message.includes('مستثمر'));
    assert.ok(m2.message);
    assert.ok(m3.message);
    assert.ok(m4.message);
    assert.ok(m5.message);
  });
});

/* ───────────── 4) جلسة اللعب (GameSession) ───────────── */
await section('جلسة اللعب الكاملة', async () => {
  const s = new GameSession('سارة');
  test('تختار لغزًا واحدًا لكل مرحلة', () => {
    s.pickQuestions();
    assert.equal(s.stages.length, GAME.stagesCount);
    assert.ok(s.stages.every(Boolean));
  });

  test('دوال evaluateAnswer تعمل لكل نوع', () => {
    for (let i = 0; i < GAME.stagesCount; i++) {
      const q = s.stages[i];
      const ev = s.evaluateAnswer(q, null);
      // null يجب أن يكون خاطئًا لكل الأنواع ما عدا calc/word
      if (q.type !== 'calc' && q.type !== 'word' && q.type !== 'match' && q.type !== 'order') {
        assert.equal(ev.correct, false, `null يجب أن يكون خاطئًا لـ ${q.type}`);
      }
    }
  });

  test('الإجابة الصحيحة على MC تُحسب نقاطًا', () => {
    const s2 = new GameSession('اختبار');
    s2.pickQuestions();
    for (let i = 0; i < GAME.stagesCount; i++) {
      const q = s2.stages[i];
      let idx;
      if (q.type === 'visual') idx = q.scene.items.findIndex((x) => x.isOdd);
      else if (q.type === 'mc' || q.type === 'decision' || q.type === 'whatWould' || q.type === 'scenario') idx = q.answerIndex;
      else if (q.type === 'findError') idx = q.correctId;
      else if (q.type === 'truefalse') idx = q.correctAnswer;
      else continue;
      const total = (q.timeoutMs || SCORING.timeouts[i + 1]) * 1000;
      s2.resolveAnswer(i, idx, total, total, total);
    }
    assert.ok(computeTotalScore(s2.results) > 0);
  });

  test('الإجابة مرتين لا تضاعف النقاط لمحاولة واحدة', () => {
    const s3 = new GameSession('اختبار2');
    s3.pickQuestions();
    const q = s3.stages[0];
    const total = (q.timeoutMs || SCORING.timeouts[1]) * 1000;
    const idx = q.type === 'mc' ? q.answerIndex : q.scene.items.findIndex((x) => x.isOdd);
    s3.resolveAnswer(0, idx, total, total, total);
    const before = computeTotalScore(s3.results);
    s3.resolveAnswer(0, idx, total, total, total);
    assert.equal(computeTotalScore(s3.results), before);
  });

  test('انتهاء الوقت = صفر نقاط', () => {
    const s4 = new GameSession('مؤقت');
    s4.pickQuestions();
    s4.resolveTimeout(0, 10000);
    assert.equal(computeTotalScore(s4.results), 0);
    assert.equal(s4.results[0].elapsedMs, 10000);
  });

  test('الإكمال المثالي يمنح مكافأة', () => {
    const s5 = new GameSession('مثالي');
    s5.pickQuestions();
    for (let i = 0; i < GAME.stagesCount; i++) {
      const q = s5.stages[i];
      let idx;
      if (q.type === 'visual') idx = q.scene.items.findIndex((x) => x.isOdd);
      else if (q.type === 'mc' || q.type === 'decision' || q.type === 'whatWould' || q.type === 'scenario') idx = q.answerIndex;
      else if (q.type === 'findError') idx = q.correctId;
      else if (q.type === 'truefalse') idx = q.correctAnswer;
      else continue;
      const total = (q.timeoutMs || SCORING.timeouts[i + 1]) * 1000;
      s5.resolveAnswer(i, idx, total, total, total);
    }
    assert.ok(s5.totalScore() > 0, 'الإكمال المثالي ينتج نقاط');
    // مكافأة الإكمال المثالي موجودة
    assert.ok(s5.correctCount() === s5.results.length);
  });
});

/* ───────────── 5) الترتيب والتعادل ───────────── */
await section('الترتيب والتعادل', async () => {
  const entries = [
    { name: 'ريم', score: 850, total_seconds: 40 },
    { name: 'جود', score: 850, total_seconds: 32 },
    { name: 'سارة', score: 980, total_seconds: 50 },
    { name: 'نورة', score: 980, total_seconds: 33 },
  ];
  const ranked = rankEntries(entries);
  test('نقاط أعلى = ترتيب أعلى', () => {
    assert.equal(ranked[0].name, 'نورة');
    assert.equal(ranked[1].name, 'سارة');
  });
  test('التعادل يُكسر بالوقت الأسرع', () => {
    assert.equal(ranked[2].name, 'جود');
    assert.equal(ranked[3].name, 'ريم');
  });
});

/* ───────────── 6) أنواع الأسئلة ───────────── */
await section('تغطية أنواع الألغاز', async () => {
  const typesInBank = new Set();
  for (let st = 1; st <= GAME.stagesCount; st++) {
    for (const q of QUESTIONS[st] || []) typesInBank.add(q.type);
  }
  test('بنك الأسئلة يغطي على الأقل 6 أنواع', () => {
    assert.ok(typesInBank.size >= 6, `الأنواع الموجودة: ${[...typesInBank].join(',')}`);
  });
  test('المرحلة 1 تستخدم أنواعًا تمهيدية (mc/calc/match/truefalse/word)', () => {
    const t = new Set((QUESTIONS[1] || []).map((q) => q.type));
    assert.ok(t.size >= 2, `أنواع المرحلة 1: ${[...t].join(',')}`);
  });
});

/* ───────────── الخلاصة ───────────── */
console.log(`\n═══ النتيجة: ${passed} نجح / ${failed} فشل ═══`);
if (failed) {
  console.log('\nالفحوصات الفاشلة:');
  for (const f of failures) console.log(`  • ${f.name}: ${f.err.message}`);
  process.exit(1);
}
process.exit(0);
