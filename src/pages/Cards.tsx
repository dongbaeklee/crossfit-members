import { useEffect, useMemo, useState } from 'react'
import { PREVIEW } from '../lib/supabase'
import { loadCards, saveProfile } from '../lib/store'
import { useAuth } from '../auth/AuthProvider'
import type { MemberCard, ProfilePatch } from '../types'
import { applyFilters, isRated, type FilterMode } from '../lib/cards'
import CardTile from '../components/CardTile'
import EditPanel from '../components/EditPanel'
import { Alert, Chip, Info, Input } from '../components/ui'

const keyOf = (c: Pick<MemberCard, 'box' | 'name'>) => `${c.box}::${c.name}`

export default function Cards() {
  const { profile, signOut } = useAuth()
  const [rows, setRows] = useState<MemberCard[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const [selected, setSelected] = useState<string | null>(null)
  const [box, setBox] = useState('')
  const [mode, setMode] = useState<FilterMode>('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await loadCards()
        if (alive) setRows(data)
      } catch (e) {
        if (alive) setLoadError(e instanceof Error ? e.message : String(e))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const boxes = useMemo(() => [...new Set(rows.map((r) => r.box))].sort(), [rows])
  const ratedCount = useMemo(() => rows.filter(isRated).length, [rows])
  const visible = useMemo(() => applyFilters(rows, { box, mode, query }), [rows, box, mode, query])
  const selectedCard = useMemo(() => rows.find((r) => keyOf(r) === selected) ?? null, [rows, selected])

  /** 낙관적 반영 후 저장. 실패하면 되돌리고 이유를 보여준다. */
  async function patch(card: MemberCard, p: ProfilePatch) {
    const k = keyOf(card)
    const before = rows
    setSaveError('')
    setSavingKey(k)
    setRows((prev) => prev.map((r) => (keyOf(r) === k ? { ...r, ...p } : r)))

    try {
      await saveProfile(card, p)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setRows(before)
      setSaveError(
        msg.includes('row-level security')
          ? '저장 권한이 없습니다. 담당 지점이 맞는지 관장님께 확인해 주세요.'
          : `저장 실패: ${msg}`,
      )
    } finally {
      setSavingKey(null)
    }
  }

  const toggle = (m: FilterMode) => setMode((cur) => (cur === m ? 'all' : m))

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-6">
      <header className="mb-4 flex items-center gap-3">
        <h1 className="text-[20px] font-extrabold tracking-[-.02em]">회원 카드</h1>
        <span className="text-[12px] text-ink-3">
          {profile?.display_name || profile?.role}
          {profile?.box ? ` · ${profile.box}` : ' · 전체'}
        </span>
        {!PREVIEW && (
          <button
            type="button"
            onClick={signOut}
            className="ml-auto rounded-[9px] border border-line bg-panel px-[13px] py-2 text-[12.5px] font-semibold text-ink-2 transition hover:border-line2 hover:text-ink"
          >
            로그아웃
          </button>
        )}
      </header>

      {PREVIEW && (
        <div className="mb-4 rounded-[14px] border border-warn/30 bg-warn-tint px-4 py-[14px] text-[12.5px] leading-[1.65] text-ink-2">
          <b className="text-warn">미리보기 — 화면에 보이는 회원은 전부 가짜입니다.</b>
          <br />
          모양과 조작감을 확인하기 위한 화면입니다. 고쳐도 새로고침하면 되돌아가고, 아무 데도 저장되지 않습니다.
          Supabase 프로젝트를 복구하고 접속 정보를 넣으면 실제 회원 197명이 뜨고 로그인이 켜집니다.
        </div>
      )}

      <Info>
        회원별 <b>운동 역량</b>(역도·체조·유산소)과 <b>특성</b>(목표·성향·리스크)을 한 장으로 봅니다. 카드를 누르면
        바로 편집됩니다.{' '}
        <span className="text-ink-3">
          평가 완료 <b>{ratedCount}</b>명 / 전체 {rows.length}명
          {PREVIEW ? ' · 미리보기라 저장되지 않습니다.' : ' · 입력값은 바로 저장되어 다른 코치에게도 보입니다.'}
        </span>
      </Info>

      {loadError && (
        <div className="mb-4">
          <Alert>
            회원 목록을 불러오지 못했습니다: {loadError}
            <br />
            코치 권한이 없거나 담당 지점이 지정되지 않은 계정일 수 있습니다.
          </Alert>
        </div>
      )}
      {saveError && (
        <div className="mb-4">
          <Alert>{saveError}</Alert>
        </div>
      )}

      <div className="mb-[13px] flex flex-wrap items-center gap-2">
        <Input
          className="flex-1 basis-[170px] bg-panel"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름 검색"
        />
        <Chip active={box === ''} onClick={() => setBox('')}>
          전체 {rows.length}
        </Chip>
        {boxes.map((b) => (
          <Chip key={b} active={box === b} onClick={() => setBox(b)}>
            {b.replace('인미사', '')}
          </Chip>
        ))}
        <Chip active={mode === 'todo'} onClick={() => toggle('todo')}>
          미평가
        </Chip>
        <Chip active={mode === 'weak'} onClick={() => toggle('weak')}>
          약점 있음
        </Chip>
        <Chip active={mode === 'absent'} onClick={() => toggle('absent')}>
          미출석
        </Chip>
      </div>

      {selectedCard && (
        <EditPanel
          card={selectedCard}
          saving={savingKey === keyOf(selectedCard)}
          error={saveError ? '저장 실패' : ''}
          onPatch={(p) => patch(selectedCard, p)}
          onClose={() => setSelected(null)}
        />
      )}

      {loading ? (
        <div className="py-[30px] text-center text-[13.5px] text-ink-3">불러오는 중…</div>
      ) : visible.length === 0 ? (
        <div className="py-[30px] text-center text-[13.5px] text-ink-3">
          {rows.length === 0 ? '아직 회원 데이터가 없습니다. 시드 스크립트를 먼저 실행하세요.' : '조건에 맞는 회원이 없습니다.'}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(228px,1fr))] gap-[11px]">
          {visible.map((c) => {
            const k = keyOf(c)
            return <CardTile key={k} card={c} selected={selected === k} onSelect={() => setSelected(selected === k ? null : k)} />
          })}
        </div>
      )}
    </div>
  )
}
