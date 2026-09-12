-- ══════════════════════════════════════════════════════════════
-- seed_questions.sql — يُولَّد تلقائيًا من js/data/questions.js
-- شغّل هذا الملف بعد schema.sql. أعد توليده بعد أي تعديل على الألغاز
-- ══════════════════════════════════════════════════════════════

insert into public.question_map (qid, stage, answer_index, base_points, timeout_sec) values
  ('s1-q1', 1, 0, 100, 10),
  ('s1-q2', 1, 0, 100, 10),
  ('s1-q3', 1, 0, 100, 10),
  ('s2-q1', 2, 3, 150, 8),
  ('s2-q2', 2, 3, 150, 8),
  ('s2-q3', 2, 4, 150, 8),
  ('s3-q1', 3, 0, 200, 12),
  ('s3-q2', 3, 0, 200, 12),
  ('s3-q3', 3, 0, 200, 12),
  ('s4-q1', 4, 0, 300, 15),
  ('s4-q2', 4, 0, 300, 15),
  ('s4-q3', 4, 0, 300, 15)
on conflict (qid) do update set
  stage = excluded.stage,
  answer_index = excluded.answer_index,
  base_points = excluded.base_points,
  timeout_sec = excluded.timeout_sec;
