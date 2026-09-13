/* findError — اكتشف الجزء الخطأ في خطة/قرار */
import { escapeHTML } from '../../core/validation.js';

export function renderFindError(q) {
  return `
    <div class="puzzle find-error">
      <p class="puzzle-q">${escapeHTML(q.question)}</p>
      <div class="segments" role="radiogroup" aria-label="اختر الجزء الخاطئ">
        ${q.segments.map((seg) => `
          <button class="segment ${seg.isError ? 'is-error' : ''}" data-pick="${escapeHTML(seg.id)}" role="radio" aria-checked="false">
            <span class="seg-marker">${seg.id.toUpperCase()}</span>
            <span class="seg-text">${escapeHTML(seg.text)}</span>
            <span class="seg-check" aria-hidden="true">✓</span>
          </button>
        `).join('')}
      </div>
    </div>`;
}

export function bindFindError(q, root, onPick) {
  root.querySelectorAll('[data-pick]').forEach((btn) => {
    btn.addEventListener('click', () => onPick(btn.dataset.pick));
  });
}

export function revealFindError(q, root, state) {
  root.querySelectorAll('[data-pick]').forEach((b) => {
    const id = b.dataset.pick;
    if (id === q.correctId) b.classList.add('correct', 'reveal-correct');
    if (id === state.selected && !state.correct) b.classList.add('wrong');
    if (state.locked) b.disabled = true;
  });
}

export function gradeFindError() { return null; }
