import { PREVIEW, db } from './supabase'
import { PREVIEW_CARDS } from './preview'
import type { MemberCard, ProfilePatch } from '../types'

/**
 * 화면이 쓰는 데이터 창구. 미리보기/실제 두 모드를 여기서만 가른다.
 * 컴포넌트는 어느 모드인지 몰라도 되게 한다.
 */

/** 미리보기에서 편집한 내용은 이 세션에만 남는다(새로고침하면 초기화). */
let previewRows: MemberCard[] | null = null

const byName = (a: MemberCard, b: MemberCard) => a.name.localeCompare(b.name, 'ko')

function previewState(): MemberCard[] {
  previewRows ??= PREVIEW_CARDS.map((c) => ({ ...c }))
  return previewRows
}

export async function loadCards(): Promise<MemberCard[]> {
  if (PREVIEW) return previewState().slice().sort(byName)
  const { data, error } = await db().from('member_cards').select('*')
  if (error) throw error
  return ((data as MemberCard[]) ?? []).sort(byName)
}

export async function saveProfile(card: MemberCard, patch: ProfilePatch): Promise<void> {
  if (PREVIEW) {
    previewRows = previewState().map((r) =>
      r.box === card.box && r.name === card.name ? { ...r, ...patch } : r,
    )
    return
  }
  const { error } = await db()
    .from('member_profiles')
    .upsert({ box: card.box, name: card.name, ...patch }, { onConflict: 'box,name' })
  if (error) throw error
}

/**
 * 회원 추가. 서버의 add_member RPC 를 부른다.
 * 테이블 쓰기를 직접 열지 않는 이유: 엑셀에서 온 사실값(회원권·출석)을 코치가
 * 임의로 고칠 수 없어야 하기 때문. RPC 는 이름과 지점만 받는다.
 */
export async function addMember(box: string, name: string): Promise<MemberCard> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('이름을 입력하세요')

  if (PREVIEW) {
    const rows = previewState()
    if (rows.some((r) => r.box === box && r.name === trimmed)) throw new Error('이미 등록된 회원입니다')
    const today = new Date()
    const p = (n: number) => String(n).padStart(2, '0')
    const iso = `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`
    const card: MemberCard = {
      box, name: trimmed, status: '활성', plan: '', plan_start: null, plan_end: null,
      joined_on: iso, last_attended: null, source: 'manual',
      cap_weight: 0, cap_gym: 0, cap_metcon: 0, goal: '', trait: '', risk: '',
      started_on: null, note: '', updated_at: null, effective_start: iso,
    }
    rows.push(card)
    return card
  }

  const { error } = await db().rpc('add_member', { p_box: box, p_name: trimmed })
  if (error) throw new Error(humanize(error.message))

  // RPC 는 스냅샷 행만 돌려주므로, 화면이 쓰는 뷰 모양으로 다시 읽어 온다
  const { data, error: readErr } = await db()
    .from('member_cards')
    .select('*')
    .eq('box', box)
    .eq('name', trimmed)
    .single()
  if (readErr) throw readErr
  return data as MemberCard
}

/** 회원 삭제. 실제로는 보관 처리라 코치가 쌓은 프로필은 남는다. */
export async function archiveMember(card: MemberCard): Promise<void> {
  if (PREVIEW) {
    previewRows = previewState().filter((r) => !(r.box === card.box && r.name === card.name))
    return
  }
  const { error } = await db().rpc('archive_member', { p_box: card.box, p_name: card.name })
  if (error) throw new Error(humanize(error.message))
}

/** Postgres 가 올려보내는 메시지를 화면에 그대로 쓰기엔 거칠어서 다듬는다. */
function humanize(message: string): string {
  if (message.includes('코치 권한이 없습니다')) return '코치 권한이 없습니다'
  if (message.includes('담당 지점이 아닙니다')) return '담당 지점이 아닙니다'
  if (message.includes('이미 등록된 회원입니다')) return '이미 등록된 회원입니다'
  if (message.includes('그런 회원이 없습니다')) return '이미 삭제된 회원입니다'
  if (message.includes('이름을 입력하세요')) return '이름을 입력하세요'
  return message
}
