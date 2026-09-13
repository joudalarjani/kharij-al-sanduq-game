/* كونفيتي خفيف — يتأثر بمستوى النتيجة، يُحترم تفضيل تقليل الحركة */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const PALETTES = {
  high:    ['#14B8A6', '#10B981', '#22D3EE', '#34D399', '#FBBF24', '#F1F5F9'], // إنجاز عالٍ
  medium:  ['#14B8A6', '#10B981', '#FBBF24', '#34D399', '#F1F5F9'],            // جيد
  low:     ['#94A3B8', '#475569', '#64748B', '#CBD5E1'],                       // بداية
};

export function burstConfetti(score, maxScore) {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas || reduced) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);

  const ratio = maxScore > 0 ? score / maxScore : 0;
  const palette = ratio >= 0.7 ? PALETTES.high : ratio >= 0.4 ? PALETTES.medium : PALETTES.low;
  const intensity = ratio >= 0.7 ? 160 : ratio >= 0.4 ? 110 : 70;

  const parts = Array.from({ length: intensity }, () => ({
    x: Math.random() * canvas.width / dpr,
    y: -20 - Math.random() * canvas.height / dpr * 0.5,
    w: 5 + Math.random() * 7,
    h: 8 + Math.random() * 8,
    c: palette[(Math.random() * palette.length) | 0],
    vy: 2.4 + Math.random() * 3,
    vx: (Math.random() - 0.5) * 2,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.2,
  }));

  let raf;
  const started = performance.now();
  const DURATION = 3200;

  function frame(now) {
    const t = now - started;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    const alive = [];
    for (const p of parts) {
      p.x += p.vx + Math.sin(now / 500 + p.rot) * 1.2;
      p.y += p.vy;
      p.vy += 0.06;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, 1 - t / DURATION);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
      if (p.y < (canvas.height / dpr) + 30) alive.push(p);
    }
    parts.length = 0;
    parts.push(...alive);
    if (parts.length && t < DURATION) {
      raf = requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }
  }
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(frame);
}
