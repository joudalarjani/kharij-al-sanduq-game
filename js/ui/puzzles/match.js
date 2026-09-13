/* match — مطابقة المصطلح مع التعريف
   آلية: اضغط مصطلح، ثم اضغط تعريفًا لإتمام الربط.
   يعمل على الجوال والكمبيوتر.
*/
import { escapeHTML } from '../../core/validation.js';
import { shuffle } from '../../core/dice.js';

export function renderMatch(q) {
  const terms = q.pairs;
  const defs = shuffle(q.pairs.map((p) => ({ id: p.id, def: p.def })));
  return `
    <div class="puzzle match">
      <p class="puzzle-q">${escapeHTML(q.question)}</p>
      <p class="puzzle-hint">اضغط مصطلحًا ثم اضغط تعريفه المناسب 🔗</p>
      <div class="match-grid">
        <div class="match-col" data-col="terms">
          ${terms.map((t) => `
            <button class="match-card" data-id="${escapeHTML(t.id)}" data-side="term">
              <span class="match-term">${escapeHTML(t.term)}</span>
            </button>
          `).join('')}
        </div>
        <div class="match-col" data-col="defs">
          ${defs.map((d) => `
            <button class="match-card def" data-id="${escapeHTML(d.id)}" data-side="def">
              <span class="match-def">${escapeHTML(d.def)}</span>
            </button>
          `).join('')}
        </div>
      </div>
      <button class="btn primary match-confirm" id="matchConfirm">تأكيد المطابقة ✅</button>
    </div>`;
}

export function bindMatch(q, root, onPick) {
  const state = { selected: null, pairs: {} };
  root.querySelectorAll('[data-side]').forEach((b) => {
    b.addEventListener('click', () => {
      const side = b.dataset.side;
      const id = b.dataset.id;
      if (state.pairs[id] || (side === 'def' && !state.selected)) return;
      if (side === 'term') {
        if (state.selected === id) {
          b.classList.remove('selected');
          state.selected = null;
          return;
        }
        root.querySelectorAll('[data-side="term"]').forEach((x) => x.classList.remove('selected'));
        b.classList.add('selected');
        state.selected = id;
      } else {
        // ربط تعريف بمصطلح مُختار
        const term = state.selected;
        // إزالة ربط قديم إن وُجد بنفس المصطلح أو التعريف
        Object.keys(state.pairs).forEach((k) => {
          if (k === term || state.pairs[k] === id) delete state.pairs[k];
        });
        state.pairs[term] = id;
        b.classList.add('selected');
        root.querySelectorAll(`[data-side="term"][data-id="${term}"]`).forEach((x) => x.classList.remove('selected'));
        state.selected = null;
        renderLines(q, root, state);
      }
    });
  });
  root.querySelector('#matchConfirm').addEventListener('click', () => onPick(state.pairs));
}

function renderLines(q, root, state) {
  root.querySelectorAll('.match-line').forEach((el) => el.remove());
  Object.keys(state.pairs).forEach((termId) => {
    const defId = state.pairs[termId];
    const termEl = root.querySelector(`[data-side="term"][data-id="${termId}"]`);
    const defEl = root.querySelector(`[data-side="def"][data-id="${defId}"]`);
    if (!termEl || !defEl) return;
    const line = document.createElement('div');
    line.className = 'match-line';
    line.dataset.term = termId;
    line.dataset.def = defId;
    root.appendChild(line);
    positionLine(line, termEl, defEl);
  });
}

function positionLine(line, termEl, defEl) {
  const tr = termEl.getBoundingClientRect();
  const dr = defEl.getBoundingClientRect();
  const x1 = tr.left + tr.width / 2;
  const y1 = tr.top + tr.height / 2;
  const x2 = dr.left + dr.width / 2;
  const y2 = dr.top + dr.height / 2;
  const length = Math.hypot(x2 - x1, y2 - y1);
  const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  Object.assign(line.style, {
    position: 'fixed',
    left: `${x1}px`,
    top: `${y1}px`,
    width: `${length}px`,
    height: '2px',
    background: 'rgba(20,184,166,.6)',
    transformOrigin: '0 50%',
    transform: `rotate(${angle}deg)`,
    zIndex: 5,
    pointerEvents: 'none',
    borderRadius: '1px',
  });
}

export function revealMatch(q, root, state) {
  root.querySelectorAll('.match-card').forEach((b) => {
    const id = b.dataset.id;
    const side = b.dataset.side;
    if (state.pairs[id] && side === 'term') {
      const defId = state.pairs[id];
      const correct = defId === id;
      b.classList.add(correct ? 'correct' : 'wrong');
    }
    if (state.locked) b.disabled = true;
  });
  root.querySelectorAll('[data-side="def"]').forEach((b) => {
    const id = b.dataset.id;
    const isUsedCorrectly = Object.values(state.pairs).includes(id) && id === b.dataset.id;
    const isUsedWrongly = Object.values(state.pairs).includes(id) && id !== b.dataset.id;
    if (isUsedCorrectly) b.classList.add('correct');
    if (isUsedWrongly) b.classList.add('wrong');
    if (state.locked) b.disabled = true;
  });
  root.querySelector('#matchConfirm').disabled = true;
  root.querySelectorAll('.match-line').forEach((l) => l.remove());
}

export function gradeMatch() { return {}; }
