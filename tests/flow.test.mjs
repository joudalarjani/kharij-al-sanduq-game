/*
  اختبار تدفق قاعدة البيانات (الوضع التجريبي المحلي) — يتطلب محاكاة localStorage.
  يشمل: الحفظ، أفضل نتيجة للاسم، كسر التعادل، حد المحاولات، التحقق من التقييم.
*/

import assert from 'node:assert/strict';
import { GameSession } from '../js/core/game.js';
import { SCORING } from '../js/config.js';

/* محاكاة localStorage */
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const { DB } = await import('../js/db/database.js');

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}\n    → ${err.message}`);
  }
}

function playPerfect(name) {
  const s = new GameSession(name);
  s.pickQuestions();
  for (let i = 0; i < 4; i++) {
    const q = s.stageQuestion(i);
    const total = (q.timeoutMs || SCORING.timeouts[i + 1]) * 1000;
    let correct;
    switch (q.type) {
      case 'visual':       correct = q.scene.items.findIndex((x) => x.isOdd); break;
      case 'mc':
      case 'decision':
      case 'whatWould':
      case 'scenario':     correct = q.answerIndex; break;
      case 'findError':    correct = q.correctId; break;
      case 'truefalse':    correct = q.correctAnswer; break;
      case 'word':         correct = q.target; break;
      case 'calc':         correct = q.correctAnswer; break;
      case 'order':        correct = q.correctOrder.slice(); break;
      case 'match': {
        const pairs = {};
        for (const p of q.pairs) pairs[p.id] = p.id;
        correct = pairs;
        break;
      }
      default:            correct = null;
    }
    s.resolveAnswer(i, correct, total, total, total);
  }
  return s.toPayload();
}

// مجموع نقاط الأساس × معامل الصعوبة (بدون بونص السرعة)
function basesSum() {
  let s = 0;
  for (let st = 1; st <= 4; st++) {
    s += SCORING.basePoints[st] * SCORING.difficultyMultiplier[st];
  }
  return Math.round(s);
}
// مجموع النقاط القصوى (مع البونص الكامل + مكافأة الإكمال)
function perfectSum() {
  return basesSum() + Math.round(basesSum() * SCORING.speedBonusRatio) + (SCORING.perfectRunBonus || 0);
}

async function play(name, msDelay = 0) {
  const p = playPerfect(name);
  const withDelay = {
    ...p,
    stage_results: p.stage_results.map((r, i) => ({
      ...r,
      elapsedMs: r.elapsedMs + msDelay * (i + 1),
      remainingMs: Math.max(0, r.remainingMs - msDelay * (i + 1)),
    })),
  };
  return DB.submitGame(withDelay);
}

console.log('═ تدفق قاعدة البيانات (وضع محلي) ═');

await test(`تسجيل نتيجة صحيحة كاملة = ${perfectSum()} والمركز الأول`, async () => {
  const res = await play('سارة');
  assert.equal(res.ok, true);
  assert.equal(res.score, perfectSum());
  assert.equal(res.rank, 1);
  assert.equal(res.total, 1);
});

await test('إعادة المحاولة بنتيجة أقل لا تكسر النتيجة الأفضل', async () => {
  // محاولة أبطأ (bonus أقل) لنفس الاسم
  const p = playPerfect('سارة');
  p.stage_results = p.stage_results.map((r) => ({ ...r, remainingMs: 0, elapsedMs: r.totalMs }));
  const slowScore = basesSum();
  const slow = { ...p, score: slowScore };
  const res = await DB.submitGame(slow);
  const lb = await DB.getLeaderboard();
  assert.equal(res.rank, 1);
  assert.equal(res.score, slowScore); // بدون بونص
  assert.equal(lb.entries[0].name, 'سارة');
  assert.equal(lb.entries[0].score, perfectSum()); // الأفضل يبقى
});

await test('الترتيب يراعي النقاط ثم كسر التعادل بالوقت', async () => {
  // نفس النقاط (كل اللاعبين كاملون) — الزمن يفصلهم: أسرع = أعلى
  await play('حنان', 100);
  await play('أمل', 300);
  await play('بسمة', 500);
  const lb = await DB.getLeaderboard();
  const byName = (n) => lb.entries.find((e) => e.name === n);
  const h = byName('حنان'), a = byName('أمل'), b = byName('بسمة');
  assert.ok(h && a && b, 'اللاعبون الثلاثة موجودون');
  assert.ok(h.rank < a.rank && a.rank < b.rank, 'الأسرع يتقدم بلا تعادل خاطئ');
});

await test('حد المحاولات: 5 محاولات لكل اسم خلال ساعة يوقف الحفظ', async () => {
  const m = new GameSession('مفرط');
  m.pickQuestions();
  m.resolveAnswer(0, 0, 0, 10000, 10000);
  const payload = { ...m.toPayload(), stage_results: [{ stage: 1, qid: 's1-q1', correct: false, points: 0, remainingMs: 0, elapsedMs: 10000 }] };
  let last;
  for (let i = 0; i < 6; i++) last = await DB.submitGame(payload);
  assert.equal(last.ok, false);
  assert.equal(last.reason, 'rate_limit');
});

await test('تقييم غير صالح مرفوض، وصالح يُحفظ، والتكرار يُرفض (1/يوم)', async () => {
  const bad = await DB.submitFeedback({ name: 'سارة', rating: 9, message: 'x' });
  assert.equal(bad.ok, false);
  const good = await DB.submitFeedback({ name: 'سارة', rating: 5, message: 'تجربة رهيبة 🔥' });
  assert.equal(good.ok, true);
  const dup = await DB.submitFeedback({ name: 'سارة', rating: 4, message: 'مرة ثانية' });
  assert.equal(dup.ok, false); // تقييم واحد في اليوم
});

await test('الاسم يُنقى قبل الحفظ في وضع محلي', async () => {
  const p = playPerfect('<script>alert(1)</script>');
  const res = await DB.submitGame({ ...p, name: '<script>x</script>' });
  const lb = await DB.getLeaderboard();
  const entry = lb.entries.find((e) => e.score === perfectSum() && e.name.includes('<'));
  assert.ok(!entry, 'لا يجب أن يحتوي اسم محفوظ على وسوم');
});

console.log(`\n═ النتيجة: ${passed} نجح / ${failed} فشل ═`);
process.exit(failed ? 1 : 0);