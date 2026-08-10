import { useEffect, useState } from 'react'
import type { MemberCard, ProfilePatch } from '../types'
import { AXES, attendanceLabel, caps, daysToExpiry, isAbsent, tenureIsReal, tenureLabel } from '../lib/cards'
import { GymBadge, Input } from './ui'

function Fact({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-[10px] bg-panel2 px-3 py-[10px]">
      <div className="mb-[3px] text-[10.5px] font-semibold text-ink-3">{label}</div>
      <div className={'text-[13.5px] font-bold ' + (warn ? 'text-danger' : 'text-ink')}>{value}</div>
    </div>
  )
}

/** 0(미평가) ~ 5 선택 */
function Picker({ value, onPick }: { value: number; onPick: (v: number) => void }) {
  return (
    <div className="flex gap-[5px]">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(i)}
          className={
            'h-[23px] w-[27px] rounded-md border text-[11px] transition ' +
            (i === value
              ? 'border-brand bg-brand font-bold text-white'
              : 'border-line bg-bg text-ink-3 hover:border-line2')
          }
        >
          {i === 0 ? '–' : i}
        </button>
      ))}
    </div>
  )
}

/** 텍스트 한 줄. 편집 중에는 로컬 상태를 쓰고, 포커스가 떠날 때만 저장한다. */
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
    <div className="my-2 flex items-center gap-[10px]">
      <span className="w-[52px] flex-none text-[12.5px] font-bold text-ink-2">{label}</span>
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
    <div className="mb-[14px] rounded-[14px] border border-brand bg-panel px-[18px] pb-4 pt-[18px] shadow-card">
      <div className="flex items-center gap-2">
        <h2 className="text-[17px] font-extrabold tracking-[-.02em]">{card.name}</h2>
        <GymBadge box={card.box} />
        <span className="ml-auto text-[11.5px] text-ink-3">
          {error ? <span className="text-danger">{error}</span> : saving ? '저장 중…' : card.updated_at ? '저장됨' : ''}
        </span>
        <button type="button" onClick={onClose} className="px-[6px] py-1 text-[12.5px] text-ink-3 hover:text-ink">
          닫기 ✕
        </button>
      </div>

      <div className="mb-[15px] mt-[5px] text-[12px] text-ink-3">
        {card.plan || '회원권 없음'}
        {card.plan_end && ` · 종료 ${card.plan_end}`}
        {dd !== null && ` (D${dd >= 0 ? '-' + dd : '+' + -dd})`}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(104px,1fr))] gap-[9px]">
        <Fact label={tenureIsReal(card) ? '운동 기간' : '운동 기간 (가입일 기준)'} value={tenureLabel(card)} />
        <Fact label="최근 출석" value={attendanceLabel(card)} warn={isAbsent(card)} />
        <Fact label="회원 상태" value={card.status || '-'} />
      </div>

      <div className="mb-2 mt-[14px] text-[11px] font-bold tracking-wide text-ink-3">운동 역량 · – 는 미평가</div>
      {AXES.map((a) => (
        <div key={a.key} className="my-2 flex items-center gap-[10px]">
          <span className="w-[52px] flex-none text-[12.5px] font-bold text-ink-2">{a.label}</span>
          <Picker value={v[a.key]} onPick={(n) => onPatch({ [a.key]: n } as ProfilePatch)} />
        </div>
      ))}

      <div className="mb-2 mt-[14px] text-[11px] font-bold tracking-wide text-ink-3">회원 특성</div>
      <TextRow label="목표" value={card.goal} placeholder="체중감량 / 근력향상 / 대회준비" onCommit={(goal) => onPatch({ goal })} />
      <TextRow label="성향" value={card.trait} placeholder="경쟁형 · 조용함 · 그룹 선호" onCommit={(trait) => onPatch({ trait })} />
      <TextRow label="리스크" value={card.risk} placeholder="어깨 통증 이력 · 허리 디스크" onCommit={(risk) => onPatch({ risk })} />
      <TextRow
        label="시작일"
        value={card.started_on ?? ''}
        placeholder="실제 운동 시작일 YYYY-MM-DD · 모르면 비워두세요"
        onCommit={(s) => onPatch({ started_on: s.trim() === '' ? null : s.trim() })}
      />
    </div>
  )
}
