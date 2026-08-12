import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * 접속 정보가 없으면 **미리보기 모드**로 뜬다.
 * 화면과 조작감을 확인하기 위한 것이며, 데이터는 전부 가짜다(src/lib/preview.ts).
 * .env.local 에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 를 넣으면 자동으로 실제 모드가 된다.
 */
export const PREVIEW = !url || !key

export const supabase: SupabaseClient | null = PREVIEW
  ? null
  : // PREVIEW 가 false 라는 건 url/key 가 둘 다 있다는 뜻이다(위 정의). 타입만 좁혀 준다.
    createClient(url as string, key as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // 매직링크로 돌아왔을 때 URL 의 토큰을 읽어 세션으로 만든다.
        detectSessionInUrl: true,
        // implicit 유지. PKCE 는 링크를 '요청한 기기'에서만 열리는데,
        // 노트북에서 요청하고 폰으로 메일을 여는 경우가 흔해서 그때 로그인이 깨진다.
        flowType: 'implicit',
      },
    })

/** 실제 모드에서만 부른다. 미리보기 중 호출되면 버그이므로 바로 터뜨린다. */
export function db(): SupabaseClient {
  if (!supabase) throw new Error('미리보기 모드에서는 Supabase 를 쓸 수 없습니다')
  return supabase
}
