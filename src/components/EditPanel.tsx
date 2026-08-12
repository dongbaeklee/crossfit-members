import { useEffect, useState } from 'react'
import type { MemberCard, ProfilePatch } from '../types'
import { AXES, attendanceLabel, caps, daysToExpiry, isAbsent, tenureIsReal, tenureLabel } from '../lib/cards'
import { GymBadge, Input } from './ui'

/** 큰 값 + 작은 라벨. 참고 디자인의 기본 리듬이다. */
function Fact({ label, value, tone }: { label: string; value: string; tone?: 'warn' | 'accent' }) {
  const color = tone === 'warn' ? 'text-danger' : tone === 'accent' ? 'text-accent' : 'text-ink'
  return (
    <div className="rounded-[14px] border border-line bg-white/[.035] px-[14px] py-[12px]">
      <div className="mb-[5px] text-[10.5px] font-medium text-ink-3">{label}</div>
      <div className={`text-[17px] font-semibold tracking-[-.02em] tnum ${color}`}>{value}</div>
    </div>
  )
}

/** 0(미평가) ~ 5 */
function Picker({ value, onPick }: { value: number; onPick: (v: number) => void }) {
  return (
    <div className="flex gap-[6px]">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(i)}
          className={
            'h-[30px] w-[34px] rounded-[9px] border text-[12px] transition duration-150 tnum ' +
            (i === value
              ? 'border-accent bg-accent font-bold text-black'
              : 'border-line bg-white/[.035] text-ink-3 hover:border-line2 hover:text-ink-2')
          }
        >
          {i === 0 ? '–' : i}
        </button>
      ))}
    </div>
  )
}

/** 편집 중에는 로컬 상태를 쓰고, 포커스가 떠날 때만 저장한다. */
function TextRow({
  label,
  value,
  placeholder,
  onCommit,
}: {
  label: string
  value: string
  placeholder: string
  onCommit: (v: string) => void
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return (
    <div className="my-[7px] flex items-center gap-[12px]">
      <span className="w-[52px] flex-none text-[12px] font-medium text-ink-3">{label}</span>
      <Input
        className="flex-1"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== value && onCommit(draft)}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-[10px] mt-[20px] text-[10.5px] font-bold tracking-[.08em] text-ink-3">{children}</div>
}

export default function EditPanel({
  card,
  saving,
  error,
  onPatch,
  onClose,
}: {
  card: MemberCard
  saving: boolean
  error: string
  onPatch: (patch: ProfilePatch) => void
  onClose: () => void
}) {
  const v = caps(card)
  const dd = daysToExpiry(card)

  return (
    <div className="glass mb-4 rounded-xl3 px-[22px] pb-[20px] pt-[20px]">
      <div className="flex items-center gap-[10px]">
        <h2 className="text-[20px] font-bold tracking-[-.03em]">{card.name}</h2>
        <GymBadge box={card.box} />
        <span className="ml-auto text-[11.5px] text-ink-3">
          {error ? <span className="text-danger">{error}</span> : saving ? '저장 중…' : card.updated_at ? '저장됨' : ''}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="grid h-[28px] w-[28px] place-items-center rounded-full border border-line text-ink-3 transition hover:border-line2 hover:text-ink"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      <div className="mb-[16px] mt-[6px] text-[11.5px] text-ink-3 tnum">
        {card.plan || '회원권 없음'}
        {card.plan_end && ` · 종료 ${card.plan_end}`}
        {dd !== null && ` (D${dd >= 0 ? '-' + dd : '+' + -dd})`}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(112px,1fr))] gap-[10px]">
        <Fact label={tenureIsReal(card) ? '운동 기간' : '운동 기간 (가입일 기준)'} value={tenureLabel(card)} />
        <Fact label="최근 출석" value={attendanceLabel(card)} tone={isAbsent(card) ? 'warn' : undefined} />
        <Fact label="회원 상태" value={card.status || '-'} />
      </div>

      {/* 넓은 화면에서 한 줄짜리 입력들이 1200px 를 가로지르면 읽는 눈이 멀리 이동해야 한다.
          역량(왼쪽) / 특성(오른쪽) 두 단으로 나눠 시선 이동을 짧게 만든다. */}
      <div className="grid gap-x-[34px] lg:grid-cols-2">
        <div>
          <SectionLabel>운동 역량 · – 는 미평가</SectionLabel>
          {AXES.map((a) => (
            <div key={a.key} className="my-[7px] flex items-center gap-[12px]">
              <span className="w-[52px] flex-none text-[12px] font-medium text-ink-3">{a.label}</span>
              <Picker value={v[a.key]} onPick={(n) => onPatch({ [a.key]: n } as ProfilePatch)} />
            </div>
          ))}
        </div>

        <div>
          <SectionLabel>회원 특성</SectionLabel>
          <TextRow label="목표" value={card.goal} placeholder="체중감량 / 근력향상" onCommit={(goal) => onPatch({ goal })} />
          <TextRow label="성향" value={card.trait} placeholder="경쟁형 · 조용함 · 그룹 선호" onCommit={(trait) => onPatch({ trait })} />
          <TextRow label="리스크" value={card.risk} placeholder="어깨 통증 이력 · 허리 디스크" onCommit={(risk) => onPatch({ risk })} />
          <TextRow
            label="시작일"
            value={card.started_on ?? ''}
            placeholder="YYYY-MM-DD · 모르면 비워두세요"
            onCommit={(s) => onPatch({ started_on: s.trim() === '' ? null : s.trim() })}
          />
        </div>
      </div>
    </div>
  )
}
