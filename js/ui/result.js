/*
  شاشة النتيجة النهائية: الاسم، النقاط، الترتيب، أفضل 3، المشاركة، إعادة اللعب، التقييم.
*/

import { DB } from '../db/database.js';
import { GAME, BRAND } from '../config.js';
import { computeTotalScore, computeTotalSeconds, resultMessage, maxPossibleScore } from '../core/scoring.js';
import { formatSeconds } from '../core/dice.js';
import { escapeHTML } from '../core/validation.js';
import { el, showScreen } from './screen.js';
import { burstConfetti } from './confetti.js';
import { mountFeedback } from './feedback.js';
import { openLeaderboard } from './leaderboard.js';
import { startGame } from './game.js';
import { stopCurrentTimer } from './game.js';

export async function showResult(session) {
  stopCurrentTimer();
  showScreen('result');
  const root = el('resultRoot');
  const score = computeTotalScore(session.results);
  const seconds = computeTotalSeconds(session.results);
  const maxScore = maxPossibleScore();

  root.innerHTML = `
    <div class="card result-hero reveal">
      <div class="result-trophies" aria-hidden="true">🏆 🚀 🏆</div>
      <img src="${BRAND.logoPath}" alt="شعار النادي" width="64" height="64"
           style="margin:0 auto 10px;filter:drop-shadow(0 8px 20px rgba(139,92,246,.4))">
      <div class="result-title">انتهى التحدي 🎉</div>
      <div class="result-name">${escapeHTML(session.name)}</div>
      <div class="result-score"><span class="num">${score}</span> نقطة</div>
      <div id="rankPlaceholder"></div>
      <div class="result-msg" id="resultMsg"></div>
      <p style="font-size:.78rem;color:var(--text-dim);margin-top:6px" class="num">الزمن: ${formatSeconds(seconds)}</p>
      <div id="podiumPlaceholder"></div>
      <div class="result-actions">
        <button class="btn" id="lbBtn">شاهد ترتيب جميع المشاركين</button>
        <button class="btn gold" id="shareBtn">شارك نتيجتك 📤</button>
        <button class="btn ghost" id="replayBtn">إعادة التحدي 🔄</button>
      </div>
      <div id="feedbackMount"></div>
      <footer class="result-credit">${BRAND.clubName} · ${GAME.name} — ${BRAND.credit}</footer>
    </div>`;

  const fe = new Intl.NumberFormat('ar');

  // 1) محاولة الحفظ في قاعدة البيانات الحقيقية
  let saved = null;
  try {
    saved = await DB.submitGame(session.toPayload());
  } catch (err) {
    console.error('submit failed', err);
    saved = { ok: false, reason: 'network', message: 'حدث خطأ أثناء الحفظ، حاول لاحقًا.' };
  }

  burstConfetti();

  const msg = resultMessage(score, maxScore);
  el('resultMsg').textContent = `${msg.emoji} ${msg.message}`;

  const meKey = session.nameKey ? session.nameKey : '';
  if (saved && saved.ok) {
    const rank = saved.rank;
    const total = saved.total;
    el('rankPlaceholder').innerHTML = `
      <div class="result-rank-box">
        <div class="rank-chip hl"><span class="lb">ترتيبك</span><span class="vl num">#${rank}</span></div>
        <div class="rank-chip"><span class="lb">من بين</span><span class="vl num">${new Intl.NumberFormat('en').format(total)}</span></div>
      </div>`;
    if (saved.best3 && saved.best3.length) renderPodium(saved.best3);
    const lbOpen = () => openLeaderboard({ myNameKey: meKey });
    el('lbBtn').addEventListener('click', lbOpen);
  } else {
    const why = saved && saved.reason === 'rate_limit'
      ? 'أنت وصلت الحد المسموح للمحاولات في هذه الفترة — جرب لاحقًا 🕐'
      : 'تعذّر الحفظ في اللوحة الآن — نتيجتك تظهر هنا فقط 😔';
    el('rankPlaceholder').innerHTML = `
      <div class="result-rank-box">
        <div class="rank-chip"><span class="lb">نقاطك</span><span class="vl num">${score}</span></div>
        <div class="rank-chip"><span class="lb">حالة الحفظ</span><span class="vl" style="font-size:.9rem;font-family:var(--font-ar)">غير مكتمل</span></div>
      </div>
      <p style="font-size:.82rem;color:var(--danger);margin-top:8px">${why}</p>`;
    el('lbBtn').addEventListener('click', () => openLeaderboard());
  }

  el('replayBtn').addEventListener('click', () => {
    root.innerHTML = '';
    startGame(session.name, (newSession) => showResult(newSession));
  });

  el('shareBtn').addEventListener('click', () => shareResult(session, score, saved));

  mountFeedback(el('feedbackMount'), session.name);
}

function renderPodium(best3) {
  const places = [
    { rank: 1, medal: '🥇' },
    { rank: 2, medal: '🥈' },
    { rank: 3, medal: '🥉' },
  ];
  const html = places.map((p) => {
    const e = best3.find((b) => b.rank === p.rank);
    if (!e) return '';
    const cls = `p${p.rank}`;
    return `
      <div class="col">
        <span class="medal">${p.medal}</span>
        <div class="nm">${escapeHTML(e.name)}</div>
        <div class="bar ${cls}"><span class="num" style="font-size:.8rem">${e.score}</span></div>
      </div>`;
  }).join('');
  el('podiumPlaceholder').innerHTML = `<div class="podium">${html}</div>`;
}

function shareResult(session, score, saved) {
  const rankText = saved && saved.ok ? `ترتيبي: #${saved.rank} من ${saved.total} مشارك` : 'جرب بنفسك! 🎮';
  const text =
    `🎮 خارج الصندوق | نادي الابتكار وريادة الأعمال\n` +
    `👤 ${session.name}\n` +
    `⭐ ${score} نقطة\n` +
    `${rankText}\n` +
    `هل تستطيع التفكير بطريقة مختلفة؟ 🚀`;

  const fallback = () => showShareFallback(text, score);

  if (navigator.share) {
    navigator.share({ title: 'نتيجتي في خارج الصندوق 🎮', text })
      .catch((err) => { if (err.name !== 'AbortError') fallback(); });
  } else {
    fallback();
  }
}

function showShareFallback(text, score) {
  const root = el('resultRoot');
  const box = document.createElement('div');
  box.className = 'card';
  box.style.cssText = 'margin-top:14px;padding:16px;text-align:center';
  box.innerHTML = `
    <p style="font-weight:900;font-size:.95rem">شارك نتيجتك 💬</p>
    <textarea class="field" style="margin-top:10px;min-height:110px;text-align:right" readonly>${escapeHTML(text)}</textarea>
    <button class="btn small ghost" id="copyShareBtn" style="margin-top:10px">نسخ النص 📋</button>
    <p id="copyMsg" style="font-size:.8rem;color:var(--text-dim);min-height:1.4em;margin-top:6px"></p>`;
  root.appendChild(box);
  box.querySelector('#copyShareBtn').addEventListener('click', async () => {
    const done = () => { box.querySelector('#copyMsg').textContent = 'نُسخ النص — الصقه في أي مكان ✅'; };
    try {
      await navigator.clipboard.writeText(text);
      done();
    } catch {
      box.querySelector('textarea').focus();
      box.querySelector('textarea').select();
      box.querySelector('#copyMsg').textContent = 'انسخ النص يدويًا بالضغط المطول ثم نسخ.';
    }
  });
}