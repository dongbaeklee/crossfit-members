import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export function Chip({
  active,
  children,
  ...rest
}: { active?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={
        'whitespace-nowrap rounded-full px-[14px] py-[7px] text-[12.5px] font-semibold transition duration-150 ' +
        (active
          ? 'bg-accent text-black shadow-[0_0_0_1px_rgba(255,107,53,.5),0_6px_20px_-6px_rgba(255,107,53,.6)]'
          : 'glass text-ink-2 hover:text-ink hover:border-line2')
      }
    >
      {children}
    </button>
  )
}

/** 지점 표시. 색 점 하나로 구분해 카드 상단이 시끄러워지지 않게 한다. */
export function GymBadge({ box }: { box: string }) {
  const makers = box === '메이커스'
  return (
    <span className="flex flex-none items-center gap-[5px] text-[10.5px] font-semibold text-ink-3">
      <span className={'h-[6px] w-[6px] rounded-full ' + (makers ? 'bg-makers' : 'bg-bali')} />
      {box.replace('인미사', '')}
    </span>
  )
}

export function Tag({ tone = 'plain', children }: { tone?: 'plain' | 'warn' | 'accent'; children: ReactNode }) {
  const cls =
    tone === 'warn'
      ? 'bg-danger-dim text-danger'
      : tone === 'accent'
        ? 'bg-accent-dim text-accent'
        : 'bg-white/[.055] text-ink-2'
  return <span className={`rounded-md px-[7px] py-[3px] text-[10.5px] font-semibold ${cls}`}>{children}</span>
}

/** 카드 왼쪽 위의 둥근 사각 아이콘. 참고 디자인의 시각적 앵커 역할. */
export function IconChip({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'accent' }) {
  return (
    <span
      className={
        'grid h-[34px] w-[34px] flex-none place-items-center rounded-[11px] border border-line ' +
        (tone === 'accent' ? 'bg-accent-dim text-accent' : 'bg-white/[.06] text-ink-2')
      }
    >
      {children}
    </span>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        'min-w-0 rounded-[11px] border border-line bg-white/[.04] px-[13px] py-[9px] text-[13px] text-ink outline-none ' +
        'transition placeholder:text-ink-3 focus:border-accent/70 focus:bg-white/[.06] ' +
        (props.className ?? '')
      }
    />
  )
}

export function Alert({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'info' }) {
  const cls = tone === 'error' ? 'bg-danger-dim text-danger' : 'bg-white/[.05] text-ink-2'
  return <div className={`rounded-[14px] px-4 py-3 text-left text-[12.5px] leading-relaxed ${cls}`}>{children}</div>
}

export function Info({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 rounded-[16px] border border-line bg-white/[.028] px-[18px] py-[15px] text-[12.5px] leading-[1.7] text-ink-2">
      {children}
    </div>
  )
}
