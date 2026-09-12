/*
  اختبار المتصفح الوهمي (jsdom): يقود تدفق المستخدم الحقيقي بالكامل
  عبر DOM حقيقي: الشاشات، المؤقت، الردود، الحفظ، اللوحة، التقييم، إعادة اللعب.
  شغّل: node tests/ui-smoke.mjs
*/

import assert from 'node:assert/strict';
import { JSDOM } from 'file:///C:/Users/jouda/AppData/Local/Temp/opencode/jsdom-test/node_modules/jsdom/lib/api.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, '..');
const html = readFileSync(join(projectRoot, 'index.html'), 'utf8');

/* ═══ بيئة DOM ═══ */
const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'outside-only' });
const { window } = dom;

globalThis.window = window;
globalThis.document = window.document;
try { globalThis.navigator = window.navigator; } catch { Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true }); }
globalThis.localStorage = window.localStorage;
window.matchMedia = () => ({ matches: true, addEventListener() {} });
window.scrollTo = () => {};
window.HTMLElement = window.HTMLElement;

/* تسريع المؤقتات (لعامل 2٪) حتى يجري الاختبار بسرعة مع بقاء السلوك حقيقي */
const nativeSetTimeout = globalThis.setTimeout;
const nativeSetInterval = globalThis.setInterval;
const SCALE = 0.02;
globalThis.setTimeout = (fn, ms, ...a) => nativeSetTimeout(fn, ms * SCALE, ...a);
globalThis.setInterval = (fn, ms, ...a) => nativeSetInterval(fn, Math.max(ms * SCALE, 1), ...a);

const sleep = (ms) => new Promise((r) => nativeSetTimeout(r, ms));

/* ═══ تحميل الوحدات الفعلية ═══ */
await import(`file:///${join(projectRoot, 'js/app.js').replace(/\\/g, '/')}`);

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.log(`  ✗ ${msg}`); }
}
function assertExists(sel, msg) {
  const n = window.document.querySelector(sel);
  ok(!!n, `${msg} (وجد ${n ? 'نعم' : 'لا'})`);
  return n;
}

console.log('═ اختبار تدفق المتصفح الوهمي ═');

/* 1) شاشة البداية نشطة */
await sleep(30);
ok(window.document.getElementById('landingScreen').classList.contains('active'), 'شاشة البداية نشطة');
assertExists('#playerName', 'حقل إدخال الاسم موجود');
assertExists('#startBtn', 'زر ابدأ موجود');

/* 2) الاسم الفارغ يمنع البدء */
window.document.getElementById('playerName').value = '   ';
window.document.getElementById('nameForm').dispatchEvent(new window.Event('submit', { cancelable: true }));
await sleep(20);
ok(window.document.getElementById('landingScreen').classList.contains('active'), 'اسم فارغ: يبقى في شاشة البداية');
ok(window.document.getElementById('nameError').textContent.length > 0, 'تظهر رسالة خطأ للاسم الفارغ');

/* 3) إدخال اسم صالح يبدأ اللعبة */
window.document.getElementById('playerName').value = 'سارة العرجاني';
window.document.getElementById('nameForm').dispatchEvent(new window.Event('submit', { cancelable: true }));
await sleep(120);
ok(window.document.getElementById('gameScreen').classList.contains('active'), 'انتقلت إلى شاشة اللعب');
ok(/المرحلة\s+1\s+من\s+4/.test(window.document.getElementById('gameRoot').textContent), 'تظهر "المرحلة 1 من 4"');
ok(window.document.getElementById('gameRoot').textContent.includes('سرعة البديهة'), 'تظهر المرحلة الأولى');

/* 4) المرور على المراحل الأربعة مع الإجابة والردود */
const stages = [
  { intro: 'سرعة البديهة', kicker: 'سرعة البديهة' },
  { intro: 'عينك تلاحظ؟', kicker: 'عينك تلاحظ؟' },
  { intro: 'فكّر بطريقة مختلفة', kicker: 'فكّر بطريقة مختلفة' },
  { intro: 'FINAL CHALLENGE', kicker: 'FINAL CHALLENGE' },
];

let finished = false;
for (let i = 0; i < 4; i++) {
  const begin = window.document.getElementById('beginStageBtn');
  ok(!!begin, `المرحلة ${i + 1}: زر ابدأ ظاهر`);
  begin.click();
  await sleep(15);
  ok(window.document.getElementById('gameRoot').textContent.includes(stages[i].kicker), `المرحلة ${i + 1}: عرض السؤال`);
  ok(!!window.document.getElementById('timerNum'), `المرحلة ${i + 1}: المؤقت يعمل`);

  const firstOption = window.document.querySelector('[data-qindex]');
  ok(!!firstOption, `المرحلة ${i + 1}: توجد خيارات للإجابة`);
  firstOption.click();
  await sleep(10);
  const explain = window.document.getElementById('explainStrip');
  ok(explain && !explain.hidden, `المرحلة ${i + 1}: يظهر شرح الإجابة`);
  ok(!!window.document.querySelector('.reaction'), `المرحلة ${i + 1}: تظهر Reaction`);
  await sleep(110);
}

/* 5) شاشة النتيجة */
await sleep(60);
ok(window.document.getElementById('resultScreen').classList.contains('active'), 'شاشة النتيجة نشطة');
const resultText = window.document.getElementById('resultRoot').textContent;
ok(resultText.includes('انتهى التحدي'), 'عنوان النهاية ظاهر');
ok(resultText.includes('سارة العرجاني'), 'اسم اللاعب في النتيجة');
ok(resultText.includes('نقطة'), 'النقاط في النتيجة');
ok(resultText.includes('#1') || resultText.includes('ترتيبك'), 'يظهر الترتيب');
ok(resultText.includes('إعداد: جود العرجاني'), 'الاعتماد في النتيجة');
ok(resultText.includes('شاهد ترتيب جميع المشاركين'), 'زر اللوحة موجود');
ok(resultText.includes('شارك نتيجتك'), 'زر المشاركة موجود');
ok(resultText.includes('إعادة التحدي'), 'زر إعادة اللعب موجود');
ok(resultText.includes('ساعدنا نطوّر التحدي'), 'قسم التقييم مدمج في النتيجة');

/* 6) المشاركة (fallback) */
window.document.getElementById('shareBtn').click();
await sleep(20);
ok(window.document.getElementById('resultRoot').textContent.includes('شترك نتيجتك') ||
   window.document.getElementById('resultRoot').textContent.includes('شارك نتيجتك 💬'), 'ظهر قسم المشاركة الاحتياطي');

/* 7) لوحة المتصدرين */
window.document.getElementById('lbBtn').click();
await sleep(40);
const modal = window.document.getElementById('leaderboardModal');
ok(!modal.hidden, 'لوحة المتصدرين فتحت');
ok(window.document.getElementById('lbBody').textContent.includes('سارة'), 'تظهر النتيجة المحفوظة في اللوحة');
ok(window.document.getElementById('lbBody').textContent.includes('أنت هنا'), 'يظهر تمييز "أنت هنا"');
ok(window.document.getElementById('lbBody').textContent.includes('🥇'), 'تظهر الميداليات');
window.document.getElementById('lbCloseBtn').click();
await sleep(10);
ok(modal.hidden, 'لوحة المتصدرين أُغلقت');

/* 8) التقييم */
const star5 = window.document.querySelector('[data-star="5"]');
ok(!!star5, 'نجمة التقييم موجودة');
star5.click();
const fbText = window.document.getElementById('feedbackText');
fbText.value = 'تجربة حلوة، أبغى مراحل زيادة 👏';
fbText.dispatchEvent(new window.Event('input', { bubbles: true }));
window.document.getElementById('fbSend').click();
await sleep(30);
ok(window.document.getElementById('fbThanks') && !window.document.getElementById('fbThanks').hidden, 'تظهر رسالة شكر التقييم');

/* 9) إعادة اللعب */
window.document.getElementById('replayBtn').click();
await sleep(40);
ok(window.document.getElementById('gameScreen').classList.contains('active'), 'إعادة اللعب: شاشة اللعب نشطة');
ok(/المرحلة\s+1\s+من\s+4/.test(window.document.getElementById('gameRoot').textContent), 'إعادة اللعب: بدأت مرحلة جديدة');

/* ═══ لوحة الإدارة (admin.html) ═══ */
const adminHtml = readFileSync(join(projectRoot, 'admin.html'), 'utf8');
const adminDom = new JSDOM(adminHtml, { url: 'http://localhost/', runScripts: 'outside-only' });
const adminWindow = adminDom.window;
globalThis.window = adminWindow;
globalThis.document = adminWindow.document;
try { globalThis.navigator = adminWindow.navigator; } catch { Object.defineProperty(globalThis, 'navigator', { value: adminWindow.navigator, configurable: true }); }
globalThis.localStorage = adminWindow.localStorage;
adminWindow.matchMedia = () => ({ matches: true, addEventListener() {} });
adminWindow.scrollTo = () => {};
/* jsdom: كل مثيل له localStorage مستقل — انسخ بيانات اللعبة إلى نافذة الإدارة */
for (const key of ['kx_lb_v1', 'kx_fb_v1']) {
  const value = dom.window.localStorage.getItem(key);
  if (value !== null) adminWindow.localStorage.setItem(key, value);
}
await import(`file:///${join(projectRoot, 'js/admin-app.js').replace(/\\/g, '/')}`);

ok(!!adminWindow.document.getElementById('gateBox'), 'لوحة الإدارة: بوابة كلمة المرور موجودة');

adminWindow.document.getElementById('adminPass').value = 'كلمة-خاطئة';
adminWindow.document.getElementById('gateBtn').click();
await sleep(10);
ok(adminWindow.document.getElementById('appBox').hidden === true, 'كلمة مرور خاطئة لا تدخل اللوحة');
ok(adminWindow.document.getElementById('gateMsg').textContent.includes('غير صحيحة'), 'تظهر رسالة كلمة المرور الخاطئة');

adminWindow.document.getElementById('adminPass').value = 'kharij-admin-1399';
adminWindow.document.getElementById('gateBtn').click();
await sleep(40);
ok(!!adminWindow.document.getElementById('appBox'), 'لوحة الإدارة: فُتحت بعد كلمة مرور صحيحة');
ok(adminWindow.document.getElementById('statsRow').textContent.includes('مشارك'), 'ظهرت إحصائيات المشاركين');
ok(adminWindow.document.getElementById('tableArea').textContent.includes('سارة'), 'ظهر جدول المشاركين (من البيانات المحلية)');
adminWindow.document.querySelector('[data-tab="feedback"]').click();
await sleep(10);
ok(adminWindow.document.getElementById('tableArea').textContent.includes('تجربة حلوة'), 'ظهرت التقييمات المحفوظة');

console.log(`\n═ النتيجة: ${passed} نجح / ${failed} فشل ═`);
process.exit(failed ? 1 : 0);