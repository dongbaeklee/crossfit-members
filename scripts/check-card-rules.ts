/**
 * 카드 판정 규칙 검증 (DB 불필요).
 *   npx vite-node scripts/check-card-rules.ts
 *
 * 강점/약점 기준은 코치가 눈으로 확인하기 어려운 규칙이라, 바꿀 때마다 여기부터 돌린다.
 */
import {
  marks,
  isRated,
  hasWeakness,
  applyFilters,
  tenureLabel,
  attendanceLabel,
  isAbsent,
} from '../src/lib/cards'
import type { MemberCard } from '../src/types'

const base: MemberCard = {
  box: '메이커스', name: '홍길동', status: '활성', plan: '', plan_start: null, plan_end: null,
  joined_on: null, last_attended: null, source: 'excel', cap_weight: 0, cap_gym: 0, cap_metcon: 0,
  goal: '', trait: '', risk: '', started_on: null, note: '', updated_at: null, effective_start: null,
}
const mk = (o: Partial<MemberCard>): MemberCard => ({ ...base, ...o })

/**
 * n일 전의 날짜 문자열. 반드시 **로컬 시간** 기준으로 만들어야 한다.
 * toISOString() 은 UTC 로 바꾸므로 KST(+9)에서는 하루 밀린다.
 */
function ago(n: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

let pass = 0
let fail = 0
function eq(name: string, got: unknown, want: unknown) {
  const a = JSON.stringify(got)
  const b = JSON.stringify(want)
  if (a === b) pass++
  else {
    fail++
    console.log(`FAIL ${name}\n  받음 ${a}\n  기대 ${b}`)
  }
}

// ── 강점/약점 판정 ───────────────────────────────────────────
eq('미평가는 판정 없음', marks(mk({})), {})
eq('미평가 isRated=false', isRated(mk({})), false)
eq('4/3/1 → 역도 강점·유산소 약점', marks(mk({ cap_weight: 4, cap_gym: 3, cap_metcon: 1 })), { cap_weight: 'hi', cap_metcon: 'lo' })
eq('3/3/3 → 강점도 약점도 없음', marks(mk({ cap_weight: 3, cap_gym: 3, cap_metcon: 3 })), {})
eq('5/5/2 → 강점 둘·약점 하나', marks(mk({ cap_weight: 5, cap_gym: 5, cap_metcon: 2 })), { cap_weight: 'hi', cap_gym: 'hi', cap_metcon: 'lo' })
eq('1점 하나만 → 약점', marks(mk({ cap_metcon: 1 })), { cap_metcon: 'lo' })
eq('5점 하나만 → 강점', marks(mk({ cap_weight: 5 })), { cap_weight: 'hi' })
eq('미평가 축은 판정에서 빠짐', marks(mk({ cap_weight: 4, cap_gym: 0 })), { cap_weight: 'hi' })
eq('약점 있음', hasWeakness(mk({ cap_weight: 4, cap_metcon: 1 })), true)
eq('약점 없음', hasWeakness(mk({ cap_weight: 4, cap_gym: 4 })), false)

// ── 날짜 ────────────────────────────────────────────────────
eq('출석 오늘', attendanceLabel(mk({ last_attended: ago(0) })), '오늘')
eq('출석 5일 전', attendanceLabel(mk({ last_attended: ago(5) })), '5일 전')
eq('출석 기록 없음', attendanceLabel(mk({})), '기록 없음')
eq('9일은 미출석 아님', isAbsent(mk({ last_attended: ago(9) })), false)
eq('10일부터 미출석', isAbsent(mk({ last_attended: ago(10) })), true)
eq('기록 없으면 미출석 아님', isAbsent(mk({})), false)
eq('근속 모름', tenureLabel(mk({})), '기간 모름')
eq('근속 0개월', tenureLabel(mk({ effective_start: ago(10) })), '이번 달 시작')
eq('근속 3개월', tenureLabel(mk({ effective_start: ago(95) })), '3개월차')

// ── 필터 ────────────────────────────────────────────────────
const rows = [
  mk({ name: '가', cap_weight: 4, cap_metcon: 1 }),
  mk({ name: '나' }),
  mk({ name: '다', box: '발리인미사', last_attended: ago(20) }),
]
const names = (r: MemberCard[]) => r.map((x) => x.name)
eq('필터 없음', names(applyFilters(rows, { box: '', query: '' })), ['가', '나', '다'])
eq('지점 필터', names(applyFilters(rows, { box: '메이커스', query: '' })), ['가', '나'])
eq('이름 검색', names(applyFilters(rows, { box: '', query: '다' })), ['다'])
eq('공백만 있는 검색어는 무시', names(applyFilters(rows, { box: '', query: '   ' })), ['가', '나', '다'])
eq('지점+검색 동시', names(applyFilters(rows, { box: '메이커스', query: '다' })), [])

// 미평가·약점·미출석은 이제 필터가 아니라 상단 요약 숫자로만 쓰인다
eq('미평가 집계', rows.filter((r) => !isRated(r)).length, 2)
eq('약점 집계', rows.filter(hasWeakness).length, 1)
eq('미출석 집계', rows.filter(isAbsent).length, 1)

console.log(`\n통과 ${pass} · 실패 ${fail}`)
process.exit(fail ? 1 : 0)
