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
  : createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })

/** 실제 모드에서만 부른다. 미리보기 중 호출되면 버그이므로 바로 터뜨린다. */
export function db(): SupabaseClient {
  if (!supabase) throw new Error('미리보기 모드에서는 Supabase 를 쓸 수 없습니다')
  return supabase
}
