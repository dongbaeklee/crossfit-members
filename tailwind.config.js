/** @type {import('tailwindcss').Config} */
// 다크 시네마틱 팔레트. 참고: Juice Lab, Fitness Tracking Dashboard.
// 거의 검은 배경 위에 반투명 유리 카드가 뜨고, 주황이 유일한 강한 색이다.
// 색을 아끼는 게 이 디자인의 핵심 — 주황이 나오는 자리가 곧 "봐야 할 곳"이다.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 표면
        bg: '#0A0A0C',
        bg2: '#111114',
        glass: 'rgba(255,255,255,0.045)',
        glassHi: 'rgba(255,255,255,0.075)',
        line: 'rgba(255,255,255,0.085)',
        line2: 'rgba(255,255,255,0.16)',

        // 글자
        ink: '#F4F4F6',
        'ink-2': 'rgba(255,255,255,0.62)',
        'ink-3': 'rgba(255,255,255,0.38)',

        // 액센트 — 주황 하나만 강하게
        accent: '#FF6B35',
        'accent-dim': 'rgba(255,107,53,0.14)',

        // 데이터 색 (강점=라임, 약점=주황, 경고=레드)
        lime: '#B7EE6B',
        amber: '#F5A524',
        danger: '#FF4D4D',
        'danger-dim': 'rgba(255,77,77,0.14)',

        // 지점 구분
        bali: '#6BA8FF',
        makers: '#B7EE6B',
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Apple SD Gothic Neo', 'sans-serif'],
      },
      borderRadius: { xl2: '20px', xl3: '24px' },
      boxShadow: {
        glass: '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 18px 40px -12px rgba(0,0,0,0.7)',
        lift: '0 1px 0 0 rgba(255,255,255,0.10) inset, 0 26px 60px -18px rgba(0,0,0,0.85)',
      },
    },
  },
  plugins: [],
}
