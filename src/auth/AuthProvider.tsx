import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { StaffProfile } from '../types'

interface AuthValue {
  session: Session | null
  profile: StaffProfile | null
  loading: boolean
  /** 코치 이상만 이 화면을 쓸 수 있다 */
  isStaff: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

const STAFF_ROLES = ['coach', 'manager', 'owner']

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    async function loadProfile(userId: string) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, box, display_name')
        .eq('id', userId)
        .maybeSingle()
      if (!alive) return
      if (error) {
        console.error('프로필 조회 실패', error)
        setProfile(null)
        return
      }
      setProfile((data as StaffProfile | null) ?? null)
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return
      setSession(data.session)
      if (data.session) await loadProfile(data.session.user.id)
      if (alive) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, next) => {
      if (!alive) return
      setSession(next)
      if (next) await loadProfile(next.user.id)
      else setProfile(null)
    })

    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value: AuthValue = {
    session,
    profile,
    loading,
    isStaff: !!profile && STAFF_ROLES.includes(profile.role),
    signOut: async () => {
      await supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 는 AuthProvider 안에서만 쓸 수 있습니다')
  return ctx
}
