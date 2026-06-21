'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { addSchedule } from '@/app/actions/schedules'
import TimePicker from '@/components/TimePicker'

type WeekDay = {
  dayName: string
  date: number
  dateStr: string
  isToday: boolean
  tone: 'weekday' | 'saturday' | 'holiday'
}

const COLORS = [
  '#ffb5a3', '#ffcba4', '#fff0a3', '#c8e6c0', '#a8e6d9',
  '#a8d4f5', '#b8b5f0', '#d4b5f0', '#e8dcc8', '#d4d4d4',
]

export default function WeekDayStrip({ weekDays }: { weekDays: WeekDay[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [color, setColor]       = useState('')
  const [pending, setPending]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const router = useRouter()

  const selectedDay = weekDays.find(d => d.dateStr === selected)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selected) return
    setPending(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    fd.set('date', selected)
    if (color) fd.set('color', color)

    const result = await addSchedule(fd)
    if (result.error) {
      setError(result.error)
    } else {
      setSelected(null)
      setColor('')
      setError(null)
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
            <TimePicker name="time" endName="time_end" />
            <div className="board-v2-color-row board-v2-color-row-sm">
              <button type="button"
                className={`board-v2-color-dot board-v2-color-dot-sm board-v2-color-none${color === '' ? ' is-selected' : ''}`}
                onClick={() => setColor('')} title="색상 없음" />
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
