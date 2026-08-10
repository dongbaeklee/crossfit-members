import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 는 https://<user>.github.io/<repo>/ 아래에 붙으므로 base 가 필요하다.
// 로컬 개발(dev)에서는 '/' 여야 하므로 빌드일 때만 저장소 경로를 쓴다.
// 저장소 이름을 바꾸면 VITE_BASE 로 덮어쓸 수 있다.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? (process.env.VITE_BASE ?? '/crossfit-members/') : '/',
  plugins: [react()],
}))
