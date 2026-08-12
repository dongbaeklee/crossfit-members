import type { MemberCard } from '../types'
import { AXES, attendanceLabel, caps, isAbsent, isRated, marks, tenureLabel } from '../lib/cards'
import { GymBadge, Tag } from './ui'

function AxisRow({ label, value, mark }: { label: string; value: number; mark?: 'hi' | 'lo' }) {
  // 색은 아껴 쓴다. 평범한 축은 흰색 계열, 강점만 라임, 약점만 주황.
  const on = mark === 'hi' ? 'bg-lime' : mark === 'lo' ? 'bg-accent' : 'bg-white/45'
  return (
    <div className="flex items-center gap-[9px] py-[3px]">
      <span className="w-[38px] flex-none text-[11px] font-medium text-ink-3">{label}</span>
      <span className="flex flex-1 gap-[3px]">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={'h-[5px] flex-1 rounded-full transition-colors ' + (i <= value ? on : 'bg-white/[.09]')}
          />
        ))}
      </span>
      <span
        className={
          'w-[24px] flex-none text-right text-[10px] font-bold tracking-tight ' +
          (mark === 'hi' ? 'text-lime' : mark === 'lo' ? 'text-accent' : 'text-transparent')
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
  const absent = isAbsent(card)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        'group rounded-xl2 px-[17px] py-[16px] text-left ' +
        (selected
          ? 'glass border-accent/60 shadow-[0_0_0_1px_rgba(255,107,53,.35),0_26px_60px_-18px_rgba(0,0,0,.85)]'
          : 'glass glass-hover')
      }
    >
      <div className="flex items-baseline gap-[9px]">
        <span className="text-[16px] font-bold tracking-[-.02em] text-ink">{card.name}</span>
        <GymBadge box={card.box} />
        {absent && <span className="ml-auto h-[7px] w-[7px] flex-none rounded-full bg-danger" />}
      </div>

      <div className="mb-[13px] mt-[5px] text-[11px] text-ink-3 tnum">
        {tenureLabel(card)}
        <span className="mx-[6px] text-white/15">·</span>
        {card.status || '상태 미상'}
        <span className="mx-[6px] text-white/15">·</span>
        <span className={absent ? 'text-danger' : undefined}>출석 {attendanceLabel(card)}</span>
      </div>

      <div className="space-y-px">
        {AXES.map((a) => (
          <AxisRow key={a.key} label={a.label} value={v[a.key]} mark={m[a.key]} />
        ))}
      </div>

      {(card.goal || card.trait || card.risk || !isRated(card)) && (
        <div className="mt-[13px] flex flex-wrap gap-[5px]">
          {!isRated(card) && <Tag tone="accent">미평가</Tag>}
          {card.goal && <Tag>{card.goal}</Tag>}
          {card.trait && <Tag>{card.trait}</Tag>}
          {card.risk && <Tag tone="warn">{card.risk}</Tag>}
        </div>
      )}
    </button>
  )
}
