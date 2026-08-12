import { useEffect, useMemo, useState } from 'react'
import { PREVIEW } from '../lib/supabase'
import { addMember, archiveMember, loadCards, saveProfile } from '../lib/store'
import { useAuth } from '../auth/AuthProvider'
import type { MemberCard, ProfilePatch } from '../types'
import { applyFilters, isAbsent, isRated } from '../lib/cards'
import { exportMembers } from '../lib/export'
import CardTile from '../components/CardTile'
import EditPanel from '../components/EditPanel'
import { Alert, Chip, Input } from '../components/ui'

const keyOf = (c: Pick<MemberCard, 'box' | 'name'>) => `${c.box}::${c.name}`

/** 상단 요약 한 칸. 큰 숫자 + 작은 라벨 — 참고 디자인의 기본 리듬. */
function Stat({ label, value, tone }: { label: string; value: number; tone?: 'accent' | 'warn' }) {
  const color = tone === 'accent' ? 'text-accent' : tone === 'warn' ? 'text-danger' : 'text-ink'
  return (
    <div className="glass rounded-[16px] px-[18px] py-[14px]">
      <div className="mb-[3px] text-[10.5px] font-medium text-ink-3">{label}</div>
      {/* 큰 표시 숫자에는 tnum 을 쓰지 않는다. '11' 이 '1 1' 처럼 벌어져 보인다.
          고정폭은 값이 자주 바뀌며 세로로 정렬돼야 하는 곳에만 쓴다. */}
      <div className={`text-[27px] font-semibold leading-none tracking-[-.03em] ${color}`}>{value}</div>
    </div>
  )
}

export default function Cards() {
  const { profile, signOut } = useAuth()
  const [rows, setRows] = useState<MemberCard[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const [selected, setSelected] = useState<string | null>(null)
  const [box, setBox] = useState('')
  const [query, setQuery] = useState('')

  // 회원 추가 폼
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newBox, setNewBox] = useState('')
  const [busy, setBusy] = useState(false)

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
  const visible = useMemo(() => applyFilters(rows, { box, query }), [rows, box, query])
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

  /** 회원 추가. 성공하면 그 회원을 바로 열어 이어서 입력할 수 있게 한다. */
  async function submitAdd() {
    const name = newName.trim()
    const target = newBox || boxes[0] || ''
    if (!name || !target) return
    setSaveError('')
    setBusy(true)
    try {
      const card = await addMember(target, name)
      setRows((prev) => [...prev, card].sort((a, b) => a.name.localeCompare(b.name, 'ko')))
      setNewName('')
      setAdding(false)
      setSelected(keyOf(card))
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  /** 회원 삭제(보관). 낙관적으로 목록에서 빼고, 실패하면 되돌린다. */
  async function removeMember(card: MemberCard) {
    const before = rows
    setSaveError('')
    setSelected(null)
    setRows((prev) => prev.filter((r) => keyOf(r) !== keyOf(card)))
    try {
      await archiveMember(card)
    } catch (e) {
      setRows(before)
      setSaveError(e instanceof Error ? e.message : String(e))
    }
  }

  const absentCount = useMemo(() => rows.filter(isAbsent).length, [rows])

  return (
    <div className="mx-auto max-w-[1280px] px-5 pb-16 pt-7">
      <header className="mb-5 flex items-center gap-[13px]">
        <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[12px] bg-accent text-black">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
            <rect x="5" y="6" width="14" height="2.6" rx="1.3" />
            <rect x="5" y="10.7" width="9.5" height="2.6" rx="1.3" opacity=".72" />
            <rect x="5" y="15.4" width="5" height="2.6" rx="1.3" opacity=".45" />
          </svg>
        </span>
        <div>
          <h1 className="text-[19px] font-bold leading-tight tracking-[-.03em]">회원 카드</h1>
          <p className="text-[11.5px] text-ink-3">
            {profile?.display_name || profile?.role}
            {profile?.box ? ` · ${profile.box}` : ' · 전 지점'}
          </p>
        </div>
        {!PREVIEW && (
          <button
            type="button"
            onClick={signOut}
            className="glass glass-hover ml-auto rounded-full px-[15px] py-[8px] text-[12.5px] font-semibold text-ink-2"
          >
            로그아웃
          </button>
        )}
      </header>

      <div className="mb-4 grid grid-cols-2 gap-[10px] sm:grid-cols-4">
        <Stat label="전체 회원" value={rows.length} />
        <Stat label="평가 완료" value={ratedCount} tone="accent" />
        <Stat label="미평가" value={rows.length - ratedCount} />
        <Stat label="10일+ 미출석" value={absentCount} tone={absentCount ? 'warn' : undefined} />
      </div>

      {PREVIEW && (
        <div className="mb-4 rounded-[16px] border border-amber/25 bg-amber/[.08] px-[18px] py-[14px] text-[12.5px] leading-[1.7] text-ink-2">
          <b className="text-amber">미리보기 — 화면에 보이는 회원은 전부 가짜입니다.</b>
          <br />
          모양과 조작감을 확인하기 위한 화면입니다. 고쳐도 새로고침하면 되돌아갑니다.
        </div>
      )}

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
          className="w-[190px] rounded-full"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름 검색"
        />
        <span className="mx-[3px] h-[18px] w-px bg-line" />
        <Chip active={box === ''} onClick={() => setBox('')}>
          전체 {rows.length}
        </Chip>
        {boxes.map((b) => (
          <Chip key={b} active={box === b} onClick={() => setBox(b)}>
            {b.replace('인미사', '')} {rows.filter((r) => r.box === b).length}
          </Chip>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportMembers(visible, box)}
            disabled={visible.length === 0}
            title="지금 보이는 목록을 그대로 내려받습니다"
            className="glass glass-hover flex items-center gap-[7px] rounded-full px-[15px] py-[8px] text-[12.5px] font-semibold text-ink-2 disabled:opacity-35"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v11" />
              <path d="m7.5 11 4.5 4.5 4.5-4.5" />
              <path d="M4.5 19.5h15" />
            </svg>
            엑셀 내려받기
          </button>

          <button
            type="button"
            onClick={() => {
              setAdding((v) => !v)
              setNewBox(box || boxes[0] || '')
            }}
            className="flex items-center gap-[6px] rounded-full bg-accent px-[15px] py-[8px] text-[12.5px] font-bold text-black transition hover:brightness-110"
          >
            <span className="text-[15px] leading-none">+</span> 회원 추가
          </button>
        </div>
      </div>

      {adding && (
        <div className="glass mb-4 flex flex-wrap items-center gap-[10px] rounded-[16px] px-[18px] py-[14px]">
          <span className="text-[12px] font-medium text-ink-3">지점</span>
          {boxes.map((b) => (
            <Chip key={b} active={newBox === b} onClick={() => setNewBox(b)}>
              {b.replace('인미사', '')}
            </Chip>
          ))}
          <Input
            className="ml-[6px] w-[200px] rounded-full"
            value={newName}
            autoFocus
            placeholder="회원 이름"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitAdd()
              if (e.key === 'Escape') setAdding(false)
            }}
          />
          <button
            type="button"
            onClick={submitAdd}
            disabled={busy || !newName.trim()}
            className="rounded-full bg-accent px-[16px] py-[8px] text-[12.5px] font-bold text-black transition hover:brightness-110 disabled:opacity-35"
          >
            {busy ? '추가 중…' : '추가'}
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="rounded-full border border-line px-[14px] py-[8px] text-[12.5px] font-semibold text-ink-3 transition hover:border-line2 hover:text-ink"
          >
            취소
          </button>
          <span className="w-full text-[11.5px] leading-relaxed text-ink-3">
            여기서 추가한 회원은 주간 엑셀 갱신에도 지워지지 않습니다. 회원권·출석 정보는 엑셀에서만 채워집니다.
          </span>
        </div>
      )}

      {selectedCard && (
        <EditPanel
          card={selectedCard}
          saving={savingKey === keyOf(selectedCard)}
          error={saveError ? '저장 실패' : ''}
          onPatch={(p) => patch(selectedCard, p)}
          onDelete={() => removeMember(selectedCard)}
          onClose={() => setSelected(null)}
        />
      )}

      {loading ? (
        <div className="py-[60px] text-center text-[13px] text-ink-3">불러오는 중…</div>
      ) : visible.length === 0 ? (
        <div className="py-[60px] text-center text-[13px] text-ink-3">
          {rows.length === 0 ? '아직 회원 데이터가 없습니다. 시드 스크립트를 먼저 실행하세요.' : '조건에 맞는 회원이 없습니다.'}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(238px,1fr))] gap-[12px]">
          {visible.map((c) => {
            const k = keyOf(c)
            return <CardTile key={k} card={c} selected={selected === k} onSelect={() => setSelected(selected === k ? null : k)} />
          })}
        </div>
      )}
    </div>
  )
}
