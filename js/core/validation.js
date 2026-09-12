/*
  ══════════════════════════════════════════════════════════════
  التحقق من الاسم وتنظيفه — لا يعتمد على DOM (قابل للاختبار)
  الحماية: إزالة المحتوى الضار، تقييد الطول، دعم العربية والإنجليزية
  ══════════════════════════════════════════════════════════════
*/

import { NAME_RULES } from '../config.js';

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
const UNSAFE_LETTERS = /[<>{}()[\]\\/|;`"'=&%#*]/g;
const SCRIPT_MARKERS = /(script|javascript:|onerror|onload|onclick|onmouse|alert\(|eval\(|<\w+\s|document\.|window\.|iframe|embed|object)/i;
const SCRIPT_MARKERS_G = new RegExp(SCRIPT_MARKERS.source, 'ig');
const WHITESPACE = /\s+/g;

export function normalizeName(raw) {
  if (typeof raw !== 'string') return '';
  let name = raw.replace(CONTROL_CHARS, '');
  name = name.replace(WHITESPACE, ' ').trim();
  return name;
}

export function sanitizeName(raw) {
  return normalizeName(raw)
    .replace(UNSAFE_LETTERS, '')
    .replace(SCRIPT_MARKERS_G, '');
}

export function nameKey(name) {
  return sanitizeName(name).toLocaleLowerCase('ar').trim();
}

export function validateName(raw) {
  const rawNorm = normalizeName(raw);
  const normalized = sanitizeName(raw);
  const errors = [];

  if (!normalized) {
    errors.push('اكتب اسمك قبل ما تبدأ 😄');
    return { ok: false, name: '', errors };
  }

  if (SCRIPT_MARKERS.test(rawNorm)) {
    errors.push('اكتب اسمك بدون رموز أو أكواد غريبة.');
  }
  if (normalized.length < NAME_RULES.minLength) {
    errors.push(`الاسم قصير جدًا (الحد الأدنى ${NAME_RULES.minLength} حروف).`);
  }
  if (normalized.length > NAME_RULES.maxLength) {
    errors.push(`الاسم طويل جدًا (الحد الأقصى ${NAME_RULES.maxLength} حروف).`);
  }
  if (isRepeatedCharacterOnly(normalized)) {
    errors.push('اكتب اسمًا حقيقيًا 😅');
  }

  return errors.length
    ? { ok: false, name: '', errors }
    : { ok: true, name: normalized, errors: [] };
}

function isRepeatedCharacterOnly(name) {
  const squashed = name.replace(/\s/g, '');
  return squashed.length >= 3 && new Set(squashed).size === 1;
}

export function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}