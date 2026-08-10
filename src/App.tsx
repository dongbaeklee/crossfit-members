import { useAuth } from './auth/AuthProvider'
import Login from './pages/Login'
import Cards from './pages/Cards'
import { Alert } from './components/ui'

export default function App() {
  const { session, profile, loading, isStaff, signOut } = useAuth()

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-[13.5px] text-ink-3">불러오는 중…</div>
  }

  if (!session) return <Login />

  // 로그인은 됐지만 코치 권한이 아직 없는 계정 — 회원 계정으로 들어온 경우가 대부분이다.
  if (!isStaff) {
    return (
      <div className="grid min-h-screen place-items-center px-5">
        <div className="w-full max-w-[380px] rounded-xl2 bg-panel p-8 text-center shadow-card">
          <h1 className="mb-4 text-[17px] font-extrabold">접근 권한이 없습니다</h1>
          <Alert tone="info">
            이 화면은 코치 이상만 볼 수 있습니다.
            {profile ? ` 현재 권한은 '${profile.role}' 입니다.` : ' 프로필이 아직 만들어지지 않았습니다.'}
            <br />
            관장님께 권한 지정을 요청해 주세요.
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
