'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addSchedule, addHabit, addExpense, addMemo } from '@/app/actions/entries'
import { useCalendarStartDay } from '@/context/CalendarStartDayContext'

type Tab = 'schedule' | 'habit' | 'expense' | 'memo'

const TABS: [Tab, string][] = [
  ['schedule', '📅 일정'],
  ['habit', '✅ 습관'],
  ['expense', '💸 지출'],
  ['memo', '📝 메모'],
]

const COLORS = [
  '#ffb5c8', '#ffcfa3', '#fff4a3', '#b8f0b8',
  '#a3d4ff', '#d4a3ff', '#a3ece8', '#d4c4b0',
]

const DOW_MON = ['월', '화', '수', '목', '금', '토', '일']
const DOW_SUN = ['일', '월', '화', '수', '목', '금', '토']

type Event = { day: number; color: string | null }
type Props = { year: number; month: number; today: number; events?: Event[] }

export default function CalendarGrid({ year, month, today, events = [] }: Props) {
  const [selected, setSelected] = useState<number | null>(null)
  const [tab, setTab]           = useState<Tab>('schedule')
  const [pending, setPending]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [color, setColor]       = useState(COLORS[4])
  const router = useRouter()

  const { startDay } = useCalendarStartDay()

  const DOW = startDay === 1 ? DOW_MON : DOW_SUN
  const daysInMonth  = new Date(year, month, 0).getDate()
  const days         = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const firstDow     = new Date(year, month - 1, 1).getDay()
  const startOffset  = startDay === 1 ? (firstDow + 6) % 7 : firstDow

  // Map day → colors for that day
  const eventMap = new Map<number, string[]>()
  events.forEach(e => {
    if (!eventMap.has(e.day)) eventMap.set(e.day, [])
    if (e.color) eventMap.get(e.day)!.push(e.color)
    else eventMap.get(e.day)!.push('#a3d4ff')
  })

  const dateStr = selected
    ? `${year}-${String(month).padStart(2, '0')}-${String(selected).padStart(2, '0')}`
    : ''

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    if (dateStr) fd.set('date', dateStr)
    if (tab === 'schedule') fd.set('color', color)

    const result =
      tab === 'schedule'  ? await addSchedule(fd)
      : tab === 'habit'   ? await addHabit(fd)
      : tab === 'expense' ? await addExpense(fd)
      : await addMemo(fd)

    if (result.error) {
      setError(result.error)
    } else {
      setSelected(null)
      setError(null)
      router.refresh()
    }
    setPending(false)
  }

  function close() { setSelected(null); setError(null) }

  return (
    <section className="board-v2-mini-card board-v2-top-card">
      <div className="board-v2-mini-title">
        <span>{year}.{String(month).padStart(2, '0')}</span>
        <button type="button" onClick={() => setSelected(today)}>오늘</button>
      </div>
      <div className="board-v2-calendar-grid">
        {/* 요일 헤더 */}
        {DOW.map((d, i) => {
          const isSat = startDay === 1 ? i === 5 : i === 6
          const isSun = startDay === 1 ? i === 6 : i === 0
          return (
            <div key={d} className={`board-v2-cal-dow-cell${isSat ? ' is-sat' : isSun ? ' is-sun' : ''}`}>
              {d}
            </div>
          )
        })}
        {/* 첫 날 이전 빈 칸 */}
        {Array.from({ length: startOffset }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {/* 날짜 버튼 */}
        {days.map(day => {
          const dots = eventMap.get(day) ?? []
          const isToday    = day === today
          const isSelected = day === selected
          const dow = (startOffset + day - 1) % 7
          const isSat = startDay === 1 ? dow === 5 : dow === 6
          const isSun = startDay === 1 ? dow === 6 : dow === 0
          return (
            <button
              key={day}
              type="button"
              className={[
                isToday    ? 'is-today'    : '',
                isSelected ? 'is-selected' : '',
                isSat ? 'is-sat' : isSun ? 'is-sun' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => setSelected(s => s === day ? null : day)}
            >
              {day}
              {dots.length > 0 && (
                <span className="board-v2-cal-dots">
                  {dots.slice(0, 3).map((c, i) => (
                    <span key={i} className="board-v2-cal-dot" style={{ background: c }} />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {selected !== null && (
        <div className="board-v2-cal-popup">
          <div className="board-v2-cal-popup-tabs">
            {TABS.map(([t, label]) => (
              <button key={t} type="button" className={tab === t ? 'is-active' : ''} onClick={() => setTab(t)}>
                {label}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="board-v2-cal-form">
            {tab === 'schedule' && (
              <>
                <input key="sched" name="title" placeholder="일정 이름" className="board-v2-cal-input" required autoFocus />
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
              </>
            )}
            {tab === 'habit' && (
              <input key="habit" name="name" placeholder="습관 이름" className="board-v2-cal-input" required autoFocus />
            )}
            {tab === 'expense' && (
              <div key="expense" className="board-v2-cal-row">
                <input name="title" placeholder="항목명" className="board-v2-cal-input" required autoFocus />
                <input name="amount" type="number" placeholder="금액" className="board-v2-cal-input board-v2-cal-amount" required min={1} />
              </div>
            )}
            {tab === 'memo' && (
              <textarea key="memo" name="text" placeholder="오늘의 메모" className="board-v2-cal-input board-v2-cal-textarea" required autoFocus />
            )}
            {error && <p className="board-v2-cal-error">{error}</p>}
            <div className="board-v2-cal-actions">
              <button type="button" onClick={close} className="board-v2-cal-cancel">취소</button>
              <button type="submit" disabled={pending} className="board-v2-cal-submit">
                {pending ? '…' : '저장'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
