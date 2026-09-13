/* word — لغز الكلمات: حروف مرتبة، اللاعب يعيد تركيب المصطلح */
import { escapeHTML } from '../../core/validation.js';
import { shuffle } from '../../core/dice.js';

export function renderWord(q) {
  const letters = q.letters || [];
  // نُرتّب الحروف بطريقة تجعل اللعبة أصعب: نعرضها مرتبة أبجديًا،
  // واللاعب يختار الحروف بالترتيب لتكوين الكلمة.
  return `
    <div class="puzzle word">
      <p class="puzzle-q">${escapeHTML(q.question)}</p>
      ${q.hint ? `<p class="puzzle-hint">💡 ${escapeHTML(q.hint)}</p>` : ''}
      <div class="word-target" id="wordTarget" aria-label="الكلمة المُختارة"></div>
      <div class="word-pool" role="group" aria-label="الحروف المتاحة">
        ${letters.map((ch, i) => `<button class="word-tile" data-l="${escapeHTML(ch)}" data-i="${i}">${escapeHTML(ch)}</button>`).join('')}
      </div>
      <div class="word-actions">
        <button class="btn ghost small" id="wordClear">مسح ⌫</button>
        <button class="btn primary small" id="wordSubmit">تأكيد ✅</button>
      </div>
    </div>`;
}

export function bindWord(q, root, onPick) {
  const target = root.querySelector('#wordTarget');
  const pool = root.querySelector('.word-pool');
  const chosen = [];
  const refresh = () => {
    target.innerHTML = chosen.map((c, i) =>
      `<span class="word-pick" data-i="${i}">${escapeHTML(c)}<button class="word-rm" aria-label="حذف">×</button></span>`
    ).join('') || '<span class="word-placeholder">اختر الحروف من الأسفل</span>';
    target.querySelectorAll('.word-rm').forEach((rm) => {
      rm.addEventListener('click', (e) => {
        const idx = Number(e.target.parentElement.dataset.i);
        const removed = chosen.splice(idx, 1)[0];
        pool.querySelectorAll('.word-tile').forEach((t) => {
          if (t.dataset.l === removed && !t.disabled) { t.disabled = false; }
        });
        refresh();
      });
    });
  };
  pool.addEventListener('click', (e) => {
    const tile = e.target.closest('.word-tile');
    if (!tile || tile.disabled) return;
    chosen.push(tile.dataset.l);
    tile.disabled = true;
    refresh();
  });
  root.querySelector('#wordClear').addEventListener('click', () => {
    chosen.length = 0;
    pool.querySelectorAll('.word-tile').forEach((t) => { t.disabled = false; });
    refresh();
  });
  root.querySelector('#wordSubmit').addEventListener('click', () => {
    onPick(chosen.join(''));
  });
  refresh();
}

export function revealWord(q, root, state) {
  const target = root.querySelector('#wordTarget');
  if (target) {
    target.innerHTML = `<span class="word-answer">${escapeHTML(state.expected || q.target)}</span>`;
    target.classList.add(state.correct ? 'correct' : 'wrong');
  }
  root.querySelectorAll('.word-tile').forEach((t) => { t.disabled = true; });
  root.querySelector('#wordClear').disabled = true;
  root.querySelector('#wordSubmit').disabled = true;
}

export function gradeWord() { return ''; }
