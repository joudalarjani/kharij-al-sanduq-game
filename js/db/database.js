/*
  ══════════════════════════════════════════════════════════════
  طبقة قاعدة البيانات — واجهة موحّدة بين الوضعين:

  1) MODE SUPABASE (حقيقي، مشترك بين جميع الأجهزة):
     - يتصل بمشروع Supabase عبر REST + RPC.
     - النقاط تُعاد حِسابها على الخادم من أحداث اللعب (events)
       ولا يُثق بالنقاط المرسلة من المتصفح إطلاقًا.
     - يحتاج: تعبئة SUPABASE.url و SUPABASE.anonKey في js/config.js
       وتشغيل supabase/schema.sql. (راجع README.md)

  2) MODE DEMO (محلي):
     - عند عدم تعبئة الإعدادات، يعمل كل شيء على localStorage
       لاختبار اللعبة بشكل كامل قبل الربط.

  ══════════════════════════════════════════════════════════════
*/

import { SUPABASE } from '../config.js';
import { sanitizeName, nameKey } from '../core/validation.js';
import { rankEntries, scoreFromEvents, secondsFromEvents } from '../core/scoring.js';

export function isConfigured() {
  return Boolean(SUPABASE.url && SUPABASE.anonKey);
}

export const DB = {
  isConfigured,
  submitGame,
  getLeaderboard,
  submitFeedback,
};

const BUCKET = 'kx_lb_v1';

/* ════════════ الوضع الحقيقي: Supabase ════════════ */

async function rpc(fn, body) {
  const res = await fetch(`${SUPABASE.url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE.anonKey,
      'Authorization': `Bearer ${SUPABASE.anonKey}`,
    },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Supabase (${fn}) ${res.status} ${txt.slice(0, 200)}`);
  }
  return res.json();
}

async function submitGame(payload) {
  if (!isConfigured()) return submitDemo(payload);
  const res = await rpc('submit_game', {
    p_name: payload.name,
    p_events: payload.stage_results,
  });
  return res;
}

async function getLeaderboard() {
  if (!isConfigured()) return leaderboardDemo();
  const res = await rpc('get_leaderboard', {});
  return res;
}

async function submitFeedback(data) {
  if (!isConfigured()) return submitFeedbackDemo(data);
  const res = await rpc('submit_feedback', {
    p_name: data.name,
    p_rating: data.rating,
    p_message: data.message,
  });
  return res;
}

/* ════════════ الوضع التجريبي المحلي ════════════ */

function storeRead() {
  try { return JSON.parse(localStorage.getItem(BUCKET)) || { entries: [], feedback: [] }; }
  catch { return { entries: [], feedback: [] }; }
}
function storeWrite(data) {
  localStorage.setItem(BUCKET, JSON.stringify(data));
}

function uid() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

async function submitDemo(payload) {
  const data = storeRead();
  const cleaned = sanitizeName(payload.name);
  const key = nameKey(cleaned);
  const events = payload.stage_results || [];
  // النقاط تُعاد حِسابها من الأحداث — لا تُقبل القيمة المُرسلة
  const score = Math.max(0, Math.min(scoreFromEvents(events), 9999));
  const seconds = Math.max(0.1, Math.min(secondsFromEvents(events) || Number(payload.total_seconds) || 1, 900));

  // حد أقصى: 5 محاولات لكل اسم خلال الساعة (حماية تدريبية)
  const hourAgo = Date.now() - 3600_000;
  const recent = data.entries.filter((e) => e.name_key === key && new Date(e.created_at).getTime() > hourAgo);
  if (recent.length >= 5) {
    return { ok: false, reason: 'rate_limit', message: 'هدّي شوي… خلّ غيرك يجرب 🧘' };
  }

  const entry = {
    id: uid(),
    name: cleaned,
    name_key: key,
    score,
    total_seconds: seconds,
    stage_results: payload.stage_results || [],
    created_at: new Date().toISOString(),
  };
  data.entries.push(entry);
  storeWrite(data);

  const view = buildDemoView(data);
  const me = view.find((v) => v.name_key === key);
  return {
    ok: true,
    mode: 'demo',
    score,
    rank: me ? me.rank : 0,
    total: view.length,
    myEntry: me || null,
    best3: view.slice(0, 3),
  };
}

async function leaderboardDemo() {
  const data = storeRead();
  const view = buildDemoView(data);
  return { entries: view, total: view.length, mode: 'demo' };
}

function buildDemoView(data) {
  const best = new Map();
  for (const e of data.entries || []) {
    const cur = best.get(e.name_key);
    if (!cur || e.score > cur.score || (e.score === cur.score && e.total_seconds < cur.total_seconds)) {
      best.set(e.name_key, e);
    }
  }
  const ranked = rankEntries([...best.values()]);
  return ranked.map((r) => ({
    rank: r.rank,
    name: r.name,
    name_key: r.name_key,
    score: r.score,
    total_seconds: r.total_seconds,
  }));
}

async function submitFeedbackDemo(data) {
  const cleaned = sanitizeName(data.name);
  const rating = Number(data.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, message: 'اختر تقييمًا من 1 إلى 5 نجوم.' };
  }
  const db = storeRead();
  const key = nameKey(cleaned);
  const dayAgo = Date.now() - 86400_000;
  const today = db.feedback.filter((f) => f.name_key === key && new Date(f.created_at).getTime() > dayAgo);
  if (today.length >= 1) {
    return { ok: false, message: 'شكرًا لك! تُقبل رسالة واحدة لكل اسم في اليوم 🧡' };
  }
  db.feedback.push({
    id: uid(),
    name: cleaned,
    name_key: key,
    rating,
    message: String(data.message || '').slice(0, 500),
    created_at: new Date().toISOString(),
  });
  storeWrite(db);
  return { ok: true, message: 'شكرًا لك! اقتراحك يساعدنا نصنع تجربة أفضل 💙' };
}