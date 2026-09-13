/*
  ══════════════════════════════════════════════════════════════
  الإعدادات العامة للعبة "خارج الصندوق"
  عدّل القيم هنا فقط — لا تحتاج لتغيير أي ملف آخر لضبط اللعبة.
  ══════════════════════════════════════════════════════════════
*/

import { SUPABASE_ENV } from './supabase-env.js';

export const GAME = {
  name: 'خارج الصندوق',
  tagline: 'فكّر كريادي… واستثمر بذكاء',
  description: 'أربع مراحل من الألغاز والتحديات تختبر قدرتك على التفكير الاستثماري واتخاذ القرارات الريادية.',
  stagesCount: 4,
  startLabel: 'ابدأ التحدي 🚀',
  questionsPerStage: 4, // عدد الأسئلة لكل مرحلة
};

/* ─── هوية النادي — ألوان مستوحاة من شعار الابتكار وريادة الأعمال ─── */
export const BRAND = {
  colors: {
    bg:        '#06141A', // خلفية داكنة تركوازية
    bgSoft:    '#0A1F26',
    surface:   'rgba(255,255,255,0.045)',
    surface2:  'rgba(255,255,255,0.09)',
    border:    'rgba(255,255,255,0.1)',
    primary:   '#14B8A6', // تركوازي — اللون الرئيسي
    secondary: '#10B981', // أخضر زمرّدي — اللون الثانوي
    accent:    '#FBBF24', // ذهبي — للنقاط والتمييز
    success:   '#34D399',
    danger:    '#FB7185',
    text:      '#F1F5F9',
    textDim:   '#94A3B8',
  },
  clubName: 'نادي الابتكار وريادة الأعمال',
  credit: 'إعداد: جود العرجاني',
  logoPath: 'assets/club-logo.svg',
};

/* ─── مراحل اللعبة بألوانها المميزة ───
   العنوان الفرعي يظهر في شاشة البداية وخريطة المراحل. */
export const STAGE_THEMES = {
  1: { title: 'أساسيات المستثمر',  subtitle: 'مفاهيم الاستثمار والتمويل',         accent: '#14B8A6', emoji: '📊', icon: 'trending' },
  2: { title: 'عقلية الريادي',      subtitle: 'سيناريوهات ريادة الأعمال والقرار',  accent: '#10B981', emoji: '🚀', icon: 'rocket' },
  3: { title: 'اختبر قرارك',        subtitle: 'تحليل بيانات وحالات استثمارية',     accent: '#22D3EE', emoji: '🧠', icon: 'graph' },
  4: { title: 'خارج الصندوق',       subtitle: 'التحدي النهائي — استثمار + ريادة + مخاطرة', accent: '#FBBF24', emoji: '🔥', icon: 'fire' },
};

/* ─── نظام النقاط ───
   - basePoints:  نقاط الأساس لكل مرحلة
   - difficultyMultiplier: يُضاعف نقاط الأسئلة الصعبة (حسب المرحلة)
   - speedBonusRatio: نسبة البونص القصوى من نقاط الأساس عند الإجابة السريعة
   - timeouts:    الوقت المسموح لكل مرحلة (ثوانٍ) — يُعدَّل لكل سؤال عبر timeoutMs */
export const SCORING = {
  basePoints: { 1: 100, 2: 150, 3: 200, 4: 300 },
  difficultyMultiplier: { 1: 1.0, 2: 1.15, 3: 1.3, 4: 1.6 },
  speedBonusRatio: 0.5,
  timeouts: { 1: 25, 2: 30, 3: 35, 4: 40 }, // ثوانٍ افتراضية
  perfectRunBonus: 100, // مكافأة إكمال كل المراحل بأربع إجابات صحيحة
  maxScore: 2300,
};

/* ─── رسائل النتيجة حسب مستوى الأداء ─── */
export const RESULT_MESSAGES = [
  { minRatio: 0.85, tier: 'elite',    emoji: '🏆', message: 'مستثمر يفكر خارج الصندوق فعلًا!' },
  { minRatio: 0.65, tier: 'strong',   emoji: '🔥', message: 'عقلية ريادية واضحة — القرار عندك حقيقي' },
  { minRatio: 0.40, tier: 'developing', emoji: '📈', message: 'لديك أساس جيد… طوّر أدواتك' },
  { minRatio: 0.15, tier: 'starting', emoji: '🌱', message: 'بداية موفقة — تعلّم أكثر وارجع أقوى' },
  { minRatio: 0,    tier: 'welcome',  emoji: '🤝', message: 'مرحبًا بك في عالم الاستثمار وريادة الأعمال' },
];

/* ─── عبارات ردود الفعل بعد كل إجابة ─── */
export const REACTIONS = {
  correct: [
    'قرار ذكي 💡',
    'تحليل ممتاز 🎯',
    'ثقة عالية ✨',
    'قراءة صحيحة للسوق 📊',
    'عقلية ريادية حقيقية 🚀',
    'واضح إنك فاهم 💪',
  ],
  wrong: [
    'ليست أفضل إجابة 🤔',
    'فكّر مرة ثانية في القرار',
    'السوق أعقد مما يبدو 📉',
    'قريب، لكن مو هذه ⚖️',
    'كل خطأ درس للمستقبل 🌱',
  ],
  timeout: [
    'الوقت انتهى ⏰',
    'السوق ما ينتظر أحد ⌛',
  ],
  intro: [
    'يلا نبدأ 💪',
    'ركّز… وابدأ 🎯',
    'الوقت جزء من اللعبة ⏱️',
    'خارج الصندوق… يعني بره 📦',
  ],
};

/* ─── إدخال الاسم ─── */
export const NAME_RULES = {
  minLength: 2,
  maxLength: 30,
};

/* ─── قاعدة البيانات — Supabase ─── */
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
