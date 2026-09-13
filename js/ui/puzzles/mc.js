/* MC — اختيار من متعدد */
import { escapeHTML } from '../../core/validation.js';

export function renderMC(q) {
  const letters = ['أ', 'ب', 'ج', 'د'];
  return `
    <div class="puzzle mc">
      <div class="options" role="radiogroup" aria-label="اختر إجابة واحدة">
        ${q.options.map((opt, i) => `
          <button class="option" data-pick="${i}" role="radio" aria-checked="false">
            <span class="k">${letters[i]}</span>
            <span class="txt">${escapeHTML(opt)}</span>
          </button>
        `).join('')}
      </div>
    </div>`;
}

export function bindMC(q, root, onPick) {
  root.querySelectorAll('[data-pick]').forEach((btn) => {
    btn.addEventListener('click', () => onPick(Number(btn.dataset.pick)));
  });
}

export function revealMC(q, root, state) {
  const btns = root.querySelectorAll('[data-pick]');
  btns.forEach((b, i) => {
    if (i === q.answerIndex) b.classList.add('correct', 'reveal-correct');
    if (i === state.selected && !state.correct) b.classList.add('wrong');
    if (state.locked) b.disabled = true;
  });
}

export function gradeMC() { return 0; } // يُمرّر عبر onPick مباشرة
