/**
 * 직접 만든 xlsx 가 실제로 열리는 파일인지 확인한다.
 *   npx vite-node scripts/check-xlsx.ts
 * 그 뒤 openpyxl 로 읽어 내용까지 대조한다(check-xlsx.sh 참고).
 *
 * 라이브러리 없이 zip/XML 을 손으로 쓰는 코드라, 여기서 한 번 열어보지 않으면
 * "엑셀에서 파일이 손상됐다고 나옴" 을 사용자가 먼저 발견하게 된다.
 */
import { writeFileSync } from 'node:fs'
import { toRows } from '../src/lib/export'
import { buildXlsx } from '../src/lib/xlsx'
import { PREVIEW_CARDS } from '../src/lib/preview'
import type { MemberCard } from '../src/types'

// 까다로운 값들을 일부러 섞는다: XML 특수문자, 따옴표, 긴 텍스트, 빈 값
const tricky: MemberCard[] = [
  {
    ...PREVIEW_CARDS[0],
    name: '따옴표"와 <꺾쇠> & 앰퍼샌드',
    goal: '체중감량 → 5kg',
    trait: "작은따옴표'도",
    risk: '',
    plan: '3개월 무제한(홀딩환불불가)',
  },
  { ...PREVIEW_CARDS[1], name: '미평가회원', cap_weight: 0, cap_gym: 0, cap_metcon: 0, goal: '', trait: '', risk: '' },
]

const cards = [...PREVIEW_CARDS, ...tricky]
const rows = toRows(cards)
const blob = buildXlsx(rows, { sheetName: '회원 카드', widths: [] })

const buf = Buffer.from(await blob.arrayBuffer())
writeFileSync('/tmp/check.xlsx', buf)
console.log(`행 ${rows.length} (헤더 포함) · ${buf.length} bytes → /tmp/check.xlsx`)
