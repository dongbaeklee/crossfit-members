import type { MemberCard } from '../types'
import { AXES, caps, marks } from './cards'
import { buildXlsx, downloadBlob, type Cell } from './xlsx'

/**
 * 회원 명단을 엑셀로 내려받는다.
 *
 * 엑셀에서 온 사실값과 코치가 입력한 판단값을 한 장에 모두 담는다.
 * 특히 역량·특성은 이 시스템에만 있는 데이터라, 내려받기가 곧 백업이기도 하다.
 */

const HEADERS = [
  '지점', '이름', '회원 상태', '회원권', '회원권 시작일', '회원권 종료일',
  '가입일', '최근 출석일', '등록 경로',
  '역도', '체조', '유산소', '강점', '약점',
  '목표', '성향', '리스크', '실제 운동 시작일', '최근 수정',
]

const WIDTHS = [
  11, 12, 10, 22, 13, 13,
  12, 12, 10,
  7, 7, 8, 12, 12,
  18, 22, 22, 16, 12,
]

/** 0(미평가)은 빈칸으로 둔다. 0 을 그대로 쓰면 "역량 0점"으로 읽힌다. */
const score = (n: number): Cell => (n > 0 ? n : '')

function axisNames(card: MemberCard, want: 'hi' | 'lo'): string {
  const m = marks(card)
  return AXES.filter((a) => m[a.key] === want)
    .map((a) => a.label)
    .join(', ')
}

export function toRows(cards: MemberCard[]): Cell[][] {
  const body = cards.map((c) => {
    const v = caps(c)
    return [
      c.box,
      c.name,
      c.status,
      c.plan,
      c.plan_start,
      c.plan_end,
      c.joined_on,
      c.last_attended,
      c.source === 'manual' ? '직접 추가' : '엑셀',
      score(v.cap_weight),
      score(v.cap_gym),
      score(v.cap_metcon),
      axisNames(c, 'hi'),
      axisNames(c, 'lo'),
      c.goal,
      c.trait,
      c.risk,
      c.started_on,
      c.updated_at ? c.updated_at.slice(0, 10) : '',
    ] as Cell[]
  })
  return [HEADERS, ...body]
}

function today(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
}

/**
 * 화면에 보이는 목록을 그대로 내려받는다(지점 필터·검색 반영).
 * 무엇을 받았는지 헷갈리지 않게 파일 이름에 조건을 적는다.
 */
export function exportMembers(cards: MemberCard[], scope: string): void {
  const blob = buildXlsx(toRows(cards), { sheetName: '회원 카드', widths: WIDTHS })
  const tag = scope ? `_${scope.replace('인미사', '')}` : ''
  downloadBlob(blob, `회원카드${tag}_${today()}.xlsx`)
}
