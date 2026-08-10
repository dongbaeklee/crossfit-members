/** @type {import('tailwindcss').Config} */
// 색은 허브(참모 대시보드)의 토스 토큰을 그대로 가져와 두 화면이 한 제품처럼 보이게 한다.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F9FAFB',
        panel: '#FFFFFF',
        panel2: '#F2F4F6',
        line: '#E5E8EB',
        line2: '#D1D6DB',
        ink: { DEFAULT: '#191F28', 2: '#4E5968', 3: '#8B95A1' },
        brand: { DEFAULT: '#3182F6', tint: '#E8F3FF' },
        bali: { DEFAULT: '#3182F6', tint: '#E8F3FF' },
        makers: { DEFAULT: '#00A868', tint: '#E4F9F0' },
        danger: { DEFAULT: '#F04452', tint: '#FEECEE' },
        warn: { DEFAULT: '#E5890A', tint: '#FFF4E0' },
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Apple SD Gothic Neo', 'Malgun Gothic', 'sans-serif'],
      },
      borderRadius: { xl2: '20px' },
      boxShadow: {
        card: '0 1px 3px rgba(20,32,54,.04), 0 5px 18px rgba(20,32,54,.05)',
        cardHover: '0 2px 6px rgba(20,32,54,.06), 0 14px 34px rgba(20,32,54,.10)',
      },
    },
  },
  plugins: [],
}
