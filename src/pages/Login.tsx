import { useState, type FormEvent } from 'react'
import { db } from '../lib/supabase'
import { Alert, Input } from '../components/ui'

/**
 * 입장 코드 한 개로 들어가는 화면.
 *
 * 이메일·매직링크·개인 계정이 없다. 팀 공용 계정 하나를 두고, 코치는 그 계정의
 * 비밀번호(=입장 코드)만 친다. 계정 주소는 코드가 아니므로 번들에 있어도 무방하다.
 * 실제 회원 데이터는 로그인 뒤 RLS 를 통과해야만 내려온다.
 */
const TEAM_EMAIL = import.meta.env.VITE_TEAM_EMAIL ?? ''

function toKorean(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return '코드가 맞지 않습니다'
  if (m.includes('email not confirmed'))
    return '공용 계정이 아직 확인되지 않았습니다. 대시보드에서 Auto Confirm 을 켜고 다시 만들어 주세요'
  if (m.includes('rate limit') || m.includes('too many'))
    return '시도가 너무 잦습니다. 잠시 뒤 다시 해주세요'
  return message
}

export default function Login() {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!TEAM_EMAIL) {
      setError('공용 계정이 설정되지 않았습니다 (VITE_TEAM_EMAIL). 관장님께 문의해 주세요.')
      return
    }
    setBusy(true)
    try {
      const { error } = await db().auth.signInWithPassword({
        email: TEAM_EMAIL,
        password: code,
      })
      if (error) throw error
      // 성공하면 onAuthStateChange 가 화면을 넘긴다
    } catch (err) {
      setError(toKorean(err instanceof Error ? err.message : String(err)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-5">
      <form onSubmit={submit} className="w-full max-w-[360px] rounded-xl2 bg-panel p-8 shadow-card">
        <div className="mx-auto mb-4 grid h-[52px] w-[52px] place-items-center rounded-[14px] bg-brand-tint text-brand">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        </div>

        <h1 className="text-center text-[19px] font-extrabold tracking-[-.02em]">회원 카드</h1>
        <p className="mb-6 mt-[6px] text-center text-[12.5px] leading-relaxed text-ink-3">
          입장 코드를 넣어 주세요.
          <br />
          <b className="text-ink-2">이 기기에서는 한 번만 하면 됩니다.</b>
        </p>

        <Input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="입장 코드"
          autoComplete="current-password"
          autoFocus
          required
          className="w-full text-center tracking-[.15em]"
        />

        {error && (
          <div className="mt-3">
            <Alert>{error}</Alert>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded-[11px] bg-brand py-[13px] text-[15px] font-bold text-white transition hover:brightness-95 disabled:opacity-50"
        >
          {busy ? '확인 중…' : '들어가기'}
        </button>

        <p className="mt-4 text-center text-[11.5px] leading-relaxed text-ink-3">
          코드는 관장님께 받으세요. 회원 개인정보가 담긴 화면이라 코드는 외부에 공유하지 말아 주세요.
        </p>
      </form>
    </div>
  )
}
