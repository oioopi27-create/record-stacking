'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toggleHabitCheck } from '@/app/actions/entries'

type Habit = { id: string; name: string; checked: boolean }

export default function HabitList({ habits, todayStr }: { habits: Habit[]; todayStr: string }) {
  const [states, setStates] = useState<Map<string, boolean>>(
    () => new Map(habits.map(h => [h.id, h.checked]))
  )
  const router = useRouter()

  async function handleToggle(habitId: string) {
    const current = states.get(habitId) ?? false
    setStates(prev => new Map(prev).set(habitId, !current))
    await toggleHabitCheck(habitId, todayStr, !current)
    router.refresh()
  }

  return (
    <ul className="board-v2-habit-list">
      {habits.map(h => (
        <li key={h.id} className={states.get(h.id) ? 'is-checked' : ''}>
          <button type="button" className="board-v2-habit-check" onClick={() => handleToggle(h.id)}>
            {states.get(h.id) ? '✓' : ''}
          </button>
          <span>{h.name}</span>
        </li>
      ))}
    </ul>
  )
}
