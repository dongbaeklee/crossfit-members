import type { MemberCard } from '../types'
import { AXES, attendanceLabel, caps, isAbsent, isRated, marks, tenureLabel } from '../lib/cards'
import { GymBadge, Tag } from './ui'

function AxisRow({ label, value, mark }: { label: string; value: number; mark?: 'hi' | 'lo' }) {
  const on = mark === 'hi' ? 'bg-makers' : mark === 'lo' ? 'bg-warn' : 'bg-ink-3'
  return (
    <div className="my-[5px] flex items-center gap-2">
      <span className="w-10 flex-none text-[11.5px] font-semibold text-ink-2">{label}</span>
      <span className="flex gap-[3px]">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`h-[6px] w-[14px] rounded-[3px] ${i <= value ? on : 'bg-line'}`} />
        ))}
      </span>
      <span
        className={
          'ml-auto text-[10.5px] font-bold ' +
          (mark === 'hi' ? 'text-makers' : mark === 'lo' ? 'text-warn' : 'text-transparent')
        }
      >
        {mark === 'hi' ? '강점' : mark === 'lo' ? '약점' : '·'}
      </span>
    </div>
  )
}

export default function CardTile({
  card,
  selected,
  onSelect,
}: {
  card: MemberCard
  selected: boolean
  onSelect: () => void
}) {
  const m = marks(card)
  const v = caps(card)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        'rounded-[14px] border bg-panel px-[15px] py-[14px] text-left transition ' +
        (selected
          ? 'border-brand ring-[3px] ring-brand-tint'
          : 'border-line hover:-translate-y-px hover:border-line2 hover:shadow-card')
      }
    >
      <div className="flex items-center gap-[7px]">
        <span className="text-[15px] font-extrabold tracking-[-.01em]">{card.name}</span>
        <GymBadge box={card.box} />
      </div>
      <div className="mb-[11px] mt-[3px] text-[11.5px] text-ink-3">
        {tenureLabel(card)} · {card.status || '상태 미상'} · 출석 {attendanceLabel(card)}
      </div>

      {AXES.map((a) => (
        <AxisRow key={a.key} label={a.label} value={v[a.key]} mark={m[a.key]} />
      ))}

      <div className="mt-[10px] flex flex-wrap gap-1">
        {card.goal && <Tag>{card.goal}</Tag>}
        {card.trait && <Tag>{card.trait}</Tag>}
        {card.risk && <Tag tone="warn">{card.risk}</Tag>}
        {isAbsent(card) && <Tag tone="warn">{attendanceLabel(card)} 미출석</Tag>}
        {!isRated(card) && <Tag tone="brand">미평가</Tag>}
      </div>
    </button>
  )
}
