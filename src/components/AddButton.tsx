'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { addSchedule, addHabit, addExpense, addMemo, addCategory } from '@/app/actions/entries'
import { createClient } from '@/lib/supabase/client'
import TimePicker from '@/components/TimePicker'

type FormType = '일정' | '습관' | '지출' | '메모'
type Category = { id: string; name: string; color: string }

const COLORS = [
  '#ffb5c8', '#ffcfa3', '#fff4a3', '#b8f0b8',
  '#a3d4ff', '#d4a3ff', '#a3ece8', '#d4c4b0',
]

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Props = { type: FormType; label: string }

export default function AddButton({ type, label }: Props) {
  const [open, setOpen]           = useState(false)
  const [pending, setPending]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [schedColor, setSchedColor] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [selCategory, setSelCategory] = useState('')
  const [newCatName, setNewCatName]   = useState('')
  const [newCatColor, setNewCatColor] = useState(COLORS[5])
  const [addingCat, setAddingCat]     = useState(false)
  const [catPending, setCatPending]   = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!open || type !== '일정') return
    const sb = createClient()
    sb.from('schedule_category').select('id, name, color').order('created_at').then(({ data }) => {
      setCategories(data ?? [])
    })
  }, [open, type])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    if (type === '일정') {
      if (schedColor) fd.set('color', schedColor)
      if (selCategory) fd.set('category_id', selCategory)
    }
    let result
    if      (type === '일정') result = await addSchedule(fd)
    else if (type === '습관') result = await addHabit(fd)
    else if (type === '지출') result = await addExpense(fd)
    else                       result = await addMemo(fd)

    if (result.error) {
      setError(result.error)
    } else {
      setOpen(false)
      setError(null)
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
    setOpen(false)
    setError(null)
    setAddingCat(false)
    setNewCatName('')
  }

  const today = todayStr()

  return (
    <>
      <button type="button" className="board-v2-page-add-btn" onClick={() => setOpen(true)}>
        + {label}
      </button>

      {open && (
        <div className="board-v2-modal-overlay" onClick={closeModal}>
          <div className="board-v2-modal" onClick={e => e.stopPropagation()}>
            <div className="board-v2-modal-header">
              <span>{label}</span>
              <button type="button" onClick={closeModal} className="board-v2-modal-close">×</button>
            </div>
            <form onSubmit={handleSubmit} className="board-v2-modal-form">
              {type === '일정' && (
                <>
                  <input name="title" placeholder="일정 이름" className="board-v2-modal-input" required autoFocus />
                  <input name="date" type="date" defaultValue={today} className="board-v2-modal-input" required />
                  <TimePicker name="time" endName="time_end" />
                  <div className="board-v2-color-row">
                    <span className="board-v2-color-label">색상</span>
                    <div className="board-v2-color-picks">
                      <button type="button"
                        className={`board-v2-color-dot board-v2-color-none${schedColor === '' ? ' is-selected' : ''}`}
                        onClick={() => setSchedColor('')} title="색상 없음" />
                      {COLORS.map(c => (
                        <button key={c} type="button"
                          className={`board-v2-color-dot${schedColor === c ? ' is-selected' : ''}`}
                          style={{ background: c }}
                          onClick={() => setSchedColor(c)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="board-v2-cat-row">
                    <select className="board-v2-modal-input board-v2-cat-select" value={selCategory} onChange={e => setSelCategory(e.target.value)}>
                      <option value="">카테고리 없음</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button type="button" className="board-v2-cat-add-btn" onClick={() => setAddingCat(v => !v)}>
                      {addingCat ? '✕' : '+ 추가'}
                    </button>
                  </div>
                  {addingCat && (
                    <div className="board-v2-cat-new">
                      <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="카테고리 이름" className="board-v2-modal-input" />
                      <div className="board-v2-color-picks board-v2-color-picks-sm">
                        {COLORS.map(c => (
                          <button key={c} type="button"
                            className={`board-v2-color-dot board-v2-color-dot-sm${newCatColor === c ? ' is-selected' : ''}`}
                            style={{ background: c }} onClick={() => setNewCatColor(c)} />
                        ))}
                      </div>
                      <button type="button" className="board-v2-modal-submit" disabled={catPending || !newCatName.trim()} onClick={handleAddCategory}>
                        {catPending ? '…' : '카테고리 저장'}
                      </button>
                    </div>
                  )}
                </>
              )}
              {type === '습관' && (
                <input name="name" placeholder="새 습관 이름 (예: 매일 운동)" className="board-v2-modal-input" required autoFocus />
              )}
              {type === '지출' && (
                <>
                  <input name="title" placeholder="지출 항목" className="board-v2-modal-input" required autoFocus />
                  <div className="board-v2-modal-row">
                    <input name="amount" type="number" placeholder="금액 (원)" className="board-v2-modal-input" required min={1} />
                    <input name="date" type="date" defaultValue={today} className="board-v2-modal-input" required />
                  </div>
                </>
              )}
              {type === '메모' && (
                <>
                  <textarea name="text" placeholder="메모를 남겨보세요" className="board-v2-modal-input board-v2-modal-textarea" required autoFocus rows={4} />
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
