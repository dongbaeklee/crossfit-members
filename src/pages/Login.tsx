import { useState, type FormEvent } from 'react'
import { db } from '../lib/supabase'
import { Alert, Input } from '../components/ui'

/** Supabase 의 영문 오류를 코치가 알아볼 수 있는 문장으로 바꾼다 */
function toKorean(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return '이메일 또는 비밀번호가 맞지 않습니다'
  if (m.includes('email not confirmed')) return '이메일 인증이 필요합니다. 받은 메일함을 확인해 주세요'
  if (m.includes('rate limit') || m.includes('too many')) return '시도가 너무 잦습니다. 잠시 후 다시 해주세요'
  if (m.includes('invalid email')) return '이메일 형식이 올바르지 않습니다'
  return message
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { error } = await db().auth.signInWithPassword({ email, password })
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
      <form onSubmit={submit} className="w-full max-w-[380px] rounded-xl2 bg-panel p-8 shadow-card">
        <h1 className="text-[19px] font-extrabold tracking-[-.02em]">회원 카드</h1>
        <p className="mb-6 mt-[6px] text-[12.5px] leading-relaxed text-ink-3">
          회원 개인정보가 담긴 화면입니다.
          <br />
          코치 계정으로 로그인해 주세요.
        </p>

        <div className="grid gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            autoComplete="username"
            required
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            autoComplete="current-password"
            required
          />
        </div>

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
          {busy ? '확인 중…' : '로그인'}
        </button>

        <p className="mt-4 text-center text-[11.5px] leading-relaxed text-ink-3">
          계정은 관장님이 발급합니다. 로그인은 되는데 화면이 안 열리면 코치 권한이 아직 없는 것입니다.
        </p>
      </form>
    </div>
  )
}
