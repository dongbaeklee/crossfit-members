import { PREVIEW } from './lib/supabase'
import { useAuth } from './auth/AuthProvider'
import Login from './pages/Login'
import Cards from './pages/Cards'
import { Alert } from './components/ui'

export default function App() {
  const { session, profile, loading, isStaff, signOut } = useAuth()

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-[13.5px] text-ink-3">불러오는 중…</div>
  }

  // 미리보기 모드에는 세션이 없다. 로그인 화면을 건너뛰고 바로 카드로 들어간다.
  if (!PREVIEW && !session) return <Login />

  // 로그인은 됐지만 코치 권한이 아직 없는 계정 — 회원 계정으로 들어온 경우가 대부분이다.
  if (!isStaff) {
    return (
      <div className="grid min-h-screen place-items-center px-5">
        <div className="w-full max-w-[380px] rounded-xl2 bg-panel p-8 text-center shadow-card">
          <h1 className="mb-4 text-[17px] font-extrabold">로그인은 됐습니다</h1>
          <Alert tone="info">
            아직 코치 권한이 없어 회원 정보를 볼 수 없습니다.
            <br />
            관장님께 <b>아래 이메일</b>을 알려주고 권한을 요청해 주세요.
            <div className="mt-2 rounded-lg bg-panel px-3 py-2 text-[13px] font-bold text-ink">
              {session?.user?.email ?? '(이메일 확인 불가)'}
            </div>
            <div className="mt-2 text-[11.5px] text-ink-3">
              현재 권한: {profile ? profile.role : '미지정'}
            </div>
          </Alert>
          <button
            type="button"
            onClick={signOut}
            className="mt-4 w-full rounded-[11px] border border-line py-3 text-[13.5px] font-semibold text-ink-2 hover:border-line2"
          >
            로그아웃
          </button>
        </div>
      </div>
    )
  }

  return <Cards />
}
