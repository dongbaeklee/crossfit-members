-- 회원 카드 — 운동 역량/특성 프로필
--
-- 기존 결제앱의 public.members 는 건드리지 않는다(booking 마이그레이션의 규칙).
-- 대신 (box, name) 을 자연키로 하는 자립 테이블 두 개를 둔다.
--   · member_snapshots : 회원 앱 엑셀에서 나온 사실값(상태·회원권·출석). 주간 갱신 시 덮어씀.
--   · member_profiles  : 코치가 직접 입력하는 판단값(운동 역량·특성). 사람이 쓴 것이라 절대 덮어쓰지 않음.
-- 이 둘을 갈라놓는 이유: 시드 스크립트가 매주 스냅샷을 upsert 해도 코치 입력이 날아가지 않게 하기 위함.
--
-- 인증/권한은 booking 앱이 만든 것을 그대로 재사용한다.
--   public.my_role() / public.has_role(min) / public.current_box() / public.boxes
--
-- ⚠️ 사전 조건: booking_core + tighten_billing_rls + rename_current_role 이 이미 적용돼 있어야 한다.

do $$
begin
  if to_regprocedure('public.has_role(text)') is null then
    raise exception 'public.has_role(text) 가 없습니다. crossfit-booking 마이그레이션을 먼저 적용하세요.';
  end if;
end $$;

-- ── member_snapshots : 엑셀에서 온 사실값 ────────────────────
create table if not exists public.member_snapshots (
  box            text not null references public.boxes(id),
  name           text not null,
  status         text not null default '',        -- 활성 / 만료 / 정지 / 비활성
  plan           text not null default '',        -- 회원권명
  plan_start     date,
  plan_end       date,
  joined_on      date,                            -- 앱 가입일. 이관일이라 실제 운동시작일이 아님(주의)
  last_attended  date,
  member_id      text references public.members(id) on delete set null,  -- 결제앱과 이어붙일 때 사용(현재는 null)
  synced_at      timestamptz not null default now(),
  primary key (box, name)
);

comment on table public.member_snapshots is
  '회원 앱 엑셀에서 동기화된 사실값. 시드 스크립트가 매주 upsert 한다. 사람이 직접 고치지 않는다.';
comment on column public.member_snapshots.joined_on is
  '앱 가입일. 2026-06-10~12 에 대량 이관돼 실제 운동시작일이 아니다. 근속 계산에는 member_profiles.started_on 을 우선한다.';

-- ── member_profiles : 코치가 입력하는 판단값 ─────────────────
create table if not exists public.member_profiles (
  box          text not null references public.boxes(id),
  name         text not null,
  cap_weight   smallint not null default 0 check (cap_weight  between 0 and 5),  -- 역도
  cap_gym      smallint not null default 0 check (cap_gym     between 0 and 5),  -- 체조
  cap_metcon   smallint not null default 0 check (cap_metcon  between 0 and 5),  -- 유산소
  goal         text not null default '',
  trait        text not null default '',
  risk         text not null default '',
  started_on   date,                              -- 실제 운동 시작일(아는 경우). 있으면 joined_on 보다 우선.
  note         text not null default '',
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users(id) default auth.uid(),
  primary key (box, name)
);

comment on table public.member_profiles is
  '코치가 관찰해 입력하는 회원 프로필. 운동 역량 3축(0=미평가, 1~5)과 특성. 시드가 덮어쓰지 않는다.';

-- 지점 필터가 기본 동선이고 RLS 조건에도 쓰이므로 인덱스를 둔다.
-- (box,name) 복합 PK 의 선두 컬럼이 box 라 별도 인덱스는 불필요하지만,
--  snapshots 의 상태/출석 필터는 자주 쓰이므로 그쪽만 보조 인덱스를 만든다.
create index if not exists member_snapshots_status_idx on public.member_snapshots (box, status);
create index if not exists member_snapshots_attended_idx on public.member_snapshots (last_attended);

-- ── updated_at 자동 갱신 ────────────────────────────────────
create or replace function public.touch_member_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists member_profiles_touch on public.member_profiles;
create trigger member_profiles_touch
  before update on public.member_profiles
  for each row execute function public.touch_member_profile();

-- ── RLS ─────────────────────────────────────────────────────
-- 코치 이상만 접근. 자기 박스만(대표는 전체).
-- has_role()/my_role()/current_box() 는 행과 무관하므로 (select ...) 로 감싸 1회만 평가시킨다.
-- 행에 의존하는 조건은 box 상수 비교뿐이라 인덱스를 탄다.
alter table public.member_snapshots enable row level security;
alter table public.member_profiles  enable row level security;

drop policy if exists "snapshots_staff_read"  on public.member_snapshots;
drop policy if exists "snapshots_owner_write" on public.member_snapshots;
drop policy if exists "profiles_staff_all"    on public.member_profiles;

-- 스냅샷: 코치 이상 읽기 전용. 쓰기는 대표(=시드 스크립트가 쓰는 계정)만.
create policy "snapshots_staff_read" on public.member_snapshots
  for select to authenticated
  using (
    (select public.has_role('coach'))
    and ((select public.my_role()) = 'owner' or box = (select public.current_box()))
  );

create policy "snapshots_owner_write" on public.member_snapshots
  for all to authenticated
  using ((select public.my_role()) = 'owner')
  with check ((select public.my_role()) = 'owner');

-- 프로필: 코치 이상 읽기·쓰기. 코치가 입력하는 화면이므로 select/insert/update/delete 모두 허용.
create policy "profiles_staff_all" on public.member_profiles
  for all to authenticated
  using (
    (select public.has_role('coach'))
    and ((select public.my_role()) = 'owner' or box = (select public.current_box()))
  )
  with check (
    (select public.has_role('coach'))
    and ((select public.my_role()) = 'owner' or box = (select public.current_box()))
  );

-- ── 화면용 조인 뷰 ──────────────────────────────────────────
-- 클라이언트가 두 테이블을 각각 불러 맞추지 않도록 하나로 합쳐 준다.
-- security_invoker 를 켜서 호출자의 RLS 가 그대로 적용되게 한다(뷰가 우회로가 되지 않도록).
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

comment on view public.member_cards is
  '회원 카드 화면용. 스냅샷(사실) + 프로필(코치 입력)을 합친다. security_invoker 라 RLS 가 그대로 적용된다.';
