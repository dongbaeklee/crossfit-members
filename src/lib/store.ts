import { PREVIEW, db } from './supabase'
import { PREVIEW_CARDS } from './preview'
import type { MemberCard, ProfilePatch } from '../types'

/**
 * 화면이 쓰는 데이터 창구. 미리보기/실제 두 모드를 여기서만 가른다.
 * 컴포넌트는 어느 모드인지 몰라도 되게 한다.
 */

/** 미리보기에서 편집한 내용은 이 세션에만 남는다(새로고침하면 초기화). */
let previewRows: MemberCard[] | null = null

export async function loadCards(): Promise<MemberCard[]> {
  if (PREVIEW) {
    previewRows ??= PREVIEW_CARDS.map((c) => ({ ...c }))
    return previewRows.slice().sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }
  const { data, error } = await db().from('member_cards').select('*')
  if (error) throw error
  return ((data as MemberCard[]) ?? []).sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

export async function saveProfile(card: MemberCard, patch: ProfilePatch): Promise<void> {
  if (PREVIEW) {
    previewRows =
      previewRows?.map((r) => (r.box === card.box && r.name === card.name ? { ...r, ...patch } : r)) ?? null
    return
  }
  const { error } = await db()
    .from('member_profiles')
    .upsert({ box: card.box, name: card.name, ...patch }, { onConflict: 'box,name' })
  if (error) throw error
}
