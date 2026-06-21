'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  initialSchedules: Evt[]
  initialWeekStart: string
  currentUserId: string
  todayStr: string
}

const DAY_KO = ['월', '화', '수', '목', '금', '토', '일']

function getMonday(base: Date): Date {
  const d = new Date(base)
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay()
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow))
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function weekLabel(monday: Date): string {
  const sunday = addDays(monday, 6)
  const sm = monday.getMonth() + 1
  const sd = monday.getDate()
  const em = sunday.getMonth() + 1
  const ed = sunday.getDate()
  if (sm === em) return `${sm}월 ${sd}일~${ed}일`
  return `${sm}월 ${sd}일~${em}월 ${ed}일`
}

export default function WeekDiaryView({ initialSchedules, initialWeekStart, currentUserId, todayStr }: Props) {
  const initialMonday = useMemo(() => new Date(`${initialWeekStart}T00:00:00`), [initialWeekStart])
  const [monday, setMonday] = useState<Date>(initialMonday)
  const [fetchedSchedules, setFetchedSchedules] = useState<Evt[] | null>(null)
  const [diaries, setDiaries] = useState<Record<string, string>>({})
  const [editingDay, setEditingDay] = useState<string | null>(null)
  const [draftText, setDraftText] = useState('')
  const [jumpOpen, setJumpOpen] = useState(false)
  const jumpRef = useRef<HTMLInputElement>(null)

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday])
  const isInitialWeek = toDateStr(monday) === toDateStr(initialMonday)
  const schedules = isInitialWeek ? initialSchedules : (fetchedSchedules ?? [])

  useEffect(() => {
    const loaded: Record<string, string> = {}
    weekDays.forEach(day => {
      const val = localStorage.getItem(`diary-${toDateStr(day)}`)
      if (val) loaded[toDateStr(day)] = val
    })
    setDiaries(loaded)
    setEditingDay(null)
  }, [weekDays])

  useEffect(() => {
    if (isInitialWeek) { setFetchedSchedules(null); return }
    const start = toDateStr(weekDays[0])
    const end = toDateStr(weekDays[6])
    const supabase = createClient()
    let cancelled = false
    supabase
      .from('schedule')
      .select('id, title, date, time, color, is_done, user_id')
      .eq('user_id', currentUserId)
      .gte('date', start)
      .lte('date', end)
      .order('date')
      .then(({ data }) => {
        if (!cancelled) setFetchedSchedules((data ?? []) as Evt[])
      })
    return () => { cancelled = true }
  }, [isInitialWeek, weekDays, currentUserId])

  function prevWeek() { setMonday(d => addDays(d, -7)) }
  function nextWeek() { setMonday(d => addDays(d, 7)) }

  function handleJump(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    if (!val) return
    const picked = new Date(`${val}T00:00:00`)
    if (isNaN(picked.getTime())) return
    setMonday(getMonday(picked))
    setJumpOpen(false)
  }

  function startEdit(dateStr: string) {
    setDraftText(diaries[dateStr] ?? '')
    setEditingDay(dateStr)
  }

  function saveEdit(dateStr: string) {
    setDiaries(prev => ({ ...prev, [dateStr]: draftText }))
    localStorage.setItem(`diary-${dateStr}`, draftText)
    setEditingDay(null)
  }

  const schedByDate = new Map<string, Evt[]>()
  schedules.forEach(s => {
    if (!schedByDate.has(s.date)) schedByDate.set(s.date, [])
    schedByDate.get(s.date)!.push(s)
  })
  schedByDate.forEach(arr => {
    arr.sort((a, b) => {
      if (!a.time && b.time) return -1
      if (a.time && !b.time) return 1
      return (a.time ?? '').localeCompare(b.time ?? '')
    })
  })

  return (
    <div className="board-v2-week-diary">
      <div className="board-v2-week-diary-nav">
        <button type="button" onClick={prevWeek} aria-label="지난 주">&#8249;</button>
        <div className="board-v2-week-diary-nav-center">
          <span className="board-v2-week-diary-label">{weekLabel(monday)}</span>
          <button
            type="button"
            className="board-v2-week-diary-jump-btn"
            onClick={() => { setJumpOpen(v => !v); setTimeout(() => jumpRef.current?.showPicker?.(), 50) }}
            aria-label="날짜 선택"
          >
            ▾
          </button>
          {jumpOpen && (
            <input
              ref={jumpRef}
              type="date"
              className="board-v2-week-diary-jump-input"
              defaultValue={toDateStr(monday)}
              onChange={handleJump}
              onBlur={() => setJumpOpen(false)}
              autoFocus
            />
          )}
        </div>
        <button type="button" onClick={nextWeek} aria-label="다음 주">&#8250;</button>
      </div>

      <div className="board-v2-week-diary-list">
        {weekDays.map((day, i) => {
          const dateStr = toDateStr(day)
          const isToday = dateStr === todayStr
          const daySchedules = schedByDate.get(dateStr) ?? []
          const isEditing = editingDay === dateStr
          const savedText = diaries[dateStr] ?? ''

          return (
            <div
              key={dateStr}
              className={[
                'board-v2-week-diary-day',
                isToday ? 'is-today' : '',
                i === 5 ? 'is-sat' : i === 6 ? 'is-sun' : '',
              ].filter(Boolean).join(' ')}
            >
              {/* 날짜 헤더 + 일정 */}
              <div className="board-v2-week-diary-day-hd">
                <div className="board-v2-week-diary-day-label">
                  <span className="board-v2-week-diary-date">{day.getDate()}일</span>
                  <span className="board-v2-week-diary-dow">({DAY_KO[i]})</span>
                </div>
                <div className="board-v2-week-diary-chips">
                  {daySchedules.length === 0 && (
                    <span className="board-v2-week-diary-empty">일정 없음</span>
                  )}
                  {daySchedules.map(s => (
                    <span
                      key={s.id}
                      className={[
                        'board-v2-week-diary-chip',
                        !s.time ? 'is-allday' : '',
                        s.is_done ? 'is-done' : '',
                      ].filter(Boolean).join(' ')}
                      style={s.time
                        ? { borderLeftColor: s.color ?? 'var(--board-accent)' }
                        : { background: s.color ?? 'var(--board-accent)' }}
                    >
                      {s.time && <em>{s.time.slice(0, 5)}</em>}
                      {s.title}
                    </span>
                  ))}
                </div>
              </div>

              {/* 기록 영역 */}
              {isEditing ? (
                <div className="board-v2-week-diary-edit">
                  <textarea
                    className="board-v2-week-diary-textarea"
                    value={draftText}
                    onChange={e => setDraftText(e.target.value)}
                    placeholder="기록을 남겨보세요..."
                    rows={3}
                    autoFocus
                  />
                  <div className="board-v2-week-diary-actions">
                    <button type="button" className="board-v2-week-diary-cancel" onClick={() => setEditingDay(null)}>취소</button>
                    <button type="button" className="board-v2-week-diary-save" onClick={() => saveEdit(dateStr)}>저장</button>
                  </div>
                </div>
              ) : (
                <div className="board-v2-week-diary-read">
                  <p className={`board-v2-week-diary-text${!savedText ? ' is-empty' : ''}`}>
                    {savedText || (isToday ? '오늘의 기록을 남겨보세요...' : '기록 없음')}
                  </p>
                  <button type="button" className="board-v2-week-diary-edit-btn" onClick={() => startEdit(dateStr)}>기록</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
