/** public.member_cards 뷰 한 행 = 회원 한 명의 카드 */
export interface MemberCard {
  box: string
  name: string
  /** 활성 / 만료 / 정지 / 비활성 */
  status: string
  plan: string
  plan_start: string | null
  plan_end: string | null
  /** 앱 가입일. 대량 이관일이라 실제 운동시작일이 아니다. */
  joined_on: string | null
  last_attended: string | null
  /** excel=주간 시드가 넣음 / manual=화면에서 추가함 */
  source: 'excel' | 'manual'
  /** 운동 역량 0=미평가, 1~5 */
  cap_weight: number
  cap_gym: number
  cap_metcon: number
  goal: string
  trait: string
  risk: string
  /** 코치가 입력한 실제 운동 시작일 */
  started_on: string | null
  note: string
  updated_at: string | null
  /** started_on ?? joined_on — 근속 계산의 기준 */
  effective_start: string | null
}

/** member_profiles 에 쓰는 값 (코치 입력분만) */
export interface ProfilePatch {
  cap_weight?: number
  cap_gym?: number
  cap_metcon?: number
  goal?: string
  trait?: string
  risk?: string
  started_on?: string | null
  note?: string
}

/** public.staff — 로그인 계정의 권한. 가입 직후에는 pending(권한 없음)이다. */
export interface StaffProfile {
  id: string
  role: 'pending' | 'coach' | 'manager' | 'owner'
  /** null 이면 전 지점(대표) */
  box: string | null
  display_name: string
}
