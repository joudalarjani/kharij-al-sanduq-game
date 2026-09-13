/* scenario — سيناريو استثماري مع عائد/مخاطرة/مدة
   يعرض كل خيار كبطاقة فيه المقاييس، اللاعب يختار الأنسب.
*/
import { escapeHTML } from '../../core/validation.js';

export function renderScenario(q) {
  return `
    <div class="puzzle scenario">
      <p class="puzzle-q">${escapeHTML(q.question)}</p>
      <div class="scenario-grid">
        ${q.options.map((opt, i) => {
          const metrics = [
            { label: 'عائد متوقع', value: opt.expectedReturn != null ? `${opt.expectedReturn}%` : '—', cls: 'good' },
            { label: 'المخاطرة', value: opt.risk || '—', cls: 'warn' },
            { label: 'المدة', value: opt.duration || '—', cls: 'muted' },
            { label: 'السيولة', value: opt.liquidity || '—', cls: 'muted' },
          ].filter((m) => m.value && m.value !== 'undefined');
          return `
            <button class="scenario-card" data-pick="${i}" role="radio" aria-checked="false">
              <div class="sc-head">
                <span class="sc-idx">${['أ','ب','ج','د'][i]}</span>
                <span class="sc-label">${escapeHTML(opt.label)}</span>
              </div>
              <div class="sc-metrics">
                ${metrics.map((m) => `
                  <div class="sc-metric ${m.cls}">
                    <span class="sc-ml">${m.label}</span>
                    <span class="sc-mv">${escapeHTML(m.value)}</span>
                  </div>
                `).join('')}
              </div>
              <div class="sc-pick">اضغط للاختيار</div>
            </button>`;
        }).join('')}
      </div>
    </div>`;
}

export function bindScenario(q, root, onPick) {
  root.querySelectorAll('[data-pick]').forEach((btn) => {
    btn.addEventListener('click', () => onPick(Number(btn.dataset.pick)));
  });
}

export function revealScenario(q, root, state) {
  const cards = root.querySelectorAll('[data-pick]');
  cards.forEach((c, i) => {
    if (i === q.answerIndex) c.classList.add('correct', 'reveal-correct');
    if (i === state.selected && !state.correct) c.classList.add('wrong');
    if (state.locked) c.disabled = true;
  });
}

export function gradeScenario() { return 0; }
