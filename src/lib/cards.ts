import type { MemberCard } from '../types'

/**
 * 카드 화면의 판단 규칙. UI 와 분리해 두어 규칙만 따로 바꾸고 테스트할 수 있게 한다.
 */

export const AXES = [
  { key: 'cap_weight', label: '역도' },
  { key: 'cap_gym', label: '체조' },
  { key: 'cap_metcon', label: '유산소' },
] as const

export type AxisKey = (typeof AXES)[number]['key']

/** 며칠 이상 안 나오면 이탈 신호로 볼지 */
export const ABSENT_DAYS = 10

const DAY = 86_400_000

function parse(d: string | null): Date | null {
  if (!d) return null
  const t = new Date(d + 'T00:00:00')
  return Number.isNaN(t.getTime()) ? null : t
}

function today(): Date {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return t
}

/** 카드에 매겨진 역량 점수들 */
export function caps(c: MemberCard): Record<AxisKey, number> {
  return { cap_weight: c.cap_weight, cap_gym: c.cap_gym, cap_metcon: c.cap_metcon }
}

export function isRated(c: MemberCard): boolean {
  return AXES.some((a) => caps(c)[a.key] > 0)
}

/**
 * 강점/약점 판정. 평가된 축들 중에서
 *   최고점이 4 이상이면 그 축들을 '강점',
 *   최저점이 2 이하이면 그 축들을 '약점' 으로 본다. (겹치면 강점 우선)
 */
export function marks(c: MemberCard): Partial<Record<AxisKey, 'hi' | 'lo'>> {
  const v = caps(c)
  const rated = AXES.map((a) => a.key).filter((k) => v[k] > 0)
  if (rated.length === 0) return {}
  const scores = rated.map((k) => v[k])
  const max = Math.max(...scores)
  const min = Math.min(...scores)
  const out: Partial<Record<AxisKey, 'hi' | 'lo'>> = {}
  if (max >= 4) for (const k of rated) if (v[k] === max) out[k] = 'hi'
  if (min <= 2) for (const k of rated) if (v[k] === min && out[k] !== 'hi') out[k] = 'lo'
  return out
}

export function hasWeakness(c: MemberCard): boolean {
  return Object.values(marks(c)).includes('lo')
}

/** 근속 개월. started_on 이 있으면 그것, 없으면 가입일 기준. */
export function tenureMonths(c: MemberCard): number | null {
  const d = parse(c.effective_start)
  if (!d) return null
  return Math.max(0, Math.floor((today().getTime() - d.getTime()) / DAY / 30.44))
}

export function tenureLabel(c: MemberCard): string {
  const m = tenureMonths(c)
  if (m === null) return '기간 모름'
  return m === 0 ? '이번 달 시작' : `${m}개월차`
}

/** 근속이 실제 운동시작일 기반인지(=믿을 만한지) */
export function tenureIsReal(c: MemberCard): boolean {
  return !!c.started_on
}

export function absentDays(c: MemberCard): number | null {
  const d = parse(c.last_attended)
  if (!d) return null
  return Math.round((today().getTime() - d.getTime()) / DAY)
}

export function attendanceLabel(c: MemberCard): string {
  const n = absentDays(c)
  if (n === null) return '기록 없음'
  if (n <= 0) return '오늘'
  return `${n}일 전`
}

export function isAbsent(c: MemberCard): boolean {
  const n = absentDays(c)
  return n !== null && n >= ABSENT_DAYS
}

/** 회원권 만료까지 남은 일수 (음수면 이미 지남) */
export function daysToExpiry(c: MemberCard): number | null {
  const d = parse(c.plan_end)
  if (!d) return null
  return Math.round((d.getTime() - today().getTime()) / DAY)
}

/**
 * 지점과 이름으로만 거른다.
 * 미평가·약점·미출석 필터는 요청에 따라 걷어냈다(상단 요약 숫자로는 계속 보인다).
 */
export function applyFilters(rows: MemberCard[], opts: { box: string; query: string }): MemberCard[] {
  const q = opts.query.trim()
  return rows.filter((c) => {
    if (opts.box && c.box !== opts.box) return false
    if (q && !c.name.includes(q)) return false
    return true
  })
}
