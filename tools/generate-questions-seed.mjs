/*
  يولّد supabase/seed_questions.sql من بيانات الألغاز تلقائيًا.
  شغّله بعد أي تعديل على js/data/questions.js ثم طبّق الملف
  الناتج في Supabase SQL Editor حتى تبقى إعادة حساب النقاط متزامنة.
*/

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QUESTIONS } from '../js/data/questions.js';
import { SCORING } from '../js/config.js';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, '..', 'supabase', 'seed_questions.sql');

const stageOrder = Object.keys(SCORING.timeouts).map(Number).sort((a, b) => a - b);

const rows = [];
for (const stage of stageOrder) {
  for (const q of QUESTIONS[stage] || []) {
    const ans = q.type === 'visual'
      ? q.scene.items.findIndex((it) => it.isOdd)
      : q.answerIndex;
    rows.push({
      qid: q.id,
      stage,
      answer_index: ans,
      base_points: SCORING.basePoints[stage],
      timeout_sec: SCORING.timeouts[stage],
    });
  }
}

function esc(s) {
  return String(s).replace(/'/g, "''");
}

const values = rows
  .map((r) => `  ('${esc(r.qid)}', ${r.stage}, ${r.answer_index}, ${r.base_points}, ${r.timeout_sec})`)
  .join(',\n');

const content = [
  '-- ══════════════════════════════════════════════════════════════',
  '-- seed_questions.sql — يُولَّد تلقائيًا من js/data/questions.js',
  '-- شغّل هذا الملف بعد schema.sql. أعد توليده بعد أي تعديل على الألغاز',
  '-- ══════════════════════════════════════════════════════════════',
  '',
  'insert into public.question_map (qid, stage, answer_index, base_points, timeout_sec) values',
  values,
  'on conflict (qid) do update set',
  '  stage = excluded.stage,',
  '  answer_index = excluded.answer_index,',
  '  base_points = excluded.base_points,',
  '  timeout_sec = excluded.timeout_sec;',
  '',
].join('\n');

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, content, 'utf8');

const byStage = {};
for (const s of stageOrder) byStage[s] = (QUESTIONS[s] || []).length;

console.log(`تم توليد: ${outPath}`);
console.log('عدد الألغاز لكل مرحلة:', JSON.stringify(byStage), `(المجموع ${rows.length})`);