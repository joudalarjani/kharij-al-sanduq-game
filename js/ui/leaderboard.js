/*
  لوحة المتصدرين — قائمة كاملة قابلة للتمرير لكل المشاركين.
*/

import { DB } from '../db/database.js';
import { isConfigured } from '../db/database.js';
import { escapeHTML } from '../core/validation.js';
import { el } from './screen.js';
import { formatSeconds } from '../core/dice.js';

export async function openLeaderboard({ myNameKey = '' } = {}) {
  const modal = el('leaderboardModal');
  modal.hidden = false;
  el('lbBody').innerHTML = '<div class="lb-loading"><span class="spin"></span><br>جاري تحميل النتائج…</div>';
  el('lbSub').textContent = isConfigured() ? 'لوحة مشتركة بين جميع المتنافسين' : 'وضع تجريبي محلي (حتى ربط قاعدة البيانات)';

  try {
    const data = await DB.getLeaderboard();
    renderList(data, myNameKey);
  } catch (err) {
    console.error(err);
    el('lbBody').innerHTML = '<div class="lb-empty">تعذّر تحميل النتائج، حاول مرة أخرى في لحظات 🕐</div>';
  }
}

function renderList({ entries, total }, myNameKey) {
  const body = el('lbBody');
  el('lbSub').textContent = `${total} ${total === 1 ? 'مشارك' : 'مشاركين'}`;

  if (!entries || !entries.length) {
    body.innerHTML = '<div class="lb-empty">لا توجد نتائج بعد — كن أول المتنافسين! 🚀</div>';
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const rows = entries.map((e, i) => {
    const isMe = e.name_key === myNameKey;
    const posClass = (i === 0) ? 'top1' : (i === 1) ? 'top2' : (i === 2) ? 'top3' : '';
    const medal = i < 3 ? `<span style="font-size:1.05rem">${medals[i]}</span>` : `<span class="num">${e.rank}</span>`;
    return `
      <div class="lb-row ${posClass} ${isMe ? 'me' : ''}">
        <div class="pos">${medal}</div>
        <div class="nm">${escapeHTML(e.name)} ${isMe ? '<span class="you-tag">أنت هنا 👈</span>' : ''}</div>
        <div class="pt num">${e.score}</div>
        <div class="tm">${formatSeconds(e.total_seconds || 0)}</div>
      </div>`;
  }).join('');

  body.innerHTML = `<div class="lb-list">${rows}</div>`;
}

export function closeLeaderboard() {
  el('leaderboardModal').hidden = true;
}

export function bindLeaderboardControls({ closeBtnId = 'lbCloseBtn' } = {}) {
  el('lbCloseBtn').addEventListener('click', closeLeaderboard);
  el('leaderboardModal').addEventListener('click', (e) => {
    if (e.target.id === 'leaderboardModal') closeLeaderboard();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !el('leaderboardModal').hidden) closeLeaderboard();
  });
}