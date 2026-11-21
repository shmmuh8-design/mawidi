-- موعدي: قاعدة البيانات — انسخ الملف كامل والصقه في Supabase ← SQL Editor واضغط Run
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.mw_biz (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 2 and 60),
  cat         text not null check (cat in ('barber','salon','dental','clinic','beauty','carwash','garage','gym','photo','other')),
  gov         text not null check (char_length(gov) between 2 and 30),
  wilayat     text not null check (char_length(wilayat) between 2 and 40),
  area        text not null default '' check (char_length(area) <= 60),
  phone       text not null unique check (phone ~ '^[0-9]{8,15}$'),
  about       text not null default '' check (char_length(about) <= 200),
  days        int[] not null default '{0,1,2,3,4,6}',
  open_t      time not null default '09:00',
  close_t     time not null default '21:00',
  slot_min    int  not null default 30 check (slot_min in (10,15,20,30,45,60,90,120)),
  cap         int  not null default 1 check (cap between 1 and 10),
  services    jsonb not null default '[]',
  active      boolean not null default true,
  trial_until date not null default (current_date + 30),
  paid_until  date,
  code_hash   text not null
);
create table if not exists public.mw_book (
  id         bigserial primary key,
  biz_id     uuid not null references public.mw_biz(id) on delete cascade,
  day        date not null,
  t          time not null,
  name       text not null check (char_length(name) between 2 and 40),
  phone      text not null check (phone ~ '^[0-9]{8,15}$'),
  service    text not null default '' check (char_length(service) <= 60),
  code       text not null unique,
  status     text not null default 'booked' check (status in ('booked','done','cancelled','noshow')),
  created_at timestamptz not null default now()
);
create index if not exists mw_book_biz_day on public.mw_book(biz_id, day);
create table if not exists public.mw_reports (
  id bigserial primary key, biz_id uuid references public.mw_biz(id) on delete cascade,
  reason text not null default '', created_at timestamptz not null default now()
);
alter table public.mw_biz     enable row level security;
alter table public.mw_book    enable row level security;
alter table public.mw_reports enable row level security;
revoke all on public.mw_biz, public.mw_book, public.mw_reports from anon, authenticated;

-- helpers -------------------------------------------------------------
create or replace function public._mw_now() returns timestamp language sql stable as $$ select (now() at time zone 'Asia/Muscat') $$;
create or replace function public._mw_live(b public.mw_biz) returns boolean language sql stable as $$
  select b.active and coalesce(greatest(b.paid_until, b.trial_until), b.trial_until) >= current_date $$;
create or replace function public._mw_pub(b public.mw_biz) returns json language sql stable as $$
  select json_build_object('id',b.id,'name',b.name,'cat',b.cat,'gov',b.gov,'wilayat',b.wilayat,'area',b.area,'phone',b.phone,
    'about',b.about,'days',b.days,'open',to_char(b.open_t,'HH24:MI'),'close',to_char(b.close_t,'HH24:MI'),'slot',b.slot_min,'services',b.services) $$;
create or replace function public._mw_auth(p_phone text, p_code text) returns public.mw_biz
language plpgsql security definer set search_path = public, extensions as $$
declare b mw_biz;
begin
  select * into b from mw_biz where phone = p_phone;
  if b.id is null or b.code_hash <> crypt(p_code, b.code_hash) then raise exception 'رقم الهاتف أو الرمز غير صحيح'; end if;
  return b;
end $$;
revoke all on function public._mw_auth(text,text) from public, anon, authenticated;
create or replace function public._mw_clean_services(p jsonb) returns jsonb language sql immutable as $$
  select coalesce(jsonb_agg(jsonb_build_object('n', left(trim(e->>'n'),40), 'p', least(greatest(coalesce((e->>'p')::numeric,0),0),9999))), '[]'::jsonb)
  from (select e from jsonb_array_elements(case when jsonb_typeof(p)='array' then p else '[]'::jsonb end) e limit 30) x
  where coalesce(trim(e->>'n'),'') <> '' $$;

-- public (customers) --------------------------------------------------
create or replace function public.mw_list(p_cat text, p_gov text, p_wilayat text) returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(_mw_pub(b) order by b.created_at desc), '[]'::json) from mw_biz b
  where _mw_live(b) and (p_cat is null or p_cat = '' or b.cat = p_cat)
    and (p_gov is null or p_gov = '' or b.gov = p_gov) and (p_wilayat is null or p_wilayat = '' or b.wilayat = p_wilayat) $$;
create or replace function public.mw_get(p_id uuid) returns json
language sql stable security definer set search_path = public as $$
  select _mw_pub(b) from mw_biz b where b.id = p_id and _mw_live(b) $$;

create or replace function public.mw_slots(p_id uuid, p_day date) returns json
language plpgsql stable security definer set search_path = public as $$
declare b mw_biz; st time; outa json[] := '{}'; used int; nowl timestamp := _mw_now();
begin
  select * into b from mw_biz where id = p_id;
  if b.id is null or not _mw_live(b) then return '[]'::json; end if;
  if p_day < nowl::date or p_day > nowl::date + 30 or not (extract(dow from p_day)::int = any(b.days)) then return '[]'::json; end if;
  st := b.open_t;
  while st + make_interval(mins => b.slot_min) <= b.close_t and st >= b.open_t and coalesce(array_length(outa,1),0) < 96 loop
    if p_day + st > nowl + interval '15 minutes' then
      select count(*) into used from mw_book k where k.biz_id = b.id and k.day = p_day and k.t = st and k.status in ('booked','done');
      outa := outa || json_build_object('t', to_char(st,'HH24:MI'), 'left', b.cap - used);
    end if;
    exit when st + make_interval(mins => b.slot_min) < st;
    st := st + make_interval(mins => b.slot_min);
  end loop;
  return array_to_json(outa);
end $$;

create or replace function public.mw_book(p_id uuid, p_day date, p_t text, p_name text, p_phone text, p_service text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare b mw_biz; tt time := p_t::time; used int; c text; nowl timestamp := _mw_now();
begin
  select * into b from mw_biz where id = p_id for update;
  if b.id is null or not _mw_live(b) then raise exception 'المحل غير متاح'; end if;
  if p_day < nowl::date or p_day > nowl::date + 30 or not (extract(dow from p_day)::int = any(b.days)) then raise exception 'اليوم غير متاح'; end if;
  if p_day + tt <= nowl or tt < b.open_t or tt + make_interval(mins => b.slot_min) > b.close_t
     or (extract(epoch from (tt - b.open_t))::int / 60) % b.slot_min <> 0 then raise exception 'الوقت غير متاح'; end if;
  select count(*) into used from mw_book where biz_id = b.id and day = p_day and t = tt and status in ('booked','done');
  if used >= b.cap then raise exception 'هذا الوقت انحجز، اختر وقت ثاني'; end if;
  if (select count(*) from mw_book where biz_id = b.id and phone = p_phone and day = p_day and status = 'booked') >= 2 then raise exception 'عندك حجزين في نفس اليوم'; end if;
  c := upper(substr(encode(gen_random_bytes(6),'hex'),1,8));
  insert into mw_book(biz_id, day, t, name, phone, service, code) values (b.id, p_day, tt, trim(p_name), p_phone, left(coalesce(p_service,''),60), c);
  return json_build_object('code', c);
end $$;

create or replace function public.mw_my(p_codes text[]) returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('code',k.code,'day',k.day,'t',to_char(k.t,'HH24:MI'),'service',k.service,'status',k.status,
    'biz',json_build_object('id',b.id,'name',b.name,'cat',b.cat,'phone',b.phone,'wilayat',b.wilayat,'area',b.area)) order by k.day, k.t), '[]'::json)
  from mw_book k join mw_biz b on b.id = k.biz_id where k.code = any(p_codes[1:50]) $$;
create or replace function public.mw_cancel(p_code text) returns json
language sql security definer set search_path = public as $$
  update mw_book set status = 'cancelled' where code = p_code and status = 'booked' and day + t > _mw_now() returning json_build_object('ok', true) $$;
create or replace function public.mw_report(p_id uuid, p_reason text) returns void
language sql security definer set search_path = public as $$
  insert into mw_reports(biz_id, reason) values (p_id, left(coalesce(p_reason,''),500)) $$;

-- businesses ----------------------------------------------------------
create or replace function public.mw_biz_new(p jsonb, p_code text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare id uuid;
begin
  if p_code !~ '^[0-9]{4,8}$' then raise exception 'الرمز لازم يكون من 4 إلى 8 أرقام'; end if;
  if coalesce((p->>'close')::time,'21:00') <= coalesce((p->>'open')::time,'09:00') then raise exception 'وقت الإغلاق لازم يكون بعد وقت الفتح'; end if;
  if false then raise exception 'الرمز لازم يكون من 4 إلى 8 أرقام'; end if;
  if exists(select 1 from mw_biz where phone = p->>'phone') then raise exception 'هذا الرقم مسجّل، ادخل بحسابك'; end if;
  insert into mw_biz(name,cat,gov,wilayat,area,phone,about,open_t,close_t,slot_min,code_hash)
  values (trim(p->>'name'), p->>'cat', p->>'gov', p->>'wilayat', coalesce(trim(p->>'area'),''), p->>'phone', coalesce(trim(p->>'about'),''),
    coalesce((p->>'open')::time,'09:00'), coalesce((p->>'close')::time,'21:00'), coalesce((p->>'slot')::int,30), crypt(p_code, gen_salt('bf')))
  returning mw_biz.id into id;
  return json_build_object('id', id);
end $$;
create or replace function public.mw_biz_me(p_phone text, p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare b mw_biz := _mw_auth(p_phone, p_code);
begin
  return (_mw_pub(b)::jsonb || jsonb_build_object('cap',b.cap,'active',b.active,'trial_until',b.trial_until,'paid_until',b.paid_until,'live',_mw_live(b)))::json;
end $$;
create or replace function public.mw_biz_save(p_phone text, p_code text, p jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare b mw_biz := _mw_auth(p_phone, p_code);
begin
  update mw_biz set
    name = coalesce(nullif(trim(p->>'name'),''), name), cat = coalesce(p->>'cat', cat), gov = coalesce(p->>'gov', gov), wilayat = coalesce(p->>'wilayat', wilayat),
    area = coalesce(p->>'area', area), about = left(coalesce(p->>'about', about),200),
    days = coalesce((select array_agg(x::int) from jsonb_array_elements_text(p->'days') x where x ~ '^[0-6]$'), days),
    open_t = coalesce((p->>'open')::time, open_t), close_t = coalesce((p->>'close')::time, close_t),
    slot_min = coalesce((p->>'slot')::int, slot_min), cap = coalesce((p->>'cap')::int, cap),
    services = case when p ? 'services' then _mw_clean_services(p->'services') else services end,
    active = coalesce((p->>'active')::boolean, active)
  where id = b.id;
  if (select close_t <= open_t from mw_biz where id = b.id) then raise exception 'وقت الإغلاق لازم يكون بعد وقت الفتح'; end if;
  return mw_biz_me(p_phone, p_code);
end $$;
create or replace function public.mw_biz_day(p_phone text, p_code text, p_day date) returns json
language plpgsql security definer set search_path = public as $$
declare b mw_biz := _mw_auth(p_phone, p_code);
begin
  return (select coalesce(json_agg(json_build_object('id',k.id,'t',to_char(k.t,'HH24:MI'),'name',k.name,'phone',k.phone,'service',k.service,'status',k.status) order by k.t), '[]'::json)
          from mw_book k where k.biz_id = b.id and k.day = p_day);
end $$;
create or replace function public.mw_biz_stats(p_phone text, p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare b mw_biz := _mw_auth(p_phone, p_code); d date := _mw_now()::date;
begin
  return json_build_object(
    'today', (select count(*) from mw_book where biz_id=b.id and day=d and status<>'cancelled'),
    'week',  (select count(*) from mw_book where biz_id=b.id and day between d and d+6 and status<>'cancelled'),
    'month', (select count(*) from mw_book where biz_id=b.id and day >= date_trunc('month', d) and status in ('booked','done')),
    'noshow',(select count(*) from mw_book where biz_id=b.id and day >= d-30 and status='noshow'));
end $$;
create or replace function public.mw_biz_set(p_phone text, p_code text, p_id bigint, p_status text) returns json
language plpgsql security definer set search_path = public as $$
declare b mw_biz := _mw_auth(p_phone, p_code);
begin
  if p_status not in ('booked','done','cancelled','noshow') then raise exception 'حالة غير صحيحة'; end if;
  update mw_book set status = p_status where id = p_id and biz_id = b.id;
  return json_build_object('ok', true);
end $$;
create or replace function public.mw_biz_delete(p_phone text, p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare b mw_biz := _mw_auth(p_phone, p_code);
begin delete from mw_biz where id = b.id; return json_build_object('ok', true); end $$;

grant execute on function public.mw_list(text,text,text), public.mw_get(uuid), public.mw_slots(uuid,date),
  public.mw_book(uuid,date,text,text,text,text), public.mw_my(text[]), public.mw_cancel(text), public.mw_report(uuid,text),
  public.mw_biz_new(jsonb,text), public.mw_biz_me(text,text), public.mw_biz_save(text,text,jsonb), public.mw_biz_day(text,text,date),
  public.mw_biz_stats(text,text), public.mw_biz_set(text,text,bigint,text), public.mw_biz_delete(text,text) to anon, authenticated;
