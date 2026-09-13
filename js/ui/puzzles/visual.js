/* visual — مشهد بصري فيه عنصر شاذ */
import { escapeHTML } from '../../core/validation.js';

export function renderVisual(q) {
  return `
    <div class="puzzle visual">
      <div class="scene-title">${escapeHTML(q.scene.title)}</div>
      <div class="scene-grid">
        ${q.scene.items.map((it) => `
          <button class="scene-item" data-pick="${escapeHTML(it.id)}" aria-label="${escapeHTML(it.label)}">
            <span class="si-emoji">${escapeHTML(it.emoji)}</span>
            <span class="si-label">${escapeHTML(it.label)}</span>
          </button>
        `).join('')}
      </div>
    </div>`;
}

export function bindVisual(q, root, onPick) {
  root.querySelectorAll('[data-pick]').forEach((btn) => {
    btn.addEventListener('click', () => onPick(btn.dataset.id));
  });
}

export function revealVisual(q, root, state) {
  const oddId = (q.scene.items.find((it) => it.isOdd) || {}).id;
  root.querySelectorAll('[data-pick]').forEach((b) => {
    if (b.dataset.pick === oddId) b.classList.add('correct', 'reveal-correct');
    if (b.dataset.pick === state.selected && !state.correct) b.classList.add('wrong');
    if (state.locked) b.disabled = true;
  });
}

export function gradeVisual() { return null; }
