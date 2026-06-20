'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toggleHabitCheck } from '@/app/actions/entries'

type Habit = { id: string; name: string }
type CheckRecord = { habit_id: string; date: string; is_checked: boolean }
type WeekDay = { dayName: string; dateStr: string; isToday: boolean }

type Props = {
  habits: Habit[]
  checks: CheckRecord[]
  weekDays: WeekDay[]
}

export default function HabitWeekGrid({ habits, checks, weekDays }: Props) {
  const [states, setStates] = useState<Map<string, boolean>>(() => {
    const m = new Map<string, boolean>()
    checks.forEach(c => { if (c.is_checked) m.set(`${c.habit_id}:${c.date}`, true) })
    return m
  })
  const router = useRouter()

  async function handleToggle(habitId: string, dateStr: string) {
    const key = `${habitId}:${dateStr}`
    const current = states.get(key) ?? false
    setStates(prev => {
      const next = new Map(prev)
      if (!current) next.set(key, true)
      else next.delete(key)
      return next
    })
    await toggleHabitCheck(habitId, dateStr, !current)
    router.refresh()
  }

  if (habits.length === 0) {
    return <p className="board-v2-coming-soon">+ 로 첫 번째 습관을 추가해보세요</p>
  }

  return (
    <div className="board-v2-habit-grid">
      <div className="board-v2-habit-grid-head">
        <div className="board-v2-habit-grid-label">습관</div>
        {weekDays.map(d => (
          <div key={d.dateStr} className={`board-v2-habit-grid-day${d.isToday ? ' is-today' : ''}`}>
            {d.dayName}
          </div>
        ))}
      </div>
      {habits.map(h => (
        <div key={h.id} className="board-v2-habit-grid-row">
          <div className="board-v2-habit-grid-name" title={h.name}>{h.name}</div>
          {weekDays.map(d => {
            const checked = states.get(`${h.id}:${d.dateStr}`) ?? false
            return (
              <button
                key={d.dateStr}
                type="button"
                className={`board-v2-habit-grid-cell${checked ? ' is-checked' : ''}${d.isToday ? ' is-today' : ''}`}
                onClick={() => handleToggle(h.id, d.dateStr)}
                aria-label={`${h.name} ${d.dayName} ${checked ? '완료' : '미완료'}`}
              >
                {checked ? 'O' : '·'}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
