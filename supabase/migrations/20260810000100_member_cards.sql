-- 회원 카드 — 자립형 스키마 (전용 Supabase 프로젝트 "profile card")
--
-- 이 프로젝트는 회원 카드 전용이다. 결제앱/예약앱과 DB를 공유하지 않으므로
-- 지점·권한 체계도 여기서 자체적으로 만든다.
--
-- 설계 요지
--   · staff             : 로그인 계정의 권한. 가입만으로는 아무것도 못 본다(pending).
--   · member_snapshots  : 회원 앱 엑셀에서 온 사실값. 시드가 매주 덮어쓴다.
--   · member_profiles   : 코치가 입력한 판단값. 시드가 절대 건드리지 않는다.
--   · member_cards      : 위 둘을 합친 화면용 뷰.
--
-- 스냅샷과 프로필을 가른 이유: 매주 엑셀을 다시 밀어넣어도 코치가 쌓아온 기록이 살아남아야 한다.

-- ── 지점 ────────────────────────────────────────────────────
create table if not exists public.boxes (
  id           text primary key,
  display_name text not null
);

insert into public.boxes (id, display_name) values
  ('발리인미사', '크로스핏 발리인미사'),
  ('메이커스',   '크로스핏 메이커스')
on conflict (id) do nothing;

-- ── 스태프(로그인 계정) ──────────────────────────────────────
-- ⚠️ 기본 role 은 'pending' 이다. Supabase 는 기본적으로 공개 가입이 열려 있어서,
--    가입 즉시 권한을 주면 아무나 회원 정보를 보게 된다. 관장님이 직접 올려줘야 한다.
create table if not exists public.staff (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null default '',
  display_name text not null default '',
  role         text not null default 'pending'
                 check (role in ('pending','coach','manager','owner')),
  box          text references public.boxes(id),   -- null = 전 지점(대표)
  created_at   timestamptz not null default now()
);

comment on column public.staff.role is
  'pending=권한없음(가입 직후 기본값) / coach·manager=자기 지점 / owner=전 지점';
comment on column public.staff.box is
  'null 이면 전 지점. owner 가 아니면서 box 가 null 이면 아무것도 못 본다.';

-- 가입하면 권한 없는 staff 행을 자동으로 만든다
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.staff (id, email, display_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 권한 헬퍼 ───────────────────────────────────────────────
-- staff 자신에 대한 RLS 재귀를 피하려고 security definer 로 둔다.
-- 이름을 my_role 로 쓴다 — current_role 은 Postgres 예약어라 스키마를 안 붙이면
-- 내장 함수가 불려 'authenticated' 가 돌아오고 권한 검사가 조용히 통과해 버린다.
create or replace function public.role_rank(p_role text)
returns int language sql immutable set search_path = '' as $$
  select case p_role when 'owner' then 3 when 'manager' then 2 when 'coach' then 1 else 0 end
$$;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select s.role from public.staff s where s.id = auth.uid()), 'pending')
$$;

create or replace function public.current_box()
returns text language sql stable security definer set search_path = '' as $$
  select s.box from public.staff s where s.id = auth.uid()
$$;

create or replace function public.has_role(p_min text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.role_rank(public.my_role()) >= public.role_rank(p_min)
$$;

-- 내부 판정용이라 클라이언트가 직접 부를 이유가 없다
revoke execute on function public.role_rank(text) from public, anon, authenticated;

-- ── 회원 사실값 (엑셀 동기화) ────────────────────────────────
create table if not exists public.member_snapshots (
  box            text not null references public.boxes(id),
  name           text not null,
  status         text not null default '',        -- 활성 / 만료 / 정지 / 비활성
  plan           text not null default '',
  plan_start     date,
  plan_end       date,
  joined_on      date,
  last_attended  date,
  synced_at      timestamptz not null default now(),
  primary key (box, name)
);

comment on column public.member_snapshots.joined_on is
  '앱 가입일. 2026-06-10~12 대량 이관으로 회원 다수가 이 사흘에 몰려 있어 실제 운동시작일이 아니다. 근속은 member_profiles.started_on 을 우선한다.';

-- ── 코치 입력값 ─────────────────────────────────────────────
create table if not exists public.member_profiles (
  box          text not null references public.boxes(id),
  name         text not null,
  cap_weight   smallint not null default 0 check (cap_weight between 0 and 5),  -- 역도
  cap_gym      smallint not null default 0 check (cap_gym    between 0 and 5),  -- 체조
  cap_metcon   smallint not null default 0 check (cap_metcon between 0 and 5),  -- 유산소
  goal         text not null default '',
  trait        text not null default '',
  risk         text not null default '',
  started_on   date,
  note         text not null default '',
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users(id),
  primary key (box, name)
);

comment on table public.member_profiles is
  '코치가 관찰해 입력하는 프로필. 운동 역량 3축(0=미평가, 1~5)과 특성. 시드가 덮어쓰지 않는다.';

create index if not exists member_snapshots_status_idx   on public.member_snapshots (box, status);
create index if not exists member_snapshots_attended_idx on public.member_snapshots (last_attended);

-- updated_at / updated_by 자동 기록
create or replace function public.touch_member_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists member_profiles_touch on public.member_profiles;
create trigger member_profiles_touch
  before insert or update on public.member_profiles
  for each row execute function public.touch_member_profile();

-- ── RLS ─────────────────────────────────────────────────────
-- 행과 무관한 조건은 (select ...) 로 감싸 쿼리당 1회만 평가되게 한다.
-- 행에 의존하는 조건은 box 상수 비교뿐이라 (box,name) PK 인덱스를 탄다.
alter table public.boxes            enable row level security;
alter table public.staff            enable row level security;
alter table public.member_snapshots enable row level security;
alter table public.member_profiles  enable row level security;

drop policy if exists boxes_read           on public.boxes;
drop policy if exists staff_read_self      on public.staff;
drop policy if exists staff_owner_all      on public.staff;
drop policy if exists snapshots_staff_read on public.member_snapshots;
drop policy if exists snapshots_owner_all  on public.member_snapshots;
drop policy if exists profiles_staff_all   on public.member_profiles;

-- 지점 목록은 로그인한 사람이면 읽어도 무방하다(회원 정보 아님)
create policy boxes_read on public.boxes
  for select to authenticated using (true);

-- 본인 권한은 본인이 확인할 수 있어야 화면이 "권한 없음"을 안내할 수 있다
create policy staff_read_self on public.staff
  for select to authenticated using (id = (select auth.uid()));

-- 권한 부여/회수는 대표만
create policy staff_owner_all on public.staff
  for all to authenticated
  using ((select public.my_role()) = 'owner')
  with check ((select public.my_role()) = 'owner');

-- 회원 사실값: 코치 이상 읽기. 쓰기는 대표만(=시드 스크립트는 service_role 이라 RLS 우회).
create policy snapshots_staff_read on public.member_snapshots
  for select to authenticated
  using (
    (select public.has_role('coach'))
    and ((select public.my_role()) = 'owner' or box = (select public.current_box()))
  );

create policy snapshots_owner_all on public.member_snapshots
  for all to authenticated
  using ((select public.my_role()) = 'owner')
  with check ((select public.my_role()) = 'owner');

-- 코치 입력값: 코치 이상, 자기 지점만(대표는 전체)
create policy profiles_staff_all on public.member_profiles
  for all to authenticated
  using (
    (select public.has_role('coach'))
    and ((select public.my_role()) = 'owner' or box = (select public.current_box()))
  )
  with check (
    (select public.has_role('coach'))
    and ((select public.my_role()) = 'owner' or box = (select public.current_box()))
  );

-- ── 화면용 뷰 ───────────────────────────────────────────────
-- security_invoker = 호출자의 RLS 가 그대로 적용된다. 뷰가 우회로가 되지 않게 하기 위함.
create or replace view public.member_cards
with (security_invoker = true) as
  select
    s.box, s.name, s.status, s.plan, s.plan_start, s.plan_end,
    s.joined_on, s.last_attended,
    coalesce(p.cap_weight, 0) as cap_weight,
    coalesce(p.cap_gym,    0) as cap_gym,
    coalesce(p.cap_metcon, 0) as cap_metcon,
    coalesce(p.goal,  '') as goal,
    coalesce(p.trait, '') as trait,
    coalesce(p.risk,  '') as risk,
    p.started_on,
    coalesce(p.note, '') as note,
    p.updated_at,
    coalesce(p.started_on, s.joined_on) as effective_start
  from public.member_snapshots s
  left join public.member_profiles p
    on p.box = s.box and p.name = s.name;

grant select on public.member_cards to authenticated;
