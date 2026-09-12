/*
  ══════════════════════════════════════════════════════════════
  الإعدادات العامة للعبة "خارج الصندوق"
  عدّل القيم هنا فقط — لا تحتاج لتغيير أي ملف آخر لضبط اللعبة.
  ══════════════════════════════════════════════════════════════
*/

import { SUPABASE_ENV } from './supabase-env.js';

export const GAME = {
  name: 'خارج الصندوق',
  tagline: 'هل تستطيع التفكير بطريقة مختلفة؟',
  description: '4 مراحل، أسئلة غير متوقعة، ونقاط تحدد مكانك بين المتسابقين.',
  stagesCount: 4,
  startLabel: 'ابدأ التحدي 🚀',
};

export const BRAND = {
  /* ─── هوية النادي — استبدل الألوان هنا بألوان شعار النادي الحقيقي ─── */
  colors: {
    bg:        '#070B18', // خلفية داكنة
    bgSoft:    '#0C1228',
    surface:   'rgba(255,255,255,0.045)',
    border:    'rgba(255,255,255,0.1)',
    primary:   '#8B5CF6', // بنفسجي — اللون الرئيسي
    secondary: '#22D3EE', // سماوي — اللون الثانوي
    accent:    '#F59E0B', // ذهبي/كهرماني — للنقاط والتمييز
    success:   '#34D399',
    danger:    '#FB7185',
    text:      '#F1F5F9',
    textDim:   '#94A3B8',
  },
  clubName: 'نادي الابتكار وريادة الأعمال',
  credit: 'إعداد: جود العرجاني',
  logoPath: 'assets/club-logo.svg',
};

/* ─── نظام النقاط ───
   basePoints:  نقاط الإجابة الصحيحة لكل مرحلة
   speedBonusRatio: نسبة البونص القصوى من النقاط الأساسية عند الإجابة السريعة
      البونص الفعلي = basePoints × speedBonusRatio × (الزمن المتبقي ÷ الزمن الكلي)
   timeouts:    الوقت المسموح لكل مرحلة بالثواني */
export const SCORING = {
  basePoints: { 1: 100, 2: 150, 3: 200, 4: 300 },
  speedBonusRatio: 0.5,
  timeouts: { 1: 10, 2: 8, 3: 12, 4: 15 },
  maxScore: 1125,
};

/* ─── رسائل النتيجة حسب مستوى الأداء (قابلة للتعديل) ───
   thresholds: نسبة من النقاط القصوى */
export const RESULT_MESSAGES = [
  { minRatio: 0.8,  emoji: '🔥', message: 'واضح إنك تفكر خارج الصندوق 🔥' },
  { minRatio: 0.45, emoji: '👀', message: 'عندك عقل مبتكر… جولة ثانية؟ 👀' },
  { minRatio: 0,    emoji: '😅', message: 'الصندوق فاز هذه المرة 😂' },
];

/* ─── Reactions بعد كل إجابة (تُختار عشوائيًا، لا تتكرر) ─── */
export const REACTIONS = {
  correct: [
    'أوووه! 🔥',
    'أصبت!',
    'واضح إنك مركز 👀',
    'ثقة عالية! 🎯',
    'جواب ذكي! ✨',
  ],
  wrong: [
    'قريب… لكن لا 😭',
    'مو هذه!',
    'الصندوق بدأ يفوز 😂',
    'تراك قربت… شوي 😬',
    'لا لا لا 😄',
  ],
  intro: [
    'أروووح يلا 🔥',
    'خلنا نبدأ 💪',
    'ركز… وابدأ 🎯',
  ],
};

/* ─── إدخال الاسم ─── */
export const NAME_RULES = {
  minLength: 2,
  maxLength: 30,
};

/* ─── قاعدة البيانات — Supabase ───
   تُحقن القيم تلقائيًا وقت النشر من GitHub Secrets (tools/build-config.mjs)
   عبر الملف المولّد js/supabase-env.js — لا تضع مفتاحًا سريًا هنا أبدًا.
   قيمة فارغة = وضع تجريبي محلي (localStorage) للاختبار قبل النشر.
   لتفعيل قاعدة بيانات حقيقية مشتركة يُضبط Secret التاليان في الريبو:
     1) SUPABASE_URL       = Project URL  (https://xxxx.supabase.co)
     2) SUPABASE_ANON_KEY  = anon public key (علني وليس سريًا)
   ثم شغّل supabase/schema.sql ثم supabase/seed_questions.sql من SQL Editor.
   التفاصيل الكاملة في README.md */
export const SUPABASE = {
  url: (SUPABASE_ENV && SUPABASE_ENV.url) || '',
  anonKey: (SUPABASE_ENV && SUPABASE_ENV.anonKey) || '',
};

export const FEEDBACK = {
  messageMaxLength: 500,
};

export const ADMIN = {
  pageTitle: 'لوحة إدارة | خارج الصندوق',
};