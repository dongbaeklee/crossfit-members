import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 는 https://<user>.github.io/<repo>/ 아래에 붙으므로 base 가 필요하다.
// dev·preview·build 모두 같은 base 를 써야 로컬에서 확인한 것과 배포본이 같아진다.
// (command 로 갈랐더니 vite preview 가 base 없이 떠서 빌드 산출물의 asset 경로와 어긋났다.)
// 저장소 이름을 바꾸면 VITE_BASE 로 덮어쓴다.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/crossfit-members/',
  plugins: [react()],
})
