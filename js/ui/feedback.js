/*
  التقييم والاقتراحات — جزء مدمج في شاشة النهاية، يُحفظ في قاعدة البيانات.
*/

import { DB } from '../db/database.js';
import { FEEDBACK } from '../config.js';
import { escapeHTML } from '../core/validation.js';

const STAR_LABELS = ['', 'سيئة 🙁', 'مقبولة 😐', 'جيدة 🙂', 'حلوة 😊', 'ممتازة 🔥'];

export function mountFeedback(container, name) {
  container.innerHTML = `
    <div class="card feedback reveal" id="feedbackBox">
      <h3>ساعدنا نطوّر التحدي 💡</h3>
      <p class="q">كيف تقيّم تجربتك؟</p>
      <div class="stars" role="radiogroup" aria-label="تقييم التجربة من 1 إلى 5">
        ${[1,2,3,4,5].map((n) => `<button type="button" class="star-btn" data-star="${n}" role="radio" aria-checked="false" aria-label="${n} من 5">★</button>`).join('')}
      </div>
      <p class="stars-label" aria-live="polite"></p>
      <label for="feedbackText" style="display:block;font-weight:800;font-size:.9rem;margin-top:6px">وش أكثر شيء عجبك؟ أو وش تقترح نطوّر؟ <span style="color:var(--text-dim);font-weight:700">(اختياري)</span></label>
      <textarea class="field" id="feedbackText" rows="3" maxlength="${FEEDBACK.messageMaxLength}"
                placeholder="اكتب اقتراحك هنا…"></textarea>
      <p class="char-count" id="fbCount">0 / ${FEEDBACK.messageMaxLength}</p>
      <button class="btn ghost small" id="fbSend" style="width:100%;margin-top:4px">إرسال التقييم</button>
      <div class="feedback-thanks" id="fbThanks" hidden></div>
    </div>`;

  const stars = container.querySelectorAll('.star-btn');
  const label = container.querySelector('.stars-label');
  const text = container.querySelector('#feedbackText');
  const count = container.querySelector('#fbCount');
  const send = container.querySelector('#fbSend');
  let rating = 0;
  let submitted = false;

  function setRating(n) {
    rating = n;
    stars.forEach((s) => {
      const on = Number(s.dataset.star) <= n;
      s.classList.toggle('on', on);
      s.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    label.textContent = n ? `${n} / 5 — ${STAR_LABELS[n]}` : '';
  }
  rating = 0;
  stars.forEach((s) => s.addEventListener('click', () => setRating(Number(s.dataset.star))));
  text.addEventListener('input', () => { count.textContent = `${text.value.length} / ${FEEDBACK.messageMaxLength}`; });

  send.addEventListener('click', async () => {
    if (submitted) return;
    if (!rating) {
      label.textContent = 'اختر تقييمًا من 1 إلى 5 ⭐';
      return;
    }
    send.disabled = true;
    const res = await DB.submitFeedback({
      name,
      rating,
      message: text.value.trim().slice(0, FEEDBACK.messageMaxLength),
    });
    submitted = true;
    send.hidden = true;
    const thanks = container.querySelector('#fbThanks');
    thanks.hidden = false;
    thanks.textContent = escapeHTML(res && res.message ? res.message : 'شكرًا لك! اقتراحك يساعدنا نصنع تجربة أفضل 💙');
  });
}