-- موعدي — لوحة الإدارة (لصاحب التطبيق فقط)
-- شغّل هذا الملف مرة وحدة في Supabase ← SQL Editor (بعد setup.sql)
-- بعدها حدّد رمز الإدارة السري بنفسك بالسطر اللي في آخر الملف.

alter table public.mw_biz add column if not exists blocked boolean not null default false;
alter table public.mw_biz add column if not exists admin_note text not null default '';

-- المحل يظهر للزبائن فقط إذا مفعّل وغير موقوف من الإدارة واشتراكه أو فترته المجانية سارية
create or replace function public._mw_live(b public.mw_biz) returns boolean language sql stable as $$
  select b.active and not coalesce(b.blocked, false) and coalesce(greatest(b.paid_until, b.trial_until), b.trial_until) >= current_date $$;

create table if not exists public.mw_admin (
  id         int primary key default 1 check (id = 1),
  code_hash  text not null,
  fails      int not null default 0,
  locked_until timestamptz
);
alter table public.mw_admin enable row level security;
revoke all on public.mw_admin from anon, authenticated;

-- التحقق من رمز الإدارة: ٥ محاولات خاطئة = قفل ١٥ دقيقة (بدون raise عشان يتحفظ العدّاد)
create or replace function public._mw_admin_ok(p_code text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare a mw_admin;
begin
  select * into a from mw_admin where id = 1 for update;
  if a.id is null then return false; end if;
  if a.locked_until is not null and a.locked_until > now() then return false; end if;
  if a.code_hash = crypt(coalesce(p_code,''), a.code_hash) then
    update mw_admin set fails = 0, locked_until = null where id = 1; return true;
  end if;
  update mw_admin set fails = a.fails + 1,
    locked_until = case when a.fails + 1 >= 5 then now() + interval '15 minutes' else null end where id = 1;
  perform pg_sleep(0.6);
  return false;
end $$;
revoke all on function public._mw_admin_ok(text) from public, anon, authenticated;

create or replace function public._mw_admin_row(b public.mw_biz) returns json language sql stable set search_path = public as $$
  select json_build_object('id',b.id,'name',b.name,'cat',b.cat,'gov',b.gov,'wilayat',b.wilayat,'area',b.area,'phone',b.phone,
    'created',to_char(b.created_at at time zone 'Asia/Muscat','YYYY-MM-DD'),'trial_until',b.trial_until,'paid_until',b.paid_until,
    'active',b.active,'blocked',b.blocked,'note',b.admin_note,'live',_mw_live(b),
    'until', greatest(coalesce(b.paid_until, b.trial_until), b.trial_until),
    'paid', b.paid_until is not null and b.paid_until >= current_date,
    'books30',(select count(*) from mw_book k where k.biz_id = b.id and k.created_at > now() - interval '30 days'),
    'reports',(select count(*) from mw_reports r where r.biz_id = b.id)) $$;

create or replace function public.mw_admin_list(p_code text) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not _mw_admin_ok(p_code) then return json_build_object('err','الرمز غير صحيح أو مقفل مؤقتاً'); end if;
  return json_build_object('ok', true,
    'biz', (select coalesce(json_agg(_mw_admin_row(b) order by b.created_at desc), '[]'::json) from mw_biz b),
    'stats', json_build_object(
      'total', (select count(*) from mw_biz),
      'paid',  (select count(*) from mw_biz where paid_until >= current_date),
      'trial', (select count(*) from mw_biz where (paid_until is null or paid_until < current_date) and trial_until >= current_date),
      'expired', (select count(*) from mw_biz where greatest(coalesce(paid_until, trial_until), trial_until) < current_date),
      'books30', (select count(*) from mw_book where created_at > now() - interval '30 days')),
    'reports', (select coalesce(json_agg(json_build_object('biz', r.biz_id, 'name', b.name, 'reason', r.reason,
        'at', to_char(r.created_at at time zone 'Asia/Muscat','YYYY-MM-DD HH24:MI')) order by r.created_at desc), '[]'::json)
      from (select * from mw_reports order by created_at desc limit 50) r left join mw_biz b on b.id = r.biz_id));
end $$;

-- تمديد الاشتراك بعدد أشهر (يبدأ من نهاية الاشتراك الحالي أو من اليوم)، أو إلغاؤه بـ 0
create or replace function public.mw_admin_extend(p_code text, p_id uuid, p_months int) returns json
language plpgsql security definer set search_path = public as $$
declare b mw_biz; base date;
begin
  if not _mw_admin_ok(p_code) then return json_build_object('err','الرمز غير صحيح أو مقفل مؤقتاً'); end if;
  if p_months is null or p_months < 0 or p_months > 24 then return json_build_object('err','عدد أشهر غير صحيح'); end if;
  select * into b from mw_biz where id = p_id for update;
  if b.id is null then return json_build_object('err','المحل غير موجود'); end if;
  if p_months = 0 then update mw_biz set paid_until = null where id = p_id;
  else
    -- يبدأ بعد آخر يوم مدفوع أو آخر يوم مجاني (عشان ما يخسر المحل أيامه المجانية)
    base := greatest(coalesce(b.paid_until, current_date), b.trial_until, current_date);
    update mw_biz set paid_until = (base + make_interval(months => p_months))::date where id = p_id;
  end if;
  select * into b from mw_biz where id = p_id;
  return json_build_object('ok', true, 'biz', _mw_admin_row(b));
end $$;

-- إضافة أيام مجانية (تمديد الفترة التجريبية)
create or replace function public.mw_admin_trial(p_code text, p_id uuid, p_days int) returns json
language plpgsql security definer set search_path = public as $$
declare b mw_biz;
begin
  if not _mw_admin_ok(p_code) then return json_build_object('err','الرمز غير صحيح أو مقفل مؤقتاً'); end if;
  if p_days is null or p_days < 1 or p_days > 365 then return json_build_object('err','عدد أيام غير صحيح'); end if;
  update mw_biz set trial_until = greatest(trial_until, current_date) + p_days where id = p_id returning * into b;
  if b.id is null then return json_build_object('err','المحل غير موجود'); end if;
  return json_build_object('ok', true, 'biz', _mw_admin_row(b));
end $$;

-- إيقاف أو إرجاع محل (يختفي عن الزبائن)، مع ملاحظة
create or replace function public.mw_admin_block(p_code text, p_id uuid, p_blocked boolean, p_note text) returns json
language plpgsql security definer set search_path = public as $$
declare b mw_biz;
begin
  if not _mw_admin_ok(p_code) then return json_build_object('err','الرمز غير صحيح أو مقفل مؤقتاً'); end if;
  update mw_biz set blocked = coalesce(p_blocked, false), admin_note = left(coalesce(p_note, admin_note), 200) where id = p_id returning * into b;
  if b.id is null then return json_build_object('err','المحل غير موجود'); end if;
  return json_build_object('ok', true, 'biz', _mw_admin_row(b));
end $$;

revoke all on function public._mw_admin_row(public.mw_biz) from public, anon, authenticated;
grant execute on function public.mw_admin_list(text), public.mw_admin_extend(text,uuid,int),
  public.mw_admin_trial(text,uuid,int), public.mw_admin_block(text,uuid,boolean,text) to anon, authenticated;

-- ⬇️ آخر خطوة: اكتب رمزك السري بدل «اكتب_رمزك_هنا» (١٠ أحرف أو أكثر، لا ترسله لأحد) وشغّل السطر:
-- insert into public.mw_admin(id, code_hash) values (1, extensions.crypt('اكتب_رمزك_هنا', extensions.gen_salt('bf')))
--   on conflict (id) do update set code_hash = excluded.code_hash, fails = 0, locked_until = null;
