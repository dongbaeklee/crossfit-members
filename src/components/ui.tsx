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
        'whitespace-nowrap rounded-[9px] border px-[13px] py-2 text-[12.5px] font-semibold transition ' +
        (active
          ? 'border-brand bg-brand text-white'
          : 'border-line bg-panel text-ink-2 hover:border-line2 hover:text-ink')
      }
    >
      {children}
    </button>
  )
}

export function GymBadge({ box }: { box: string }) {
  const makers = box === '메이커스'
  return (
    <span
      className={
        'flex-none rounded-md px-[7px] py-[2px] text-[10.5px] font-bold ' +
        (makers ? 'bg-makers-tint text-makers' : 'bg-bali-tint text-bali')
      }
    >
      {box.replace('인미사', '')}
    </span>
  )
}

export function Tag({ tone = 'plain', children }: { tone?: 'plain' | 'warn' | 'brand'; children: ReactNode }) {
  const cls =
    tone === 'warn'
      ? 'bg-danger-tint text-danger'
      : tone === 'brand'
        ? 'bg-brand-tint text-brand'
        : 'bg-panel2 text-ink-2'
  return <span className={`rounded-md px-2 py-[3px] text-[10.5px] font-semibold ${cls}`}>{children}</span>
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        'min-w-0 rounded-[9px] border border-line bg-bg px-[11px] py-2 text-[13px] text-ink outline-none ' +
        'placeholder:text-ink-3 focus:border-brand focus:bg-panel ' +
        (props.className ?? '')
      }
    />
  )
}

export function Alert({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'info' }) {
  const cls = tone === 'error' ? 'bg-danger-tint text-danger' : 'bg-panel2 text-ink-2'
  return <div className={`rounded-[14px] px-4 py-3 text-[12.5px] leading-relaxed ${cls}`}>{children}</div>
}

export function Info({ children }: { children: ReactNode }) {
  return (
    <div className="mb-[15px] rounded-[14px] bg-panel2 px-4 py-[14px] text-[12.5px] leading-[1.65] text-ink-2">
      {children}
    </div>
  )
}
