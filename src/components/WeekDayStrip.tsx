'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addSchedule } from '@/app/actions/entries'

type WeekDay = {
  dayName: string
  date: number
  dateStr: string
  isToday: boolean
  tone: 'weekday' | 'saturday' | 'holiday'
}

const COLORS = [
  '#ffb5c8', '#ffcfa3', '#fff4a3', '#b8f0b8',
  '#a3d4ff', '#d4a3ff', '#a3ece8', '#d4c4b0',
]

export default function WeekDayStrip({ weekDays }: { weekDays: WeekDay[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [color, setColor]       = useState(COLORS[4])
  const [pending, setPending]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const router = useRouter()

  const selectedDay = weekDays.find(d => d.dateStr === selected)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selected) return
    setPending(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    fd.set('date', selected)
    fd.set('color', color)

    const result = await addSchedule(fd)
    if (result.error) {
      setError(result.error)
    } else {
      setSelected(null)
      setError(null)
      ;(e.target as HTMLFormElement).reset()
      router.refresh()
    }
    setPending(false)
  }

  return (
    <div className="board-v2-week-strip-wrap">
      <div className="board-v2-week-strip">
        {weekDays.map(item => (
          <button
            key={item.dateStr}
            type="button"
            className={[
              item.isToday   ? 'is-active'   : '',
              `is-${item.tone}`,
              selected === item.dateStr ? 'is-selected' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => setSelected(s => s === item.dateStr ? null : item.dateStr)}
          >
            <span>{item.dayName}</span>
            <strong>{item.date}</strong>
          </button>
        ))}
      </div>

      {selected && selectedDay && (
        <div className="board-v2-week-day-popup">
          <div className="board-v2-week-day-popup-header">
            <span>{selectedDay.dayName}요일 {selectedDay.date}일에 일정 추가</span>
            <button type="button" onClick={() => { setSelected(null); setError(null) }}>✕</button>
          </div>
          <form onSubmit={handleSubmit} className="board-v2-cal-form">
            <input name="title" placeholder="일정 이름" className="board-v2-cal-input" required autoFocus />
            <input name="time" type="time" className="board-v2-cal-input" />
            <div className="board-v2-color-row board-v2-color-row-sm">
              {COLORS.map(c => (
                <button
                  key={c} type="button"
                  className={`board-v2-color-dot board-v2-color-dot-sm${color === c ? ' is-selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
            {error && <p className="board-v2-cal-error">{error}</p>}
            <div className="board-v2-cal-actions">
              <button type="button" onClick={() => { setSelected(null); setError(null) }} className="board-v2-cal-cancel">취소</button>
              <button type="submit" disabled={pending} className="board-v2-cal-submit">
                {pending ? '…' : '저장'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
