/* order — ترتيب الخطوات/البطاقات
   يعرض البطاقات بشكل عشوائي أولًا، واللاعب يعيد ترتيبها بأزرار ▲/▼.
   ثم يضغط "تأكيد" ليُسجّل ترتيبه النهائي.
   يعمل على الجوال والكمبيوتر بنفس الكفاءة.
*/
import { escapeHTML } from '../../core/validation.js';
import { shuffle } from '../../core/dice.js';

export function renderOrder(q) {
  const items = shuffle(q.items.map((it) => ({ ...it })));
  return `
    <div class="puzzle order">
      <p class="puzzle-q">${escapeHTML(q.question)}</p>
      <p class="puzzle-hint">رتّب من <b>الأعلى أولًا</b> إلى <b>الأقل أولًا</b> حسب سياق السؤال، ثم اضغط تأكيد ✅</p>
      <div class="order-list" role="list">
        ${items.map((it, i) => `
          <div class="order-card" data-id="${escapeHTML(it.id)}" role="listitem">
            <span class="order-pos">${i + 1}</span>
            <span class="order-text">${escapeHTML(it.text)}</span>
            <div class="order-actions">
              <button class="order-btn up" aria-label="نقل للأعلى" data-move="up">▲</button>
              <button class="order-btn down" aria-label="نقل للأسفل" data-move="down">▼</button>
            </div>
          </div>
        `).join('')}
      </div>
      <button class="btn primary order-confirm" id="orderConfirm">تأكيد الترتيب ✅</button>
    </div>`;
}

export function bindOrder(q, root, onPick) {
  const list = root.querySelector('.order-list');
  const refresh = () => {
    list.querySelectorAll('.order-card').forEach((card, i) => {
      card.querySelector('.order-pos').textContent = String(i + 1);
    });
  };
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-move]');
    if (!btn) return;
    const card = btn.closest('.order-card');
    const dir = btn.dataset.move;
    if (dir === 'up' && card.previousElementSibling) {
      list.insertBefore(card, card.previousElementSibling);
    } else if (dir === 'down' && card.nextElementSibling) {
      list.insertBefore(card.nextElementSibling, card);
    }
    refresh();
  });
  // دعم السحب على الديسكتوب
  let dragged = null;
  list.querySelectorAll('.order-card').forEach((card) => {
    card.setAttribute('draggable', 'true');
    card.addEventListener('dragstart', () => { dragged = card; card.classList.add('dragging'); });
    card.addEventListener('dragend', () => { card.classList.remove('dragging'); dragged = null; refresh(); });
    card.addEventListener('dragover', (e) => { e.preventDefault(); });
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!dragged || dragged === card) return;
      const rect = card.getBoundingClientRect();
      const after = (e.clientY - rect.top) > rect.height / 2;
      if (after) list.insertBefore(dragged, card.nextElementSibling);
      else list.insertBefore(dragged, card);
      refresh();
    });
  });
  // تأكيد
  root.querySelector('#orderConfirm').addEventListener('click', () => {
    const order = [...list.querySelectorAll('.order-card')].map((c) => c.dataset.id);
    onPick(order);
  });
}

export function revealOrder(q, root, state) {
  const list = root.querySelector('.order-list');
  if (!list) return;
  const cards = [...list.querySelectorAll('.order-card')];
  cards.forEach((c, i) => {
    const id = c.dataset.id;
    const expectedIdx = q.correctOrder.indexOf(id);
    const actualIdx = i;
    if (expectedIdx === actualIdx) c.classList.add('correct');
    else c.classList.add('wrong');
    c.querySelector('.order-actions').style.opacity = '.4';
    c.querySelector('.order-actions').style.pointerEvents = 'none';
    c.setAttribute('draggable', 'false');
  });
  root.querySelector('#orderConfirm').disabled = true;
}

export function gradeOrder() { return []; }
