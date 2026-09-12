/*
  يُولّد js/supabase-env.js قيم Supabase من متغيرات البيئة وقت البناء (GitHub Actions).
  التشغيل: node tools/build-config.mjs
  المتغيرات:
    SUPABASE_URL       = Project URL (مثال: https://xxxx.supabase.co)
    SUPABASE_ANON_KEY  = anon public key (علني وليس سريًا)
  إذا كانا غير معرّفين يُكتب ملف فارغ → يعمل الموقع في الوضع التجريبي المحلي.
*/
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = (process.env.SUPABASE_URL || '').trim();
const anonKey = (process.env.SUPABASE_ANON_KEY || '').trim();

const content = `/* ملف مولّد آليًا بواسطة tools/build-config.mjs — لا تعدّله يدويًا. */
export const SUPABASE_ENV = {
  url: ${JSON.stringify(url)},
  anonKey: ${JSON.stringify(anonKey)},
};
`;

writeFileSync(join(root, 'js', 'supabase-env.js'), content, 'utf8');
console.log(`supabase-env.js → url: ${url ? '✓ مضبوط' : 'فارغ (وضع محلي)'} | anonKey: ${anonKey ? '✓ مضبوط' : 'فارغ (وضع محلي)'}`);