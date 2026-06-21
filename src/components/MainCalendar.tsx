'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { getHolidaysForMonth } from '@/lib/korean-holidays'

const DOW_MON = ['월', '화', '수', '목', '금', '토', '일']
const DOW_SUN = ['일', '월', '화', '수', '목', '금', '토']

type Event = { day: number; color: string | null }
export type CalendarDayRecord = {
  date: string
  schedules: string[]
  habits: string[]
  expenses: { title: string; amount: number; entryType: 'income' | 'expense' | null }[]
  memos: string[]
}

type Props = {
  year: number
  month: number
  todayDate: string
  startDay: 0 | 1
  events?: Event[]
  records?: CalendarDayRecord[]
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatMoney(amount: number, entryType: 'income' | 'expense' | null) {
  const sign = entryType === 'income' ? '+' : '-'
  return `${sign}${Math.abs(amount).toLocaleString()}원`
}

export default function MainCalendar({ year, month, todayDate, startDay, events = [], records = [] }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const holidays = getHolidaysForMonth(year, month)
  const holidayMap = new Map(holidays.map(holiday => [Number(holiday.date.slice(-2)), holiday.name]))
  const dows = startDay === 1 ? DOW_MON : DOW_SUN
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDow = new Date(year, month - 1, 1).getDay()
  const startOffset = startDay === 1 ? (firstDow + 6) % 7 : firstDow
  const currentMonthValue = `${year}-${pad(month)}`
  const todayMonthValue = todayDate.slice(0, 7)
  const eventMap = new Map<number, string[]>()
  const recordMap = new Map(records.map(record => [record.date, record]))
  const selectedRecord = selectedDate ? recordMap.get(selectedDate) : null

  events.forEach(event => {
    if (!eventMap.has(event.day)) eventMap.set(event.day, [])
    eventMap.get(event.day)!.push(event.color ?? '#b8d4e8')
  })

  function hrefFor(path: string, extra?: Record<string, string | null>) {
    const params = new URLSearchParams()
    const theme = searchParams.get('theme')
    const font = searchParams.get('font')
    if (theme) params.set('theme', theme)
    if (font) params.set('font', font)
    Object.entries(extra ?? {}).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    const query = params.toString()
    return query ? `${path}?${query}` : path
  }

  function shiftedMonth(diff: number) {
    const date = new Date(year, month - 1 + diff, 1)
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
  }

  function renderList(items: string[], empty: string) {
    if (items.length === 0) return <p>{empty}</p>
    return (
      <ul>
        {items.slice(0, 4).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
      </ul>
    )
  }

  return (
    <section className="board-v2-main-calendar">
      <div className="board-v2-main-calendar-head">
        <Link className="board-v2-cal-pill" href={hrefFor('/schedule', { date: todayDate })}>
          이번 주
        </Link>
        <div className="board-v2-month-jump">
          <Link href={hrefFor('/week', { month: shiftedMonth(-1) })} aria-label="이전 달">‹</Link>
          <form action="/week">
            {searchParams.get('theme') && <input type="hidden" name="theme" value={searchParams.get('theme') ?? ''} />}
            {searchParams.get('font') && <input type="hidden" name="font" value={searchParams.get('font') ?? ''} />}
            <input aria-label="월 이동" type="month" name="month" defaultValue={currentMonthValue} />
            <button type="submit">이동</button>
          </form>
          <Link href={hrefFor('/week', { month: shiftedMonth(1) })} aria-label="다음 달">›</Link>
        </div>
        <Link className="board-v2-cal-pill" href={hrefFor('/week', todayMonthValue === currentMonthValue ? undefined : { month: todayMonthValue })}>
          오늘
        </Link>
      </div>

      <div className="board-v2-main-calendar-grid">
        {dows.map((dow, index) => {
          const isSat = startDay === 1 ? index === 5 : index === 6
          const isSun = startDay === 1 ? index === 6 : index === 0
          return (
            <div key={dow} className={`board-v2-main-dow${isSat ? ' is-sat' : isSun ? ' is-sun' : ''}`}>
              {dow}
            </div>
          )
        })}
        {Array.from({ length: startOffset }, (_, index) => <div key={`pad-${index}`} />)}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1
          const date = `${year}-${pad(month)}-${pad(day)}`
          const dow = (startOffset + day - 1) % 7
          const isSat = startDay === 1 ? dow === 5 : dow === 6
          const isSun = startDay === 1 ? dow === 6 : dow === 0
          const holidayName = holidayMap.get(day)
          const dots = eventMap.get(day) ?? []

          return (
            <button
              key={day}
              type="button"
              className={[
                date === todayDate ? 'is-today' : '',
                date === selectedDate ? 'is-selected' : '',
                isSat ? 'is-sat' : isSun || holidayName ? 'is-holiday' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => setSelectedDate(current => current === date ? null : date)}
            >
              <span>{day}</span>
              {holidayName && <em>{holidayName}</em>}
              {dots.length > 0 && (
                <span className="board-v2-main-cal-dots">
                  {dots.slice(0, 3).map((color, dotIndex) => (
                    <i key={dotIndex} style={{ background: color }} />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {selectedDate && (
        <div className="board-v2-day-record-window">
          <div className="board-v2-day-record-head">
            <strong>{Number(selectedDate.slice(5, 7))}.{Number(selectedDate.slice(8, 10))}</strong>
            <div>
              <Link href={hrefFor('/schedule', { date: selectedDate })}>일정 추가</Link>
              <button type="button" onClick={() => setSelectedDate(null)}>닫기</button>
            </div>
          </div>
          <div className="board-v2-day-record-grid">
            <section>
              <span>일정</span>
              {renderList(selectedRecord?.schedules ?? [], '일정 없음')}
            </section>
            <section>
              <span>습관</span>
              {renderList(selectedRecord?.habits ?? [], '체크 없음')}
            </section>
            <section>
              <span>지갑</span>
              {(selectedRecord?.expenses ?? []).length === 0 ? (
                <p>기록 없음</p>
              ) : (
                <ul>
                  {selectedRecord!.expenses.slice(0, 4).map((item, index) => (
                    <li key={`${item.title}-${index}`}>{item.title} {formatMoney(item.amount, item.entryType)}</li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <span>메모</span>
              {renderList(selectedRecord?.memos ?? [], '메모 없음')}
            </section>
          </div>
        </div>
      )}
    </section>
  )
}
