'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useCalendarStartDay } from '@/context/CalendarStartDayContext'

const ACTIONS = [
  { href: '/schedule', label: '일정 추가' },
  { href: '/habit', label: '습관 추가' },
  { href: '/expense', label: '지갑 기록' },
  { href: '/memo', label: '메모 추가' },
]

const DOW_MON = ['월', '화', '수', '목', '금', '토', '일']
const DOW_SUN = ['일', '월', '화', '수', '목', '금', '토']

type Event = { day: number; color: string | null }
type Props = { year: number; month: number; today: number; events?: Event[] }

export default function CalendarGrid({ year, month, today, events = [] }: Props) {
  const [selected, setSelected] = useState<number | null>(null)
  const searchParams = useSearchParams()
  const { startDay } = useCalendarStartDay()

  const DOW = startDay === 1 ? DOW_MON : DOW_SUN
  const daysInMonth = new Date(year, month, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const firstDow = new Date(year, month - 1, 1).getDay()
  const startOffset = startDay === 1 ? (firstDow + 6) % 7 : firstDow

  const eventMap = new Map<number, string[]>()
  events.forEach(e => {
    if (!eventMap.has(e.day)) eventMap.set(e.day, [])
    eventMap.get(e.day)!.push(e.color ?? '#a8c4c8')
  })

  const selectedDate = selected
    ? `${year}-${String(month).padStart(2, '0')}-${String(selected).padStart(2, '0')}`
    : ''

  function actionHref(path: string) {
    const params = new URLSearchParams()
    const theme = searchParams.get('theme')
    const font = searchParams.get('font')
    if (theme) params.set('theme', theme)
    if (font) params.set('font', font)
    if (selectedDate) params.set('date', selectedDate)
    const query = params.toString()
    return query ? `${path}?${query}` : path
  }

  return (
    <section className="board-v2-mini-card board-v2-top-card">
      <div className="board-v2-mini-title">
        <span>{year}.{String(month).padStart(2, '0')}</span>
        <button type="button" onClick={() => setSelected(today)}>오늘</button>
      </div>

      <div className="board-v2-calendar-grid">
        {DOW.map((d, i) => {
          const isSat = startDay === 1 ? i === 5 : i === 6
          const isSun = startDay === 1 ? i === 6 : i === 0
          return (
            <div key={d} className={`board-v2-cal-dow-cell${isSat ? ' is-sat' : isSun ? ' is-sun' : ''}`}>
              {d}
            </div>
          )
        })}

        {Array.from({ length: startOffset }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {days.map(day => {
          const dots = eventMap.get(day) ?? []
          const isToday = day === today
          const isSelected = day === selected
          const dow = (startOffset + day - 1) % 7
          const isSat = startDay === 1 ? dow === 5 : dow === 6
          const isSun = startDay === 1 ? dow === 6 : dow === 0

          return (
            <button
              key={day}
              type="button"
              className={[
                isToday ? 'is-today' : '',
                isSelected ? 'is-selected' : '',
                isSat ? 'is-sat' : isSun ? 'is-sun' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => setSelected(current => current === day ? null : day)}
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
          <div className="board-v2-cal-popup-title">
            <strong>{month}.{selected}</strong>
            <span>추가할 항목을 골라 주세요</span>
          </div>
          <div className="board-v2-cal-action-list">
            {ACTIONS.map(action => (
              <Link key={action.href} href={actionHref(action.href)} className="board-v2-cal-action">
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
