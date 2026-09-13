/* truefalse — عبارة استثمارية يوافق عليها اللاعب أو يرفضها */
import { escapeHTML } from '../../core/validation.js';

export function renderTrueFalse(q) {
  return `
    <div class="puzzle truefalse">
      <div class="tf-statement reveal reveal-1">
        <div class="tf-ico">📋</div>
        <p class="tf-text">${escapeHTML(q.statement)}</p>
      </div>
      <div class="tf-actions">
        <button class="tf-btn reject" data-pick="reject">
          <span class="tf-emoji">✋</span>
          <span class="tf-label">أرفض</span>
        </button>
        <button class="tf-btn agree" data-pick="agree">
          <span class="tf-emoji">🤝</span>
          <span class="tf-label">أوافق</span>
        </button>
      </div>
    </div>`;
}

export function bindTrueFalse(q, root, onPick) {
  root.querySelectorAll('[data-pick]').forEach((btn) => {
    btn.addEventListener('click', () => onPick(btn.dataset.pick));
  });
}

export function revealTrueFalse(q, root, state) {
  root.querySelectorAll('[data-pick]').forEach((b) => {
    if (b.dataset.pick === q.correctAnswer) b.classList.add('correct', 'reveal-correct');
    if (b.dataset.pick === state.selected && !state.correct) b.classList.add('wrong');
    if (state.locked) b.disabled = true;
  });
}

export function gradeTrueFalse() { return null; }
