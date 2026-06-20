'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toggleScheduleDone } from '@/app/actions/entries'

type Schedule = { id: string; title: string; date: string; time: string | null; is_done: boolean }

export default function ScheduleList({ schedules }: { schedules: Schedule[] }) {
  const [done, setDone] = useState<Map<string, boolean>>(() => {
    const m = new Map<string, boolean>()
    schedules.forEach(s => m.set(s.id, s.is_done))
    return m
  })
  const router = useRouter()

  async function handleToggle(id: string) {
    const current = done.get(id) ?? false
    setDone(prev => new Map(prev).set(id, !current))
    await toggleScheduleDone(id, !current)
    router.refresh()
  }

  return (
    <div className="board-v2-list compact">
      {schedules.map(s => {
        const isDone = done.get(s.id) ?? false
        return (
          <article key={s.id} className="is-weekday">
            <div>
              <span>{s.date.slice(5).replace('-', '/')}</span>
              <strong>{s.time ? s.time.slice(0, 5) : '--'}</strong>
            </div>
            <p className={isDone ? 'is-done' : ''}>{s.title}</p>
            <button
              type="button"
              className={`board-v2-done-btn${isDone ? ' is-done' : ''}`}
              onClick={() => handleToggle(s.id)}
              aria-label={isDone ? '완료 취소' : '완료'}
            >
              {isDone ? '✓' : '○'}
            </button>
          </article>
        )
      })}
    </div>
  )
}
