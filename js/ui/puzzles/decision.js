/* decision — قرار ريادة أعمال/استثمار مع سياق أوسع */
import { escapeHTML } from '../../core/validation.js';

export function renderDecision(q) {
  const letters = ['أ', 'ب', 'ج', 'د'];
  return `
    <div class="puzzle decision">
      ${q.scenario ? `
        <div class="scenario-card reveal reveal-1">
          <div class="scenario-ico">⚖️</div>
          <p>${escapeHTML(q.scenario)}</p>
        </div>
      ` : ''}
      <p class="puzzle-q">${escapeHTML(q.question)}</p>
      <div class="options" role="radiogroup" aria-label="اختر القرار">
        ${q.options.map((opt, i) => `
          <button class="option decision-opt" data-pick="${i}" role="radio" aria-checked="false">
            <span class="k">${letters[i]}</span>
            <span class="txt">${escapeHTML(opt)}</span>
          </button>
        `).join('')}
      </div>
    </div>`;
}

export function bindDecision(q, root, onPick) {
  root.querySelectorAll('[data-pick]').forEach((btn) => {
    btn.addEventListener('click', () => onPick(Number(btn.dataset.pick)));
  });
}

export function revealDecision(q, root, state) {
  const btns = root.querySelectorAll('[data-pick]');
  btns.forEach((b, i) => {
    if (i === q.answerIndex) b.classList.add('correct', 'reveal-correct');
    if (i === state.selected && !state.correct) b.classList.add('wrong');
    if (state.locked) b.disabled = true;
  });
}

export function gradeDecision() { return 0; }
