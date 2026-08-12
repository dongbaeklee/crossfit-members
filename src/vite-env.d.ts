/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** 팀 공용 계정 주소. 비밀이 아니다 — 입장 코드가 비밀이다. */
  readonly VITE_TEAM_EMAIL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
