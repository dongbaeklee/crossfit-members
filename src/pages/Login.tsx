import { useState, type FormEvent } from 'react'
import { db } from '../lib/supabase'
import { Alert, Input } from '../components/ui'

/** Supabase 의 영문 오류를 코치가 알아볼 수 있는 문장으로 바꾼다 */
function toKorean(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('rate limit') || m.includes('too many') || m.includes('after'))
    return '메일 발송 한도에 걸렸습니다. 잠시 뒤(약 1시간) 다시 시도하거나, 이미 받은 링크를 확인해 주세요'
  if (m.includes('invalid email') || m.includes('unable to validate email'))
    return '이메일 형식이 올바르지 않습니다'
  if (m.includes('signups not allowed') || m.includes('signup is disabled'))
    return '등록되지 않은 이메일입니다. 관장님께 계정 등록을 요청해 주세요'
  return message
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      // 링크를 눌렀을 때 이 사이트로 돌아오게 한다.
      // BASE_URL 은 /crossfit-members/ 라 배포 주소와 정확히 맞는다.
      const redirect = window.location.origin + import.meta.env.BASE_URL
      const { error } = await db().auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirect },
      })
      if (error) throw error
      setSent(true)
    } catch (err) {
      setError(toKorean(err instanceof Error ? err.message : String(err)))
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="grid min-h-screen place-items-center px-5">
        <div className="w-full max-w-[380px] rounded-xl2 bg-panel p-8 text-center shadow-card">
          <div className="mx-auto mb-4 grid h-[52px] w-[52px] place-items-center rounded-[14px] bg-brand-tint text-brand">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </div>
          <h1 className="text-[19px] font-extrabold tracking-[-.02em]">메일을 보냈습니다</h1>
          <p className="mt-[10px] text-[13px] leading-relaxed text-ink-2">
            <b>{email}</b> 로 로그인 링크를 보냈습니다.
            <br />
            메일의 링크를 누르면 바로 들어와집니다.
          </p>
          <p className="mt-4 text-[11.5px] leading-relaxed text-ink-3">
            링크는 1시간 동안 유효합니다. 메일이 안 보이면 스팸함도 확인해 주세요.
            <br />
            <b>메일은 링크를 요청한 기기에서 여는 게 좋습니다.</b> 그래야 그 기기에 로그인 상태가 남습니다.
          </p>
          <button
            type="button"
            onClick={() => {
              setSent(false)
              setError('')
            }}
            className="mt-5 w-full rounded-[11px] border border-line py-3 text-[13.5px] font-semibold text-ink-2 transition hover:border-line2 hover:text-ink"
          >
            다른 이메일로 다시 받기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-screen place-items-center px-5">
      <form onSubmit={submit} className="w-full max-w-[380px] rounded-xl2 bg-panel p-8 shadow-card">
        <h1 className="text-[19px] font-extrabold tracking-[-.02em]">회원 카드</h1>
        <p className="mb-6 mt-[6px] text-[12.5px] leading-relaxed text-ink-3">
          이메일을 넣으면 로그인 링크를 보내드립니다. 비밀번호는 없습니다.
          <br />
          <b className="text-ink-2">이 기기에서는 한 번만 하면 됩니다.</b> 다음부터는 주소만 열면 바로 들어옵니다.
        </p>

        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          autoComplete="email"
          required
          className="w-full"
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
          {busy ? '보내는 중…' : '로그인 링크 받기'}
        </button>

        <p className="mt-4 text-center text-[11.5px] leading-relaxed text-ink-3">
          링크로 들어왔는데 화면이 안 열리면 코치 권한이 아직 없는 것입니다. 관장님께 요청해 주세요.
        </p>
      </form>
    </div>
  )
}
