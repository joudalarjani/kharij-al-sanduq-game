/*
  منطق لوحة الإدارة:
  - كلمة مرور شكلية أمامية (admin-config.js).
  - عند ربط Supabase: يُطلب مفتاح الخدمة السري يدويًا ويتعين إدخاله كل مرة
    (يبقى في ذاكرة الجلسة فقط ولا يُخزن في أي مكان).
  - دون ربط Supabase: يعرض بيانات الوضع التجريبي المحلي (localStorage).
*/

import { ADMIN_PASS } from './admin-config.js';
import { SUPABASE } from './config.js';
import { escapeHTML } from './core/validation.js';

const $ = (id) => document.getElementById(id);

function demoData() {
  try {
    return JSON.parse(localStorage.getItem('kx_lb_v1')) || { entries: [], feedback: [] };
  } catch {
    return { entries: [], feedback: [] };
  }
}

function gate() {
  const pass = $('adminPass').value.trim();
  if (pass !== ADMIN_PASS) {
    $('gateMsg').textContent = 'كلمة المرور غير صحيحة.';
    $('adminPass').classList.add('field-error');
    return;
  }
  $('gateBox').hidden = true;
  $('appBox').hidden = false;
  initApp();
}

async function initApp() {
  const configured = Boolean(SUPABASE.url && SUPABASE.anonKey);

  $('modeCard').innerHTML = configured
    ? `<p style="font-weight:800">وضع القاعدة الحقيقية (Supabase)</p>
       <p style="font-size:.85rem;color:var(--text-dim)">أدخل مفتاح الخدمة السري (Service Role Key) للاتصال بالبيانات — يُستخدم في الذاكرة فقط:</p>
       <input class="field" type="password" id="svcKey" placeholder="sb_secret_service_role_key…" style="margin-top:8px" autocomplete="off">
       <button class="btn small ghost" id="svcBtn" style="margin-top:10px">الاتصال وقراءة البيانات</button>
       <p class="error-msg" id="svcMsg" aria-live="polite"></p>`
    : `<p style="font-weight:800">وضع تجريبي محلي</p>
       <p style="font-size:.85rem;color:var(--text-dim)">لم يتم ربط Supabase بعد — البيانات تُقرأ من هذا المتصفح فقط. لإظهار بيانات جميع المستخدمين، اربط القاعدة (راجع README).</p>
       <button class="btn small ghost" id="localBtn" style="margin-top:10px">قراءة البيانات المحلية</button>`;

  if (configured) {
    $('svcBtn').addEventListener('click', async () => {
      const svc = $('svcKey').value.trim();
      if (!svc) { $('svcMsg').textContent = 'أدخل مفتاح الخدمة.'; return; }
      $('svcMsg').textContent = 'جاري الاتصال…';
      try {
        const [entries, feedback] = await Promise.all([
          supabaseSelect('entries', svc, 'id,name,score,total_seconds,stage_results,created_at'),
          supabaseSelect('feedback', svc, 'id,name,rating,message,created_at'),
        ]);
        render(entries, feedback);
        $('svcMsg').textContent = 'تم الاتصال ✅';
      } catch (err) {
        console.error(err);
        $('svcMsg').textContent = 'فشل الاتصال — تأكد من صحة مفتاح الخدمة والـ URL.';
      }
    });
  } else {
    $('localBtn').addEventListener('click', () => {
      const data = demoData();
      render(data.entries, data.feedback);
    });
    $('localBtn').click();
  }
}

async function supabaseSelect(table, svcKey, select) {
  const url = `${SUPABASE.url}/rest/v1/${table}?select=${encodeURIComponent(select)}&order=created_at.desc`;
  const res = await fetch(url, {
    headers: {
      apikey: svcKey,
      Authorization: `Bearer ${svcKey}`,
    },
  });
  if (!res.ok) throw new Error(`${table} ${res.status}`);
  return res.json();
}

function render(entries, feedback) {
  const entriesArr = Array.isArray(entries) ? entries : [];
  const feedbackArr = Array.isArray(feedback) ? feedback : [];

  // أفضل نتيجة لكل اسم (للإحصائيات والجدول)
  const best = new Map();
  for (const e of entriesArr) {
    const key = (e.name || '').toLocaleLowerCase('ar').trim();
    const cur = best.get(key);
    if (!cur || e.score > cur.score) best.set(key, e);
  }
  const bestArr = [...best.values()].sort((a, b) => b.score - a.score);
  const avgRating = feedbackArr.length
    ? (feedbackArr.reduce((s, f) => s + Number(f.rating), 0) / feedbackArr.length).toFixed(1)
    : '—';

  $('statsRow').innerHTML = `
    <div class="admin-stat"><div class="v">${new Intl.NumberFormat('en').format(bestArr.length)}</div><div class="l">مشارك فريد</div></div>
    <div class="admin-stat"><div class="v">${new Intl.NumberFormat('en').format(entriesArr.length)}</div><div class="l">محاولة</div></div>
    <div class="admin-stat"><div class="v">${new Intl.NumberFormat('en').format(feedbackArr.length)}</div><div class="l">تقييم</div></div>
    <div class="admin-stat"><div class="v">${new Intl.NumberFormat('ar').format(avgRating)}</div><div class="l">متوسط النجوم</div></div>`;

  const tabs = document.querySelectorAll('[data-tab]');
  const click = (name) => tabs.forEach((t) => t.classList.toggle('gold', t.dataset.tab === name));
  tabs.forEach((t) => t.addEventListener('click', () => {
    click(t.dataset.tab);
    if (t.dataset.tab === 'entries') renderEntries(bestArr);
    else renderFeedback(feedbackArr);
  }));

  click('entries');
  renderEntries(bestArr);
}

function renderEntries(bestArr) {
  $('tableArea').innerHTML = bestArr.length
    ? `<div style="overflow-x:auto">
         <table class="admin-table">
           <thead><tr><th>#</th><th>الاسم</th><th>النقاط</th><th>الزمن</th><th>التاريخ</th></tr></thead>
           <tbody>
             ${bestArr.map((e, i) => `
               <tr>
                 <td class="n">${i + 1}</td>
                 <td>${escapeHTML(e.name || '—')}</td>
                 <td class="n" style="color:var(--accent);font-weight:800">${e.score ?? '—'}</td>
                 <td class="n">${e.total_seconds != null ? Math.round(e.total_seconds) + 'ث' : '—'}</td>
                 <td class="n">${e.created_at ? new Date(e.created_at).toLocaleString('ar') : '—'}</td>
               </tr>`).join('')}
           </tbody>
         </table>
       </div>`
    : '<p style="text-align:center;color:var(--text-dim);padding:20px">لا توجد بيانات بعد.</p>';
}

function renderFeedback(feedbackArr) {
  $('tableArea').innerHTML = feedbackArr.length
    ? `<div style="overflow-x:auto">
         <table class="admin-table">
           <thead><tr><th>الاسم</th><th>التقييم</th><th>الاقتراح</th><th>التاريخ</th></tr></thead>
           <tbody>
             ${feedbackArr.map((f) => `
               <tr>
                 <td>${escapeHTML(f.name || '—')}</td>
                 <td class="n">${'★'.repeat(Math.min(5, Number(f.rating) || 0))}</td>
                 <td>${escapeHTML(f.message || '—')}</td>
                 <td class="n">${f.created_at ? new Date(f.created_at).toLocaleString('ar') : '—'}</td>
               </tr>`).join('')}
           </tbody>
         </table>
       </div>`
    : '<p style="text-align:center;color:var(--text-dim);padding:20px">لا توجد تقييمات بعد.</p>';
}

$('gateBtn').addEventListener('click', gate);
$('adminPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') gate(); });