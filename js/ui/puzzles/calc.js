/* calc — لغز حسابي قصير: يكتب اللاعب الإجابة يدويًا */
import { escapeHTML } from '../../core/validation.js';

export function renderCalc(q) {
  return `
    <div class="puzzle calc">
      <p class="puzzle-q">${escapeHTML(q.question)}</p>
      ${q.hint ? `<p class="puzzle-hint">💡 ${escapeHTML(q.hint)}</p>` : ''}
      <div class="calc-input-wrap">
        <input type="text" inputmode="decimal" class="calc-field field" id="calcInput"
               placeholder="اكتب الإجابة هنا…"
               autocomplete="off" spellcheck="false" />
        ${q.unit ? `<span class="calc-unit">${escapeHTML(q.unit)}</span>` : ''}
      </div>
      <button class="btn primary" id="calcSubmit">تأكيد الحساب ✅</button>
    </div>`;
}

export function bindCalc(q, root, onPick) {
  const input = root.querySelector('#calcInput');
  const submit = root.querySelector('#calcSubmit');
  input.focus();
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit.click(); }
  });
  submit.addEventListener('click', () => {
    const raw = (input.value || '').trim().replace(/[^0-9\-\.\,]/g, '').replace(',', '.');
    if (!raw) return;
    const num = parseFloat(raw);
    if (Number.isNaN(num)) return;
    onPick(num);
  });
}

export function revealCalc(q, root, state) {
  const input = root.querySelector('#calcInput');
  if (input) {
    input.disabled = true;
    input.value = String(state.expected != null ? state.expected : '');
    input.classList.add(state.correct ? 'correct' : 'wrong');
  }
  root.querySelector('#calcSubmit').disabled = true;
}

export function gradeCalc() { return null; }
