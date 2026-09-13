/*
  شاشة البداية — أول انطباع للاعب.
  شعار النادي + اسم اللعبة + tagline + وصف + نموذج اسم + CTA قوي.
*/

import { validateName, sanitizeName } from '../core/validation.js';
import { el, showScreen } from './screen.js';
import { GAME, BRAND, STAGE_THEMES } from '../config.js';

let nameInput;
let onStartCb = null;

export function initLanding(onStart) {
  onStartCb = onStart;
  const form = el('nameForm');
  nameInput = el('playerName');
  const errorBox = el('nameError');
  const startBtn = el('startBtn');

  nameInput.addEventListener('input', () => {
    errorBox.textContent = '';
    nameInput.classList.remove('field-error');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const res = validateName(nameInput.value);
    if (!res.ok) {
      errorBox.textContent = res.errors[0];
      nameInput.classList.add('field-error');
      nameInput.focus();
      return;
    }
    launch(res.name, startBtn);
  });
}

function launch(name, startBtn) {
  nameInput.disabled = true;
  startBtn.disabled = true;

  const landing = el('landingScreen');
  landing.classList.add('enter-anim');
  setTimeout(() => {
    showScreen('game');
    if (onStartCb) onStartCb(name);
  }, 480);
}

export function landingNameInput() {
  return nameInput;
}
