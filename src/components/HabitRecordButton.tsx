'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addHabit } from '@/app/actions/entries'
import { addFocusItem } from '@/app/actions/focus'

type Mode = 'select' | 'habit' | 'focus'

export default function HabitRecordButton({ todayKey }: { todayKey: string }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('select')
  const [habitName, setHabitName] = useState('')
  const [focusText, setFocusText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function close() {
    setOpen(false)
    setMode('select')
    setHabitName('')
    setFocusText('')
    setError(null)
  }

  function back() {
    setMode('select')
    setError(null)
  }

  async function handleAddHabit(e: React.FormEvent) {
    e.preventDefault()
    if (!habitName.trim()) return
    setError(null)
    const fd = new FormData()
    fd.set('name', habitName.trim())
    const result = await addHabit(fd)
    if (result.error) { setError(result.error); return }
    close()
    startTransition(() => router.refresh())
  }

  async function handleAddFocus(e: React.FormEvent) {
    e.preventDefault()
    if (!focusText.trim()) return
    setError(null)
    const fd = new FormData()
    fd.set('text', focusText.trim())
    fd.set('date', todayKey)
    const result = await addFocusItem(fd)
    if (result.error) { setError(result.error); return }
    close()
    startTransition(() => router.refresh())
  }

  return (
    <>
      <button type="button" className="board-v2-page-add-btn" onClick={() => setOpen(true)}>
        + 기록
      </button>

      {open && (
        <div className="board-v2-modal-overlay" onClick={close}>
          <div className="board-v2-modal" onClick={e => e.stopPropagation()}>
            <div className="board-v2-modal-header">
              {mode !== 'select'
                ? <button type="button" className="board-v2-modal-back-btn" onClick={back}>&lt;</button>
                : <span />
              }
              <span>
                {mode === 'select' ? '기록하기' : mode === 'habit' ? '습관 추가' : '오늘의 집중'}
              </span>
              <button type="button" className="board-v2-modal-close" onClick={close}>×</button>
            </div>

            {mode === 'select' && (
              <div className="board-v2-record-select">
                <button type="button" className="board-v2-record-choice" onClick={() => setMode('habit')}>
                  <span className="board-v2-record-choice-icon">★</span>
                  <span>습관 추가</span>
                </button>
                <button type="button" className="board-v2-record-choice" onClick={() => setMode('focus')}>
                  <span className="board-v2-record-choice-icon">◎</span>
                  <span>오늘의 집중</span>
                </button>
              </div>
            )}

            {mode === 'habit' && (
              <form onSubmit={handleAddHabit} className="board-v2-modal-form">
                <input
                  value={habitName}
                  onChange={e => setHabitName(e.target.value)}
                  placeholder="새 습관 이름 (예: 매일 운동)"
                  className="board-v2-modal-input"
                  required
                  autoFocus
                />
                {error && <p className="board-v2-modal-error">{error}</p>}
                <div className="board-v2-modal-actions">
                  <button type="button" className="board-v2-modal-cancel" onClick={back}>취소</button>
                  <button type="submit" className="board-v2-modal-submit" disabled={isPending}>저장</button>
                </div>
              </form>
            )}

            {mode === 'focus' && (
              <form onSubmit={handleAddFocus} className="board-v2-modal-form">
                <input
                  value={focusText}
                  onChange={e => setFocusText(e.target.value)}
                  placeholder="오늘 집중할 일을 적어 주세요"
                  className="board-v2-modal-input"
                  required
                  autoFocus
                />
                {error && <p className="board-v2-modal-error">{error}</p>}
                <div className="board-v2-modal-actions">
                  <button type="button" className="board-v2-modal-cancel" onClick={back}>취소</button>
                  <button type="submit" className="board-v2-modal-submit" disabled={isPending}>저장</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
