/* whatWould — "وش تسوي؟" سيناريو قصير */
import { escapeHTML } from '../../core/validation.js';

export function renderWhatWould(q) {
  const lines = (q.situation || '').split('\n').map((l) => l.trim()).filter(Boolean);
  return `
    <div class="puzzle what-would">
      <div class="scenario-card reveal reveal-1">
        <div class="scenario-ico">🤔</div>
        <div class="situation">${lines.map((l) => `<p>${escapeHTML(l)}</p>`).join('')}</div>
      </div>
      <p class="puzzle-q">${escapeHTML(q.question)}</p>
      <div class="options" role="radiogroup" aria-label="اختر قرارك">
        ${q.options.map((opt, i) => `
          <button class="option ww-opt" data-pick="${i}" role="radio" aria-checked="false">
            <span class="txt">${escapeHTML(opt)}</span>
          </button>
        `).join('')}
      </div>
    </div>`;
}

export function bindWhatWould(q, root, onPick) {
  root.querySelectorAll('[data-pick]').forEach((btn) => {
    btn.addEventListener('click', () => onPick(Number(btn.dataset.pick)));
  });
}

export function revealWhatWould(q, root, state) {
  const btns = root.querySelectorAll('[data-pick]');
  btns.forEach((b, i) => {
    if (i === q.answerIndex) b.classList.add('correct', 'reveal-correct');
    if (i === state.selected && !state.correct) b.classList.add('wrong');
    if (state.locked) b.disabled = true;
  });
}

export function gradeWhatWould() { return 0; }
