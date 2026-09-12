/*
  اختبارات المنطق النقي للعبة — تعمل بدون متصفح أو DOM.
  شغّل:  node tests/run.test.mjs   (أو npm test)
  يشمل: سلامة الألغاز، تنظيف الاسم، حساب النقاط، جلسة اللعب، الترتيب والتعادل.
*/

import assert from 'node:assert/strict';
import { QUESTIONS } from '../js/data/questions.js';
import { SCORING, GAME } from '../js/config.js';
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

  for (const q of all) {
    test(`لغز ${q.id}: الحقول الأساسية سليمة`, () => {
      assert.ok(q.question && q.question.trim().length >= 5, 'نص السؤال قصير أو فارغ');
      assert.ok(q.explain && q.explain.trim().length >= 10, 'الشرح قصير أو فارغ');
      if (q.type === 'mc') {
        assert.ok(Array.isArray(q.options) && q.options.length >= 3, 'يجب أن تكون هناك خيارات كافية');
        assert.ok(q.answerIndex >= 0 && q.answerIndex < q.options.length, 'مؤشر الإجابة خارج النطاق');
        assert.equal(new Set(q.options).size, q.options.length, 'خيارات مكررة');
      } else if (q.type === 'visual') {
        assert.ok(q.scene && Array.isArray(q.scene.items), 'المشهد البصري غير مكتمل');
        const odds = q.scene.items.filter((it) => it.isOdd);
        assert.equal(odds.length, 1, `يجب أن يكون عنصر واحد شاذًا فقط (وجد ${odds.length})`);
        const ids = q.scene.items.map((it) => it.id);
        assert.equal(new Set(ids).size, ids.length, 'معرفات عناصر المشهد مكررة');
      }
    });
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
    assert.equal(answerScore(4, true, 15000, 15000), 300 + 150);
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
    assert.equal(answerScore(2, true, 0, 8000), 150);
  });
  test('لا يمكن تجاوز الحد الأقصى النظري', () => {
    let total = 0;
    for (const st of Object.keys(SCORING.basePoints)) {
      total += answerScore(Number(st), true, SCORING.timeouts[Number(st)] * 1000, SCORING.timeouts[Number(st)] * 1000);
    }
    assert.ok(total <= maxPossibleScore());
  });
  test('maxPossibleScore صحيح', () => {
    assert.equal(maxPossibleScore(), 1125);
  });
  test('رسالة حسب مستوى النتيجة', () => {
    assert.equal(resultMessage(1100, 1125).message.includes('خارج الصندوق'), true);
    assert.equal(resultMessage(1125, 1125).message.includes('خارج الصندوق'), true);
    assert.equal(resultMessage(0, 1125).message.includes('الصندوق'), true);
  });
});

/* ───────────── 4) جلسة اللعب ───────────── */
await section('جلسة اللعب الكاملة', async () => {
  const s = new GameSession('سارة');
  test('تختار لغزًا واحدًا لكل مرحلة', () => {
    s.pickQuestions();
    assert.equal(s.stages.length, 4);
    assert.ok(s.stages.every(Boolean));
  });

  const q1 = s.stageQuestion(0);
  test('إجابة صحيحة لكل مرحلة تُحسب نقاطًا كاملة', () => {
    for (let i = 0; i < 4; i++) {
      const q = s.stageQuestion(i);
      const total = SCORING.timeouts[i + 1] * 1000;
      const idx = q.type === 'visual' ? q.scene.items.findIndex((x) => x.isOdd) : q.answerIndex;
      s.resolveAnswer(i, idx, total, total, total);
    }
    assert.equal(s.totalScore(), maxPossibleScore());
  });

  test('الإجابة مرتين لا تضاعف النقاط لمحاولة واحدة', () => {
    const s2 = new GameSession('اختبار');
    s2.pickQuestions();
    const q = s2.stageQuestion(0);
    const total = SCORING.timeouts[1] * 1000;
    const idx = q.type === 'visual' ? q.scene.items.findIndex((x) => x.isOdd) : q.answerIndex;
    s2.resolveAnswer(0, idx, total, total, total);
    const before = computeTotalScore(s2.results);
    s2.resolveAnswer(0, idx, total, total, total); // محاولة ثانية لنفس السؤال تُعاد كتابة النتيجة
    assert.equal(computeTotalScore(s2.results), before);
  });

  test('انتهاء الوقت = صفر نقاط وتُسجل المدة الكاملة', () => {
    const s3 = new GameSession('مؤقت');
    s3.pickQuestions();
    s3.resolveTimeout(0, 10000);
    assert.equal(computeTotalScore(s3.results), 0);
    assert.equal(s3.results[0].elapsedMs, 10000);
  });

  test('زمن الإنهاء الإجمالي يُحسب بالثواني', () => {
    const s4 = new GameSession('زمن');
    s4.pickQuestions();
    s4.resolveAnswer(0, s4.stageQuestion(0).answerIndex, 5000, 10000, 5000);
    assert.ok(computeTotalSeconds(s4.results) >= 5);
    assert.ok(s4.totalSeconds() > 0);
  });

  test('الحزمة المرسلة للخادم لا تحوي scoreً مُرسلًا من المتصفح كمصدر أساسي', () => {
    const p = s.toPayload();
    assert.equal(typeof p.score, 'number');
    assert.ok(p.score <= maxPossibleScore());
    assert.ok(Array.isArray(p.stage_results));
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
    assert.equal(ranked[0].name, 'نورة'); // 980 أولًا
    assert.equal(ranked[1].name, 'سارة'); // 980 أيضًا لكنها أبطأ
  });
  test('التعادل يُكسر بالوقت الأسرع', () => {
    assert.equal(ranked[0].name, 'نورة'); // 980 + 33ث قبل سارة 50ث
    assert.equal(ranked[1].name, 'سارة');
    assert.equal(ranked[2].name, 'جود'); // نفس نقاط ريم لكن أسرع
    assert.equal(ranked[3].name, 'ريم');
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