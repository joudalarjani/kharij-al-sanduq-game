/* visual — مشهد بصري فيه عنصر شاذ */
import { escapeHTML } from '../../core/validation.js';

export function renderVisual(q) {
  return `
    <div class="puzzle visual">
      <div class="scene-title">${escapeHTML(q.scene.title)}</div>
      <div class="scene-grid">
        ${q.scene.items.map((it, i) => `
          <button class="scene-item" data-pick="${i}" data-id="${escapeHTML(it.id)}"
                  aria-label="${escapeHTML(it.label)}">
            <span class="si-emoji">${escapeHTML(it.emoji)}</span>
            <span class="si-label">${escapeHTML(it.label)}</span>
          </button>
        `).join('')}
      </div>
    </div>`;
}

export function bindVisual(q, root, onPick) {
  root.querySelectorAll('[data-pick]').forEach((btn) => {
    btn.addEventListener('click', () => onPick(Number(btn.dataset.pick)));
  });
}

export function revealVisual(q, root, state) {
  const oddIdx = q.scene.items.findIndex((it) => it.isOdd);
  root.querySelectorAll('[data-pick]').forEach((b) => {
    const i = Number(b.dataset.pick);
    if (i === oddIdx) b.classList.add('correct', 'reveal-correct');
    if (i === state.selected && !state.correct) b.classList.add('wrong');
    if (state.locked) b.disabled = true;
  });
}

export function gradeVisual() { return null; }
