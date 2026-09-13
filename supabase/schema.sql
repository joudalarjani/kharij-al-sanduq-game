-- ══════════════════════════════════════════════════════════════
--  خارج الصندوق — مخطط قاعدة بيانات Supabase
--  شغّل هذا الملف كاملًا من:  Supabase Dashboard → SQL Editor
--
--  بعد ذلك شغّل:  seed_questions.sql   (يُولَّد تلقائيًا من
--  ملف الألغاز js/data/questions.js — لا تعدّله يدويًا)
--
--  الحماية:
--   • الجداول موصولة بـ RLS ومحرومة الوصول المباشر من anon.
--   • كل الإدراج يتم حصريًا عبر دوال SECURITY DEFINER تعيد
--     حساب النقاط على الخادم من أحداث اللعب ولا تقبل "score" مرسل.
-- ══════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ────────── جداول ──────────
create table if not exists public.question_map (
  qid          text primary key,
  stage        integer not null check (stage between 1 and 4),
  type         text not null,
  answer_index integer not null check (answer_index >= 0),
  base_points  integer not null check (base_points > 0),
  timeout_sec  numeric not null check (timeout_sec > 0)
);

create table if not exists public.entries (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  name_key       text not null,
  score          integer not null check (score >= 0 and score <= 9999),
  total_seconds  numeric not null check (total_seconds > 0 and total_seconds <= 1800),
  stage_results  jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists entries_rank_idx   on public.entries (score desc, total_seconds asc);
create index if not exists entries_name_idx   on public.entries (name_key);
create index if not exists entries_created_at on public.entries (created_at);

create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  name_key   text not null,
  rating     integer not null check (rating between 1 and 5),
  message    text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists feedback_name_idx on public.feedback (name_key);

-- ────────── عزل الوصول المباشر ──────────
alter table public.entries      enable row level security;
alter table public.feedback     enable row level security;
alter table public.question_map enable row level security;

revoke all on public.entries      from anon, authenticated;
revoke all on public.feedback     from anon, authenticated;
revoke all on public.question_map from anon, authenticated;

-- ────────── الدوال المساعدة ──────────
create or replace function public.sanitize_name(p text)
returns text language sql immutable
as $$
  select rtrim(ltrim(regexp_replace(
    regexp_replace(regexp_replace(p, E'[\\u0000-\\u001F\\u007F]', '', 'g'),
                  E'[<>{}()\\[\\]\\\\/|;`"''=&%#*]', '', 'g'),
    '\s+', ' ', 'g')))
$$;

-- أفضل نتيجة لكل اسم، مرتبة (نقاط تنازليًا ثم زمن تصاعديًا لكسر التعادل)
create or replace function public.ranked_entries()
returns table (rank bigint, name text, name_key text, score integer, total_seconds numeric)
language sql
security definer
set search_path = public
as $$
  select row_number() over (order by score desc, total_seconds asc) as rank,
         name, name_key, score, total_seconds
  from (
    select distinct on (name_key) name, name_key, score, total_seconds
    from public.entries
    order by name_key, score desc, total_seconds asc
  ) best;
$$;

-- ────────── إرسال اللعبة وإعادة حساب النقاط ──────────
create or replace function public.submit_game(p_name text, p_events jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name       text;
  v_key        text;
  v_score      integer := 0;
  v_secs       numeric := 0;
  v_ev         jsonb;
  v_qid        text;
  v_selected   jsonb;
  v_remaining  numeric;
  v_total      numeric;
  v_elapsed    numeric;
  v_map        record;
  v_base       numeric;
  v_mult       numeric;
  v_stage_max  numeric;
  v_points     integer;
  v_rate       integer;
  v_rank       integer;
  v_total_cnt  integer;
  v_best3      jsonb;
  v_is_correct boolean;
begin
  v_name := public.sanitize_name(coalesce(p_name, ''));
  if length(v_name) < 2 or length(v_name) > 30 then
    return jsonb_build_object('ok', false, 'reason', 'bad_name');
  end if;
  v_key := lower(v_name);

  -- حماية: حد أقصى 5 محاولات لكل اسم خلال الساعة
  select count(*) into v_rate
  from public.entries
  where name_key = v_key and created_at > now() - interval '60 minutes';
  if v_rate >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'rate_limit');
  end if;

  if jsonb_typeof(p_events) <> 'array' then
    return jsonb_build_object('ok', false, 'reason', 'bad_events');
  end if;

  -- إعادة الحساب من أحداث اللعب فقط (لا نقبل score من المتصفح إطلاقًا)
  for v_ev in select e from jsonb_array_elements(p_events) as e loop
    v_qid := v_ev ->> 'qid';
    select qid, stage, answer_index, base_points, timeout_sec
      into v_map
      from public.question_map
      where qid = v_qid;
    if not found then
      continue; -- سؤال غير معروف: لا يُمنح نقاط
    end if;

    v_remaining := coalesce((v_ev ->> 'remainingMs')::numeric, 0);
    v_total     := coalesce((v_ev ->> 'totalMs')::numeric, v_map.timeout_sec * 1000);
    v_elapsed   := coalesce((v_ev ->> 'elapsedMs')::numeric,
                            greatest(0, v_total - v_remaining));

    -- قواعد زمنية صارمة
    if v_total < 1000 then v_total := v_map.timeout_sec * 1000; end if;
    if v_total > (v_map.timeout_sec * 1000) then v_total := v_map.timeout_sec * 1000; end if;
    if v_elapsed > (v_map.timeout_sec * 1000) then v_elapsed := v_map.timeout_sec * 1000; end if;
    if v_elapsed < 0 then v_elapsed := 0; end if;
    if v_remaining < 0 then v_remaining := 0; end if;
    if v_remaining > v_total then v_remaining := v_total; end if;

    -- التحقق من الصحة حسب نوع السؤال
    v_selected := v_ev -> 'selected';
    v_is_correct := false;

    case v_map.type
      when 'mc', 'decision', 'whatWould', 'scenario', 'visual' then
        v_is_correct := (v_selected #>> '{}') is not null
                        and ((v_selected #>> '{}')::integer) = v_map.answer_index;
      when 'findError', 'truefalse', 'word' then
        v_is_correct := v_selected #>> '{}' = (v_ev ->> 'expected');
      when 'match' then
        v_is_correct := ((v_selected -> 'correctPairs')::integer) = ((v_selected -> 'totalPairs')::integer);
      when 'order' then
        v_is_correct := (v_selected ->> 'isCorrect')::boolean;
      when 'calc' then
        v_is_correct := v_selected #>> '{}' = (v_ev ->> 'expected');
      else
        v_is_correct := false;
    end case;

    v_base       := v_map.base_points;
    v_mult       := case v_map.stage when 1 then 1.0 when 2 then 1.15 when 3 then 1.3 else 1.6 end;
    v_stage_max  := v_base * v_mult;
    v_points     := 0;

    if v_is_correct then
      v_points := round(v_stage_max + v_stage_max * 0.5 * v_remaining / greatest(v_total, 1))::integer;
    end if;

    v_score := v_score + v_points;
    v_secs  := v_secs + (v_elapsed / 1000);
  end loop;

  -- مكافأة الإكمال المثالي
  if (select bool_and((e ->> 'correct')::boolean) from jsonb_array_elements(p_events) e) then
    v_score := v_score + 100;
  end if;

  v_secs := greatest(0.1, v_secs);

  insert into public.entries (name, name_key, score, total_seconds, stage_results)
  values (v_name, v_key, v_score, v_secs, p_events);

  -- ترتيب "أفضل نتيجة لكل اسم" فقط
  select rank into v_rank
  from public.ranked_entries() where name_key = v_key limit 1;

  select count(*) into v_total_cnt from public.ranked_entries();

  select coalesce(jsonb_agg(jsonb_build_object(
           'rank', rank, 'name', name, 'score', score,
           'total_seconds', total_seconds) order by rank), '[]'::jsonb)
  into v_best3
  from public.ranked_entries() where rank <= 3;

  return jsonb_build_object(
    'ok', true,
    'score', v_score,
    'total_seconds', v_secs,
    'rank', coalesce(v_rank, 0),
    'total', v_total_cnt,
    'best3', v_best3
  );
end;
$$;

-- ────────── لوحة المتصدرين (أفضل نتيجة لكل اسم) ──────────
create or replace function public.get_leaderboard()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
               'rank', rank, 'name', name, 'name_key', name_key,
               'score', score, 'total_seconds', total_seconds) order by rank)
      from public.ranked_entries()), '[]'::jsonb),
    'total', (select count(*) from public.ranked_entries())
  );
$$;

-- ────────── التقييم والاقتراحات ──────────
create or replace function public.submit_feedback(
  p_name    text,
  p_rating  integer,
  p_message text default ''
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name       text;
  v_key        text;
  v_rated      integer;
  v_existing   integer;
  v_msg        text;
begin
  v_name := public.sanitize_name(coalesce(p_name, ''));
  v_key  := lower(v_name);
  v_msg  := rtrim(ltrim(coalesce(p_message, '')));

  if length(v_name) < 2 then
    return jsonb_build_object('ok', false, 'reason', 'bad_name');
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    return jsonb_build_object('ok', false, 'reason', 'bad_rating');
  end if;
  if length(v_msg) > 500 then
    v_msg := left(v_msg, 500);
  end if;

  -- يجب أن يكون اللاعب مسجلًا في اللوحة مؤخرًا
  select count(*) into v_existing
  from public.entries
  where name_key = v_key and created_at > now() - interval '7 days'
  limit 1;
  if v_existing = 0 then
    return jsonb_build_object('ok', false, 'reason', 'no_entry');
  end if;

  -- تقييم واحد للاسم في اليوم
  select count(*) into v_rated
  from public.feedback
  where name_key = v_key and created_at > now() - interval '1 day';
  if v_rated >= 1 then
    return jsonb_build_object('ok', false, 'reason', 'rate_limit');
  end if;

  insert into public.feedback (name, name_key, rating, message)
  values (v_name, v_key, p_rating, v_msg);

  return jsonb_build_object('ok', true);
end;
$$;

-- ────────── منح صلاحيات التنفيذ فقط ──────────
grant execute on function public.submit_game(text, jsonb)        to anon, authenticated;
grant execute on function public.get_leaderboard()               to anon, authenticated;
grant execute on function public.submit_feedback(text, integer, text) to anon, authenticated;

-- ملاحظة: الوضع التجريبي المحلي في المتصفح لا يتطلب أيًا مما سبق حتى يتم الربط.
