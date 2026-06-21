'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  addHabit,
  deleteHabit,
  renameHabit,
  saveHabitReview,
  toggleHabitCheck,
} from '@/app/actions/entries'

type Habit = { id: string; name: string }
type CheckRecord = { habit_id: string; date: string; is_checked?: boolean }
type ReviewRecord = { habit_id: string; review: string | null }

type Props = {
  habits: Habit[]
  checks: CheckRecord[]
  reviews: ReviewRecord[]
  year: number
  month: number
}

type CalendarCell =
  | { key: string; day: null; date: null }
  | { key: string; day: number; date: string }

const weekLabels = ['월', '화', '수', '목', '금', '토', '일']
const pad = (n: number) => String(n).padStart(2, '0')

export default function HabitMonthView({ habits, checks, reviews, year, month }: Props) {
  const router = useRouter()
  const addInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [checkStates, setCheckStates] = useState<Map<string, boolean>>(() => {
    const next = new Map<string, boolean>()
    checks.forEach(check => {
      if (check.is_checked ?? true) next.set(`${check.habit_id}:${check.date}`, true)
    })
    return next
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set())
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>({})
  const [reviewValues, setReviewValues] = useState<Record<string, string>>(() => {
    return Object.fromEntries(reviews.map(review => [review.habit_id, review.review ?? '']))
  })
  const [savingReviewId, setSavingReviewId] = useState<string | null>(null)

  const monthStart = `${year}-${pad(month)}-01`
  const calendarCells = useMemo<CalendarCell[]>(() => {
    const daysInMonth = new Date(year, month, 0).getDate()
    const firstDay = new Date(year, month - 1, 1).getDay()
    const leadingCells = firstDay === 0 ? 6 : firstDay - 1
    return [
      ...Array.from({ length: leadingCells }, (_, index) => ({
        key: `empty-${index}`,
        day: null,
        date: null,
      }) satisfies CalendarCell),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1
        return {
          key: `${day}`,
          day,
          date: `${year}-${pad(month)}-${pad(day)}`,
        } satisfies CalendarCell
      }),
    ]
  }, [month, year])

  const visibleHabits = useMemo(() => {
    return habits
      .filter(habit => !deletedIds.has(habit.id))
      .map(habit => ({ ...habit, name: nameOverrides[habit.id] ?? habit.name }))
  }, [deletedIds, habits, nameOverrides])

  async function handleAddHabit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '').trim()
    if (!name) return
    const result = await addHabit(formData)
    if (!result.error) {
      event.currentTarget.reset()
      addInputRef.current?.focus()
      startTransition(() => router.refresh())
    }
  }

  async function handleToggle(habitId: string, date: string) {
    const key = `${habitId}:${date}`
    const current = checkStates.get(key) ?? false
    setCheckStates(prev => {
      const next = new Map(prev)
      if (current) next.delete(key)
      else next.set(key, true)
      return next
    })
    const result = await toggleHabitCheck(habitId, date, !current)
    if (result.error) {
      setCheckStates(prev => {
        const next = new Map(prev)
        if (current) next.set(key, true)
        else next.delete(key)
        return next
      })
      return
    }
    startTransition(() => router.refresh())
  }

  function startEdit(habit: Habit) {
    setEditingId(habit.id)
    setEditingName(habit.name)
  }

  async function handleRename(habitId: string) {
    const nextName = editingName.trim()
    if (!nextName) return
    setNameOverrides(prev => ({ ...prev, [habitId]: nextName }))
    setEditingId(null)
    const result = await renameHabit(habitId, nextName)
    if (!result.error) startTransition(() => router.refresh())
  }

  async function handleDelete(habitId: string) {
    if (!confirm('이 습관을 삭제할까요?')) return
    setDeletedIds(prev => new Set(prev).add(habitId))
    setEditingId(null)
    const result = await deleteHabit(habitId)
    if (!result.error) startTransition(() => router.refresh())
  }

  async function handleSaveReview(habitId: string) {
    setSavingReviewId(habitId)
    const result = await saveHabitReview(habitId, monthStart, reviewValues[habitId] ?? '')
    setSavingReviewId(null)
    if (!result.error) startTransition(() => router.refresh())
  }

  return (
    <div className="board-v2-habit-month-tracker" aria-busy={isPending}>
      <div className="board-v2-habit-month-top">
        <div>
          <p className="board-v2-label">habit tracker</p>
          <h3>{month}월 습관 기록</h3>
        </div>
        <form className="board-v2-habit-month-add" onSubmit={handleAddHabit}>
          <input ref={addInputRef} name="name" placeholder="습관 추가" maxLength={30} />
          <button type="submit">추가</button>
        </form>
      </div>

      {visibleHabits.length === 0 ? (
        <p className="board-v2-coming-soon">이번 달에 기록할 습관을 추가해 보세요.</p>
      ) : (
        <div className="board-v2-habit-month-list">
          {visibleHabits.map(habit => (
            <section key={habit.id} className="board-v2-habit-month-card">
              <div className="board-v2-habit-month-title-row">
                <span className="board-v2-habit-month-title-label">습관</span>
                {editingId === habit.id ? (
                  <div className="board-v2-habit-month-edit">
                    <input
                      value={editingName}
                      onChange={event => setEditingName(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter') handleRename(habit.id)
                        if (event.key === 'Escape') setEditingId(null)
                      }}
                      maxLength={30}
                      autoFocus
                    />
                    <button type="button" onClick={() => handleRename(habit.id)}>저장</button>
                    <button type="button" onClick={() => handleDelete(habit.id)}>삭제</button>
                    <button type="button" onClick={() => setEditingId(null)}>취소</button>
                  </div>
                ) : (
                  <>
                    <strong>{habit.name}</strong>
                    <button
                      type="button"
                      className="board-v2-habit-month-more"
                      onClick={() => startEdit(habit)}
                      aria-label={`${habit.name} 수정`}
                    >
                      ...
                    </button>
                  </>
                )}
              </div>

              <div className="board-v2-habit-month-calendar" role="grid" aria-label={`${habit.name} ${month}월 체크`}>
                <div className="board-v2-habit-month-weekdays" aria-hidden="true">
                  {weekLabels.map((label, index) => (
                    <span
                      key={label}
                      className={`${index === 5 ? 'is-sat' : ''}${index === 6 ? ' is-sun' : ''}`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
                <div className="board-v2-habit-month-days">
                  {calendarCells.map(cell => {
                    if (!cell.day || !cell.date) {
                      return <span key={cell.key} className="board-v2-habit-month-day is-empty" aria-hidden="true" />
                    }
                    const checked = checkStates.get(`${habit.id}:${cell.date}`) ?? false
                    return (
                      <button
                        key={cell.date}
                        type="button"
                        className={`board-v2-habit-month-day${checked ? ' is-checked' : ''}`}
                        onClick={() => handleToggle(habit.id, cell.date)}
                        aria-label={`${month}월 ${cell.day}일 ${checked ? '완료' : '미완료'}`}
                      >
                        <span>{cell.day}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="board-v2-habit-month-review">
                <label htmlFor={`review-${habit.id}`}>리뷰</label>
                <textarea
                  id={`review-${habit.id}`}
                  value={reviewValues[habit.id] ?? ''}
                  onChange={event => {
                    const value = event.target.value
                    setReviewValues(prev => ({ ...prev, [habit.id]: value }))
                  }}
                  placeholder="이번 달 습관을 돌아보는 짧은 기록"
                  rows={2}
                />
                <button
                  type="button"
                  onClick={() => handleSaveReview(habit.id)}
                  disabled={savingReviewId === habit.id}
                >
                  {savingReviewId === habit.id ? '저장 중' : '저장'}
                </button>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
