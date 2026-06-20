'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { addSchedule, addHabit, addExpense, addMemo, addCategory } from '@/app/actions/entries'
import { createClient } from '@/lib/supabase/client'
import TimePicker from '@/components/TimePicker'

type ItemType = '일정' | '습관' | '지출' | '메모'
type Category = { id: string; name: string; color: string }

const ITEMS: { label: ItemType; emoji: string }[] = [
  { label: '일정', emoji: '📅' },
  { label: '습관', emoji: '✅' },
  { label: '지출', emoji: '💸' },
  { label: '메모', emoji: '📝' },
]

const COLORS = [
  '#ffb5c8', '#ffcfa3', '#fff4a3', '#b8f0b8',
  '#a3d4ff', '#d4a3ff', '#a3ece8', '#d4c4b0',
]

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function PlusMenu() {
  const [open, setOpen]           = useState(false)
  const [modal, setModal]         = useState<ItemType | null>(null)
  const [pending, setPending]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // Schedule-specific state
  const [schedColor, setSchedColor]   = useState<string>(COLORS[4])
  const [categories, setCategories]   = useState<Category[]>([])
  const [selCategory, setSelCategory] = useState<string>('')
  const [newCatName, setNewCatName]   = useState('')
  const [newCatColor, setNewCatColor] = useState(COLORS[5])
  const [addingCat, setAddingCat]     = useState(false)
  const [catPending, setCatPending]   = useState(false)

  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (modal !== '일정') return
    const sb = createClient()
    sb.from('schedule_category').select('id, name, color').order('created_at').then(({ data }) => {
      setCategories(data ?? [])
    })
  }, [modal])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const fd = new FormData(e.currentTarget)

    if (modal === '일정') {
      fd.set('color', schedColor)
      if (selCategory) fd.set('category_id', selCategory)
    }

    let result
    if (modal === '일정')     result = await addSchedule(fd)
    else if (modal === '습관') result = await addHabit(fd)
    else if (modal === '지출') result = await addExpense(fd)
    else if (modal === '메모') result = await addMemo(fd)
    else { setPending(false); return }

    if (result.error) {
      setError(result.error)
    } else {
      setModal(null)
      setError(null)
      setSchedColor(COLORS[4])
      setSelCategory('')
      router.refresh()
    }
    setPending(false)
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return
    setCatPending(true)
    const res = await addCategory(newCatName, newCatColor)
    if (!res.error && res.id) {
      const created = { id: res.id, name: newCatName.trim(), color: newCatColor }
      setCategories(prev => [...prev, created])
      setSelCategory(created.id)
      setNewCatName('')
      setAddingCat(false)
    }
    setCatPending(false)
  }

  function closeModal() {
    setModal(null)
    setError(null)
    setAddingCat(false)
    setNewCatName('')
  }

  function openModal(label: ItemType) {
    setOpen(false)
    setModal(label)
  }

  const today = todayStr()

  return (
    <>
      <div className="board-v2-plus-wrap" ref={ref}>
        {open && (
          <div className="board-v2-plus-menu" role="menu">
            {ITEMS.map(item => (
              <button
                key={item.label}
                type="button"
                className="board-v2-plus-item"
                role="menuitem"
                onClick={() => openModal(item.label)}
              >
                <span className="board-v2-plus-emoji">{item.emoji}</span>
                {item.label}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className={`board-v2-plus${open ? ' is-open' : ''}`}
          aria-label="추가"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          +
        </button>
      </div>

      {modal && (
        <div className="board-v2-modal-overlay" onClick={closeModal}>
          <div className="board-v2-modal" onClick={e => e.stopPropagation()}>
            <div className="board-v2-modal-header">
              <span>{ITEMS.find(i => i.label === modal)?.emoji} {modal} 추가</span>
              <button type="button" onClick={closeModal} className="board-v2-modal-close">×</button>
            </div>

            <form onSubmit={handleSubmit} className="board-v2-modal-form">

              {modal === '일정' && (
                <>
                  <input name="title" placeholder="일정 이름" className="board-v2-modal-input" required autoFocus />

                  {/* date + time */}
                  <input name="date" type="date" defaultValue={today} className="board-v2-modal-input" required />
                  <TimePicker name="time" />

                  {/* color picker */}
                  <div className="board-v2-color-row">
                    <span className="board-v2-color-label">색상</span>
                    <div className="board-v2-color-picks">
                      {COLORS.map(c => (
                        <button
                          key={c} type="button"
                          className={`board-v2-color-dot${schedColor === c ? ' is-selected' : ''}`}
                          style={{ background: c }}
                          onClick={() => setSchedColor(c)}
                          aria-label={c}
                        />
                      ))}
                    </div>
                  </div>

                  {/* category selector */}
                  <div className="board-v2-cat-row">
                    <select
                      className="board-v2-modal-input board-v2-cat-select"
                      value={selCategory}
                      onChange={e => setSelCategory(e.target.value)}
                    >
                      <option value="">카테고리 없음</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button type="button" className="board-v2-cat-add-btn" onClick={() => setAddingCat(v => !v)}>
                      {addingCat ? '✕' : '+ 추가'}
                    </button>
                  </div>

                  {addingCat && (
                    <div className="board-v2-cat-new">
                      <input
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        placeholder="카테고리 이름"
                        className="board-v2-modal-input"
                      />
                      <div className="board-v2-color-picks board-v2-color-picks-sm">
                        {COLORS.map(c => (
                          <button
                            key={c} type="button"
                            className={`board-v2-color-dot board-v2-color-dot-sm${newCatColor === c ? ' is-selected' : ''}`}
                            style={{ background: c }}
                            onClick={() => setNewCatColor(c)}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        className="board-v2-modal-submit"
                        disabled={catPending || !newCatName.trim()}
                        onClick={handleAddCategory}
                      >
                        {catPending ? '…' : '카테고리 저장'}
                      </button>
                    </div>
                  )}
                </>
              )}

              {modal === '습관' && (
                <input name="name" placeholder="습관 이름" className="board-v2-modal-input" required autoFocus />
              )}

              {modal === '지출' && (
                <>
                  <input name="title" placeholder="지출 항목" className="board-v2-modal-input" required autoFocus />
                  <div className="board-v2-modal-row">
                    <input name="amount" type="number" placeholder="금액 (원)" className="board-v2-modal-input" required min={1} />
                    <input name="date" type="date" defaultValue={today} className="board-v2-modal-input" required />
                  </div>
                </>
              )}

              {modal === '메모' && (
                <>
                  <textarea name="text" placeholder="오늘의 메모를 남겨보세요" className="board-v2-modal-input board-v2-modal-textarea" required autoFocus rows={4} />
                  <input name="date" type="date" defaultValue={today} className="board-v2-modal-input" required />
                </>
              )}

              {error && <p className="board-v2-modal-error">{error}</p>}
              <div className="board-v2-modal-actions">
                <button type="button" onClick={closeModal} className="board-v2-modal-cancel">취소</button>
                <button type="submit" disabled={pending} className="board-v2-modal-submit">
                  {pending ? '저장 중…' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
