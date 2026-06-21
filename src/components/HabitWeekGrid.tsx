'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deleteHabit, renameHabit, toggleHabitCheck } from '@/app/actions/entries'

type Habit = { id: string; name: string }
type CheckRecord = { habit_id: string; date: string; is_checked: boolean }
type WeekDay = { dayName: string; dateStr: string; isToday: boolean }

type Props = {
  habits: Habit[]
  checks: CheckRecord[]
  weekDays: WeekDay[]
}

function checkKey(habitId: string, date: string) {
  return `${habitId}:${date}`
}

export default function HabitWeekGrid({ habits: initialHabits, checks, weekDays }: Props) {
  const [optimisticChecks, setOptimisticChecks] = useState<Map<string, boolean>>(() => new Map())
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set())
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPending, setEditPending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const serverChecks = useMemo(() => {
    const next = new Map<string, boolean>()
    checks.forEach(check => {
      if (check.is_checked) next.set(checkKey(check.habit_id, check.date), true)
    })
    return next
  }, [checks])

  const habits = useMemo(() => {
    return initialHabits
      .filter(habit => !deletedIds.has(habit.id))
      .map(habit => ({ ...habit, name: nameOverrides[habit.id] ?? habit.name }))
  }, [deletedIds, initialHabits, nameOverrides])

  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus()
  }, [editingId])

  function isChecked(habitId: string, date: string) {
    const key = checkKey(habitId, date)
    return optimisticChecks.has(key) ? optimisticChecks.get(key)! : (serverChecks.get(key) ?? false)
  }

  async function handleToggle(habitId: string, date: string) {
    const key = checkKey(habitId, date)
    const current = isChecked(habitId, date)
    setOptimisticChecks(prev => {
      const next = new Map(prev)
      next.set(key, !current)
      return next
    })
    const result = await toggleHabitCheck(habitId, date, !current)
    if (result.error) {
      setOptimisticChecks(prev => {
        const next = new Map(prev)
        next.delete(key)
        return next
      })
    } else {
      router.refresh()
    }
  }

  function openPopup(habit: Habit) {
    setSelectedId(habit.id)
  }

  function closePopup() {
    setSelectedId(null)
  }

  function startEdit(habit: Habit) {
    setEditingId(habit.id)
    setEditName(habit.name)
    setSelectedId(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
  }

  async function handleRename(habitId: string) {
    const nextName = editName.trim()
    if (!nextName) return
    setEditPending(true)
    setNameOverrides(prev => ({ ...prev, [habitId]: nextName }))
    setEditingId(null)
    const result = await renameHabit(habitId, nextName)
    if (!result.error) router.refresh()
    setEditPending(false)
  }

  async function handleDelete(habitId: string) {
    setDeletedIds(prev => new Set(prev).add(habitId))
    setSelectedId(null)
    const result = await deleteHabit(habitId)
    if (!result.error) router.refresh()
  }

  const selectedHabit = selectedId ? habits.find(h => h.id === selectedId) ?? null : null

  if (habits.length === 0) {
    return (
      <>
        <div className="board-v2-habit-section-title"><span className="board-v2-accent-star">★</span> 습관</div>
        <p className="board-v2-coming-soon">+ 첫 번째 습관을 추가해 보세요</p>
      </>
    )
  }

  return (
    <>
      <div className="board-v2-habit-section-title"><span className="board-v2-accent-star">★</span> 습관</div>
      <div className="board-v2-habit-grid">
        <div className="board-v2-habit-grid-head">
          <div className="board-v2-habit-grid-label" />
          {weekDays.map(day => (
            <div key={day.dateStr} className={`board-v2-habit-grid-day${day.isToday ? ' is-today' : ''}`}>
              {day.dayName}
            </div>
          ))}
        </div>
        {habits.map(habit => (
          <div key={habit.id} className="board-v2-habit-grid-row">
            {editingId === habit.id ? (
              <div className="board-v2-habit-grid-name is-editing">
                <input
                  ref={inputRef}
                  className="board-v2-habit-name-input"
                  value={editName}
                  onChange={event => setEditName(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') handleRename(habit.id)
                    if (event.key === 'Escape') cancelEdit()
                  }}
                  disabled={editPending}
                  maxLength={30}
                />
                <button type="button" className="board-v2-habit-inline-btn save" onClick={() => handleRename(habit.id)} disabled={editPending}>저장</button>
                <button type="button" className="board-v2-habit-inline-btn cancel" onClick={cancelEdit} disabled={editPending}>취소</button>
              </div>
            ) : (
              <div className="board-v2-habit-grid-name">
                <button
                  type="button"
                  className="board-v2-habit-name-text"
                  onClick={() => openPopup(habit)}
                >
                  {habit.name}
                </button>
              </div>
            )}
            {weekDays.map(day => {
              const checked = isChecked(habit.id, day.dateStr)
              return (
                <button
                  key={day.dateStr}
                  type="button"
                  className={`board-v2-habit-grid-cell${checked ? ' is-checked' : ''}${day.isToday ? ' is-today' : ''}`}
                  onClick={() => handleToggle(habit.id, day.dateStr)}
                  aria-label={`${habit.name} ${day.dayName} ${checked ? '완료' : '미완료'}`}
                >
                  <span className="board-v2-habit-dot" />
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {selectedHabit && (
        <div className="board-v2-habit-popup-overlay" onClick={closePopup}>
          <div className="board-v2-habit-popup" onClick={e => e.stopPropagation()}>
            <div className="board-v2-habit-popup-name">{selectedHabit.name}</div>
            <div className="board-v2-habit-popup-actions">
              <button type="button" className="board-v2-habit-popup-btn is-edit" onClick={() => startEdit(selectedHabit)}>수정</button>
              <button type="button" className="board-v2-habit-popup-btn is-del" onClick={() => handleDelete(selectedHabit.id)}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
