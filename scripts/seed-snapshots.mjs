#!/usr/bin/env node
/**
 * 참모프로젝트/_members.json → Supabase public.member_snapshots 동기화.
 *
 * 매주 회원 엑셀을 반영한 뒤 다시 돌리면 된다. upsert 라 여러 번 돌려도 안전하고,
 * 코치가 입력한 member_profiles 는 건드리지 않는다.
 *
 * 실행:
 *   node scripts/seed-snapshots.mjs            # 실제 반영
 *   node scripts/seed-snapshots.mjs --dry-run  # 무엇이 바뀔지만 출력
 *
 * 필요 환경변수 (.env.local — 절대 커밋하지 말 것):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← RLS 를 우회하므로 서버/로컬에서만 쓴다. VITE_ 접두사 금지.
 */
import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const SOURCE = process.env.MEMBERS_JSON ?? '/Users/dohyeong/참모프로젝트/_members.json'
const DRY = process.argv.includes('--dry-run')

// ── .env.local 로드 (dotenv 의존성 없이) ──────────────────────
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

// 자격증명 검사는 실제로 쓰기 직전에 한다. --dry-run 은 DB 없이도 돌아가야 파싱을 검증할 수 있다.

// ── 정규화 헬퍼 ──────────────────────────────────────────────
const text = (v) => String(v ?? '').trim()
/** 빈 문자열·공백은 null 로. 날짜 컬럼에 '' 를 넣으면 Postgres 가 거부한다. */
const date = (v) => {
  const s = text(v).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

/**
 * 한 회원(이름)이 여러 행을 가질 수 있다(프로모 회원권이 별도 행).
 * 대표 행 = 회원권 종료일이 가장 늦은 행. 허브 build_hub.py 의 규칙과 같게 맞춘다.
 */
function pickRows(gym, rows) {
  const best = new Map()
  for (const r of rows) {
    if (text(r['코치 여부']).toUpperCase() === 'Y') continue // 코치는 회원 카드 대상이 아님
    const name = text(r['이름'])
    if (!name) continue
    const end = text(r['회원권 종료일'])
    const cur = best.get(name)
    if (!cur || end > text(cur['회원권 종료일'])) best.set(name, r)
  }
  return [...best.entries()].map(([name, r]) => ({
    box: gym,
    name,
    status: text(r['회원 상태']),
    plan: text(r['회원권명']),
    plan_start: date(r['회원권 시작일']),
    plan_end: date(r['회원권 종료일']),
    joined_on: date(r['가입일']),
    last_attended: date(r['최근 출석일']),
    synced_at: new Date().toISOString(),
  }))
}

// ── 실행 ────────────────────────────────────────────────────
const raw = JSON.parse(readFileSync(SOURCE, 'utf8'))
const records = Object.entries(raw).flatMap(([gym, rows]) => pickRows(gym, rows))

console.log(`원본: ${SOURCE}`)
for (const [gym, rows] of Object.entries(raw)) {
  const n = records.filter((r) => r.box === gym).length
  console.log(`  ${gym}: 행 ${rows.length} → 회원 ${n}명 (코치 제외·이름 기준 중복 제거)`)
}
console.log(`총 ${records.length}명`)

if (DRY) {
  console.log('\n--dry-run 이라 반영하지 않았습니다. 샘플 3건:')
  console.table(records.slice(0, 3))
  process.exit(0)
}

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다 (.env.example 참고)')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

// 지점 값이 boxes 테이블에 없으면 FK 로 막힌다 — 먼저 확인해 원인을 분명히 알려준다.
const { data: boxes, error: boxErr } = await supabase.from('boxes').select('id')
if (boxErr) {
  console.error('boxes 조회 실패:', boxErr.message)
  process.exit(1)
}
const known = new Set((boxes ?? []).map((b) => b.id))
const unknown = [...new Set(records.map((r) => r.box))].filter((b) => !known.has(b))
if (unknown.length) {
  console.error(`boxes 테이블에 없는 지점: ${unknown.join(', ')}`)
  console.error(`등록된 지점: ${[...known].join(', ')}`)
  process.exit(1)
}

const { error, count } = await supabase
  .from('member_snapshots')
  .upsert(records, { onConflict: 'box,name', count: 'exact' })

if (error) {
  console.error('업서트 실패:', error.message)
  process.exit(1)
}

console.log(`\n반영 완료: ${count ?? records.length}건 upsert`)
console.log('코치가 입력한 member_profiles 는 건드리지 않았습니다.')
