'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { addSchedule, updateSchedule, deleteSchedule } from '@/app/actions/entries'
import TimePicker from '@/components/TimePicker'

const COLORS = [
  '#ffb5c8', '#ffcfa3', '#fff4a3', '#b8f0b8',
  '#a3d4ff', '#d4a3ff', '#a3ece8', '#d4c4b0',
]

type Evt = {
  id: string
  title: string
  date: string
  time: string | null
  color: string | null
  is_done: boolean
  user_id: string
}

type Props = {
  initialEvents: Evt[]
  initialYear: number
  initialMonth: number
  todayStr: string
  currentUserId: string
  startDay?: 0 | 1
}

const DOW_MON = ['월', '화', '수', '목', '금', '토', '일']
const DOW_SUN = ['일', '월', '화', '수', '목', '금', '토']

export default function MonthCalendar({
  initialEvents, initialYear, initialMonth, todayStr, currentUserId, startDay = 1,
}: Props) {
  const [year, setYear]         = useState(initialYear)
  const [month, setMonth]       = useState(initialMonth)
  const [events, setEvents]     = useState<Evt[]>(initialEvents)
  const [loading, setLoading]   = useState(false)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [addColor, setAddColor]   = useState('')
  const [pending, setPending]     = useState(false)
  const [addError, setAddError]   = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editColor, setEditColor] = useState('')
  const [editPending, setEditPending] = useState(false)
  const [editError, setEditError]     = useState<string | null>(null)
  const router = useRouter()

  function startEdit(ev: Evt) {
    setEditingId(ev.id)
    setEditColor(ev.color ?? '')
    setEditError(null)
  }

  async function handleUpdateSubmit(e: React.FormEvent<HTMLFormElement>, evId: string) {
    e.preventDefault()
    setEditPending(true)
    const fd = new FormData(e.currentTarget)
    if (editColor) fd.set('color', editColor)
    const result = await updateSchedule(evId, fd)
    if (result.error) {
      setEditError(result.error)
    } else {
      const title = (fd.get('title') as string)?.trim() ?? ''
      const time  = (fd.get('time') as string) || null
      setEvents(prev => prev.map(ev => ev.id === evId
        ? { ...ev, title, time, color: editColor || null }
        : ev))
      setEditingId(null)
      router.refresh()
    }
    setEditPending(false)
  }

  async function handleDelete(evId: string) {
    setEditPending(true)
    const result = await deleteSchedule(evId)
    if (result.error) {
      setEditError(result.error)
    } else {
      setEvents(prev => prev.filter(ev => ev.id !== evId))
      setEditingId(null)
      router.refresh()
    }
    setEditPending(false)
  }

  const todayYear  = parseInt(todayStr.slice(0, 4))
  const todayMonth = parseInt(todayStr.slice(5, 7))
  const todayDay   = parseInt(todayStr.slice(8, 10))
  const isCurrentMonth = year === todayYear && month === todayMonth

  useEffect(() => {
    if (year === initialYear && month === initialMonth) return
    setLoading(true)
    const pad = (n: number) => String(n).padStart(2, '0')
    const monthStart = `${year}-${pad(month)}-01`
    const daysInM = new Date(year, month, 0).getDate()
    const monthEnd = `${year}-${pad(month)}-${daysInM}`
    const sb = createClient()
    sb.from('schedule')
      .select('id, title, date, time, color, is_done, user_id')
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .order('date')
      .then(({ data }) => { setEvents(data ?? []); setLoading(false) })
  }, [year, month, initialYear, initialMonth])

  function prevMonth() {
    setSelectedDay(null)
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    setSelectedDay(null)
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const DOW = startDay === 1 ? DOW_MON : DOW_SUN
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDow    = new Date(year, month - 1, 1).getDay()
  // startDay=1(Mon): Sun=6,Mon=0,Tue=1... startDay=0(Sun): Sun=0,Mon=1...
  const startOffset = startDay === 1 ? (firstDow + 6) % 7 : firstDow

  const eventsByDay = new Map<number, Evt[]>()
  events.forEach(e => {
    const d = parseInt(e.date.slice(8, 10), 10)
    if (!eventsByDay.has(d)) eventsByDay.set(d, [])
    eventsByDay.get(d)!.push(e)
  })

  const selectedDateStr = selectedDay
    ? `${year}-${String(month).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    : ''
  const selectedEvents = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : []

  async function handleAddSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedDateStr) return
    setPending(true)
    setAddError(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    fd.set('date', selectedDateStr)
    if (addColor) fd.set('color', addColor)
    const result = await addSchedule(fd)
    if (result.error) {
      setAddError(result.error)
    } else {
      const title = (fd.get('title') as string)?.trim() ?? ''
      const time  = (fd.get('time') as string) || null
      setEvents(prev => [...prev, {
        id: `tmp-${Date.now()}`,
        title,
        date: selectedDateStr,
        time,
        color: addColor || null,
        is_done: false,
        user_id: currentUserId,
      }])
      form.reset()
      setAddColor('')
      router.refresh()
    }
    setPending(false)
  }

  return (
    <div className="board-v2-month-cal">
      {/* Header */}
      <div className="board-v2-month-cal-header">
        <button type="button" onClick={prevMonth} aria-label="이전 달">‹</button>
        <span className="board-v2-month-cal-title">
          {year}년 {month}월{loading && <span className="board-v2-month-cal-loading"> …</span>}
        </span>
        <button type="button" onClick={nextMonth} aria-label="다음 달">›</button>
      </div>

      {/* Day of week row */}
      <div className="board-v2-month-cal-dow">
        {DOW.map((d, i) => {
          const isSat = startDay === 1 ? i === 5 : i === 6
          const isSun = startDay === 1 ? i === 6 : i === 0
          return (
            <div key={d} className={isSat ? 'is-sat' : isSun ? 'is-sun' : ''}>{d}</div>
          )
        })}
      </div>

      {/* Grid */}
      <div className="board-v2-month-cal-grid">
        {Array.from({ length: startOffset }, (_, i) => (
          <div key={`pad-${i}`} className="board-v2-month-cal-cell is-pad" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day    = i + 1
          const dow    = (startOffset + i) % 7
          const isSat  = startDay === 1 ? dow === 5 : dow === 6
          const isSun  = startDay === 1 ? dow === 6 : dow === 0
          const isToday = isCurrentMonth && day === todayDay
          const isSel  = day === selectedDay
          const dayEvts = eventsByDay.get(day) ?? []

          return (
            <button
              key={day}
              type="button"
              className={[
                'board-v2-month-cal-cell',
                isToday ? 'is-today' : '',
                isSel   ? 'is-selected' : '',
                isSat   ? 'is-sat' : isSun ? 'is-sun' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => setSelectedDay(d => d === day ? null : day)}
            >
              <span className="board-v2-month-cal-day">{day}</span>
              <div className="board-v2-month-cal-events">
                {dayEvts.slice(0, 3).map(ev => (
                  <span
                    key={ev.id}
                    className={[
                      'board-v2-month-cal-ev',
                      ev.time ? '' : 'is-allday',
                      ev.is_done ? 'is-done' : '',
                      ev.user_id !== currentUserId ? 'is-shared' : '',
                    ].filter(Boolean).join(' ')}
                    style={ev.time
                      ? { borderLeftColor: ev.color ?? 'var(--board-accent)' }
                      : { background: ev.color ?? 'var(--board-accent)' }
                    }
                  >
                    {ev.time ? ev.time.slice(0, 5) + ' ' : ''}{ev.title}
                  </span>
                ))}
                {dayEvts.length > 3 && (
                  <span className="board-v2-month-cal-more">+{dayEvts.length - 3}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Day detail + add form */}
      {selectedDay && (
        <div className="board-v2-month-cal-detail">
          <div className="board-v2-month-cal-detail-hd">
            <strong>{month}월 {selectedDay}일</strong>
            <button type="button" onClick={() => setSelectedDay(null)}>✕</button>
          </div>

          {selectedEvents.length > 0 && (
            <ul className="board-v2-month-cal-ev-list">
              {selectedEvents.map(ev => (
                editingId === ev.id ? (
                  <li key={ev.id} className="board-v2-month-cal-ev-edit-item">
                    <form onSubmit={e => handleUpdateSubmit(e, ev.id)}>
                      <input name="title" defaultValue={ev.title}
                        className="board-v2-cal-input" required autoFocus />
                      <TimePicker name="time" endName="time_end" defaultValue={ev.time ?? undefined} />
                      <div className="board-v2-color-row board-v2-color-row-sm">
                        <button type="button"
                          className={`board-v2-color-dot board-v2-color-dot-sm board-v2-color-none${editColor === '' ? ' is-selected' : ''}`}
                          onClick={() => setEditColor('')} title="색상 없음" />
                        {COLORS.map(c => (
                          <button key={c} type="button"
                            className={`board-v2-color-dot board-v2-color-dot-sm${editColor === c ? ' is-selected' : ''}`}
                            style={{ background: c }} onClick={() => setEditColor(c)} />
                        ))}
                      </div>
                      {editError && <p className="board-v2-cal-error">{editError}</p>}
                      <div className="board-v2-cal-actions">
                        <button type="button" className="board-v2-cal-delete" disabled={editPending}
                          onClick={() => handleDelete(ev.id)}>삭제</button>
                        <button type="button" className="board-v2-cal-cancel" disabled={editPending}
                          onClick={() => setEditingId(null)}>취소</button>
                        <button type="submit" className="board-v2-cal-submit" disabled={editPending}>
                          {editPending ? '…' : '저장'}
                        </button>
                      </div>
                    </form>
                  </li>
                ) : (
                  <li key={ev.id}
                    className={[
                      ev.time ? '' : 'is-allday',
                      ev.is_done ? 'is-done' : '',
                      ev.user_id !== currentUserId ? 'is-shared' : '',
                    ].filter(Boolean).join(' ')}
                    style={{ borderLeftColor: ev.color ?? 'var(--board-accent)' }}>
                    {ev.time
                      ? <span className="board-v2-month-cal-ev-time">{ev.time.slice(0, 5)}</span>
                      : <span className="board-v2-month-cal-allday-badge">하루 종일</span>
                    }
                    <span className="board-v2-month-cal-ev-title">{ev.title}</span>
                    {ev.user_id !== currentUserId && <span className="board-v2-month-cal-shared-badge">공유</span>}
                    {ev.user_id === currentUserId && (
                      <button type="button" className="board-v2-month-cal-ev-edit-btn"
                        onClick={() => startEdit(ev)}>편집</button>
                    )}
                  </li>
                )
              ))}
            </ul>
          )}

          {/* Quick-add form for this day */}
          <form onSubmit={handleAddSubmit} className="board-v2-month-cal-add">
            <input name="title" placeholder="+ 일정 추가" className="board-v2-cal-input" required />
            <TimePicker name="time" endName="time_end" />
            <div className="board-v2-color-row board-v2-color-row-sm">
              <button type="button"
                className={`board-v2-color-dot board-v2-color-dot-sm board-v2-color-none${addColor === '' ? ' is-selected' : ''}`}
                onClick={() => setAddColor('')} title="색상 없음" />
              {COLORS.map(c => (
                <button key={c} type="button"
                  className={`board-v2-color-dot board-v2-color-dot-sm${addColor === c ? ' is-selected' : ''}`}
                  style={{ background: c }} onClick={() => setAddColor(c)} />
              ))}
            </div>
            {addError && <p className="board-v2-cal-error">{addError}</p>}
            <div className="board-v2-cal-actions">
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
