/* عداد زمني دائري SVG */

const RADIUS = 38;
const CIRC = 2 * Math.PI * RADIUS;

export function timerRingHTML() {
  return `
    <div class="timer-wrap" role="timer" aria-label="الوقت المتبقي">
      <div class="timer-ring">
        <svg width="84" height="84" viewBox="0 0 84 84">
          <circle class="timer-bg" cx="42" cy="42" r="${RADIUS}" fill="none" stroke-width="6"/>
          <circle class="timer-fg" id="timerFg" cx="42" cy="42" r="${RADIUS}" fill="none"
                  stroke-width="6" stroke-dasharray="${CIRC}" stroke-dashoffset="0"/>
        </svg>
        <div class="timer-num" id="timerNum">--</div>
      </div>
    </div>`;
}

export function updateTimer(fg, num, remainingMs, totalMs) {
  const frac = totalMs > 0 ? remainingMs / totalMs : 0;
  fg.style.strokeDashoffset = String(CIRC * (1 - frac));
  num.textContent = String(Math.max(0, Math.ceil(remainingMs / 1000)));
  const danger = frac < 0.3;
  fg.classList.toggle('danger', danger);
}