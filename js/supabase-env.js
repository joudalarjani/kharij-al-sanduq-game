/*
  إعدادات Supabase الفعلية تُحقن وقت النشر من GitHub Secrets عبر
  tools/build-config.mjs (تُكتب قيمها هنا في CI قبل رفع Artifact).
  هذه القيمة الافتراضية (فارغة) تفعّل الوضع التجريبي المحلي فقط.
  لا تضع هنا أي مفتاح سري — anonKey علني بطبيعته ومسموح نشره مع الموقع.
*/
export const SUPABASE_ENV = null;