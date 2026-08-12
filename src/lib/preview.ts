import type { MemberCard } from '../types'

/**
 * 미리보기용 가짜 데이터.
 *
 * ⚠️ 이 파일에는 절대 실제 회원 정보를 넣지 않는다.
 *    이 저장소는 공개되므로 여기 적힌 것은 전부 공개된다고 봐야 한다.
 *    실제 회원 데이터는 Supabase 에만 있고, RLS 로 코치 이상에게만 열린다.
 *
 * 화면 상태를 전부 눈으로 확인할 수 있게 조합을 골고루 넣었다:
 * 강점만 / 약점만 / 강약점 동시 / 미평가 / 미출석 / 만료임박 / 실제시작일 있는 경우.
 */

function daysAgo(n: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const inDays = (n: number) => daysAgo(-n)

type Seed = Partial<MemberCard> & { name: string; box: string }

const seeds: Seed[] = [
  // 메이커스
  { name: '가온', box: '메이커스', cap_weight: 4, cap_gym: 3, cap_metcon: 1, goal: '체중감량', trait: '조용함 · 개인운동 선호', risk: '어깨 통증 이력', last_attended: daysAgo(1), joined_on: daysAgo(78), plan: '3개월 무제한', plan_end: inDays(14) },
  { name: '나린', box: '메이커스', cap_weight: 2, cap_gym: 5, cap_metcon: 4, goal: '대회 준비', trait: '경쟁형', last_attended: daysAgo(0), joined_on: daysAgo(400), started_on: daysAgo(400), plan: '6개월 무제한', plan_end: inDays(92) },
  { name: '다움', box: '메이커스', cap_weight: 3, cap_gym: 3, cap_metcon: 3, goal: '체력 유지', last_attended: daysAgo(3), joined_on: daysAgo(150), plan: '3개월 무제한', plan_end: inDays(41) },
  { name: '라온', box: '메이커스', last_attended: daysAgo(2), joined_on: daysAgo(9), plan: '1개월 무제한', plan_end: inDays(21) },
  { name: '마루', box: '메이커스', cap_weight: 5, cap_gym: 2, cap_metcon: 2, goal: '근력 향상', trait: '과묵 · 고중량 선호', last_attended: daysAgo(18), joined_on: daysAgo(220), plan: '3개월 무제한', plan_end: inDays(5) },
  { name: '바다', box: '메이커스', cap_weight: 1, cap_gym: 1, cap_metcon: 4, goal: '지구력', risk: '무릎 수술 이력', last_attended: daysAgo(4), joined_on: daysAgo(65), plan: '주2회 3개월', plan_end: inDays(33) },
  { name: '사랑', box: '메이커스', last_attended: null, joined_on: daysAgo(62), status: '만료', plan: '1개월 무제한', plan_end: daysAgo(12) },
  { name: '아름', box: '메이커스', cap_weight: 3, cap_gym: 4, cap_metcon: 2, trait: '그룹 선호 · 밝음', last_attended: daysAgo(6), joined_on: daysAgo(310), started_on: daysAgo(500), plan: '6개월 무제한', plan_end: inDays(120) },

  // 발리인미사
  { name: '자유', box: '발리인미사', cap_weight: 4, cap_gym: 4, cap_metcon: 1, goal: '체지방 감량', risk: '허리 디스크', last_attended: daysAgo(1), joined_on: daysAgo(58), plan: '3개월 무제한', plan_end: inDays(29) },
  { name: '차미', box: '발리인미사', cap_weight: 2, cap_gym: 2, cap_metcon: 5, goal: '마라톤 준비', trait: '경쟁형 · 기록 집착', last_attended: daysAgo(0), joined_on: daysAgo(180), started_on: daysAgo(640), plan: '6개월 무제한', plan_end: inDays(75) },
  { name: '카람', box: '발리인미사', last_attended: daysAgo(22), joined_on: daysAgo(61), plan: '3개월 무제한', plan_end: inDays(28) },
  { name: '타래', box: '발리인미사', cap_weight: 5, cap_gym: 5, cap_metcon: 5, goal: '대회 입상', trait: '자기주도 · 코칭 잘 받아들임', last_attended: daysAgo(1), joined_on: daysAgo(700), started_on: daysAgo(700), plan: '12개월 무제한', plan_end: inDays(200) },
  { name: '파랑', box: '발리인미사', cap_weight: 1, cap_gym: 3, cap_metcon: 2, goal: '자세 교정', risk: '어깨 가동범위 부족', last_attended: daysAgo(5), joined_on: daysAgo(40), plan: '주3회 3개월', plan_end: inDays(50) },
  { name: '하늘', box: '발리인미사', last_attended: daysAgo(31), joined_on: daysAgo(59), status: '정지', plan: '3개월 무제한(홀딩)', plan_end: inDays(60) },
  { name: '가람', box: '발리인미사', cap_weight: 3, cap_gym: 1, cap_metcon: 3, trait: '조용함', last_attended: daysAgo(7), joined_on: daysAgo(95), plan: '3개월 무제한', plan_end: inDays(3) },
  { name: '나래', box: '발리인미사', last_attended: daysAgo(2), joined_on: daysAgo(4), plan: '체험 1주', plan_end: inDays(3) },
]

export const PREVIEW_CARDS: MemberCard[] = seeds.map((s) => {
  const card: MemberCard = {
    box: s.box,
    name: s.name,
    status: s.status ?? '활성',
    plan: s.plan ?? '',
    plan_start: s.plan_start ?? null,
    plan_end: s.plan_end ?? null,
    joined_on: s.joined_on ?? null,
    last_attended: s.last_attended ?? null,
    source: s.source ?? 'excel',
    cap_weight: s.cap_weight ?? 0,
    cap_gym: s.cap_gym ?? 0,
    cap_metcon: s.cap_metcon ?? 0,
    goal: s.goal ?? '',
    trait: s.trait ?? '',
    risk: s.risk ?? '',
    started_on: s.started_on ?? null,
    note: '',
    updated_at: null,
    effective_start: s.started_on ?? s.joined_on ?? null,
  }
  return card
})
