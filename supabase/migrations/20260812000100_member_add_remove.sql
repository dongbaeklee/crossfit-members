-- 허브에서 직접 회원 추가/삭제
--
-- 지금까지 회원 명단은 엑셀 시드(member_snapshots upsert)만으로 들어왔다.
-- 화면에서 직접 추가·삭제하려면 시드와 부딪히는 두 가지를 먼저 정리해야 한다.
--
--   1) 삭제한 회원이 다음 주 시드에서 되살아난다 (엑셀엔 아직 있으니까)
--      → 하드 삭제 대신 archived_at 으로 보관 처리하고, 시드는 이 값을 건드리지 않는다.
--   2) 수동 추가한 회원을 시드가 모른다 → source='manual' 로 구분한다.
--      시드는 자기가 넣은 행만 갱신하므로 수동 회원은 그대로 남는다.
--
-- 권한: 코치 이상이 자기 지점 회원만. 다만 엑셀에서 온 사실값(회원권·출석)을
-- 코치가 임의로 고치면 안 되므로, 테이블 쓰기 권한을 열지 않고 RPC 두 개만 연다.

alter table public.member_snapshots
  add column if not exists source text not null default 'excel'
    check (source in ('excel', 'manual')),
  add column if not exists archived_at timestamptz;

comment on column public.member_snapshots.source is
  'excel=시드가 넣음(주간 갱신 대상) / manual=화면에서 추가함(시드가 건드리지 않음)';
comment on column public.member_snapshots.archived_at is
  '보관(삭제) 시각. 화면에서는 숨기지만 코치가 쌓은 member_profiles 는 남겨 둔다. 시드는 이 값을 절대 건드리지 않는다.';

-- 보관되지 않은 회원만 자주 조회하므로 부분 인덱스를 둔다
create index if not exists member_snapshots_active_idx
  on public.member_snapshots (box, name) where archived_at is null;

-- ── 화면용 뷰: 보관 회원 제외 ────────────────────────────────
-- 컬럼을 중간에 끼워 넣으므로 create or replace 로는 안 된다(42P16). 다시 만든다.
drop view if exists public.member_cards;

create view public.member_cards
with (security_invoker = true) as
  select
    s.box, s.name, s.status, s.plan, s.plan_start, s.plan_end,
    s.joined_on, s.last_attended, s.source,
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
    on p.box = s.box and p.name = s.name
  where s.archived_at is null;

grant select on public.member_cards to authenticated;

-- ── 권한 확인 헬퍼 ──────────────────────────────────────────
create or replace function public.assert_can_manage(p_box text)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_role('coach') then
    raise exception '코치 권한이 없습니다' using errcode = '42501';
  end if;
  if public.my_role() <> 'owner' and p_box is distinct from public.current_box() then
    raise exception '담당 지점이 아닙니다' using errcode = '42501';
  end if;
end $$;

revoke execute on function public.assert_can_manage(text) from public, anon, authenticated;

-- ── 회원 추가 ───────────────────────────────────────────────
-- 같은 이름이 이미 있으면: 활성이면 거부, 보관 상태면 되살린다.
create or replace function public.add_member(p_box text, p_name text)
returns public.member_snapshots
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_row  public.member_snapshots;
begin
  perform public.assert_can_manage(p_box);

  if v_name = '' then
    raise exception '이름을 입력하세요' using errcode = '22023';
  end if;
  if not exists (select 1 from public.boxes b where b.id = p_box) then
    raise exception '없는 지점입니다: %', p_box using errcode = '22023';
  end if;

  select * into v_row from public.member_snapshots s
   where s.box = p_box and s.name = v_name;

  if found then
    if v_row.archived_at is null then
      raise exception '이미 등록된 회원입니다' using errcode = '23505';
    end if;
    update public.member_snapshots s
       set archived_at = null, status = '활성'
     where s.box = p_box and s.name = v_name
    returning * into v_row;
    return v_row;
  end if;

  insert into public.member_snapshots (box, name, status, source, joined_on)
  values (p_box, v_name, '활성', 'manual', current_date)
  returning * into v_row;
  return v_row;
end $$;

-- ── 회원 삭제(보관) ─────────────────────────────────────────
-- 하드 삭제하지 않는다. 코치가 쌓은 프로필이 사라지고, 엑셀에 남아 있으면
-- 다음 시드에서 되살아나 "지웠는데 또 나타남" 이 되기 때문이다.
create or replace function public.archive_member(p_box text, p_name text)
returns public.member_snapshots
language plpgsql security definer set search_path = '' as $$
declare v_row public.member_snapshots;
begin
  perform public.assert_can_manage(p_box);

  update public.member_snapshots s
     set archived_at = now()
   where s.box = p_box and s.name = p_name and s.archived_at is null
  returning * into v_row;

  if not found then
    raise exception '그런 회원이 없습니다' using errcode = 'P0002';
  end if;
  return v_row;
end $$;

grant execute on function public.add_member(text, text)     to authenticated;
grant execute on function public.archive_member(text, text) to authenticated;
