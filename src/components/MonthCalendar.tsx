'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteSchedule, updateSchedule, addCategory } from '@/app/actions/entries'
import { addSchedule } from '@/app/actions/schedules'
import { createClient } from '@/lib/supabase/client'
import TimePicker from '@/components/TimePicker'
import { getHolidaysForMonth } from '@/lib/korean-holidays'

type Category = { id: string; name: string; color: string }

type Evt = {
  id: string
  title: string
  date: string
  time: string | null
  color: string | null
  is_done: boolean
  user_id: string
  category_id?: string | null
}

type Props = {
  initialEvents: Evt[]
  initialYear: number
  initialMonth: number
  todayStr: string
  currentUserId: string
  startDay?: 0 | 1
  initialSelectedDate?: string
  categoryFilter?: string
  initialCategories?: Category[]
}

type CatPickerProps = {
  categories: Category[]
  catId: string
  onCatChange: (id: string) => void
  onCategoryAdded: (cat: Category) => void
}

function CategoryColorPicker({ categories, catId, onCatChange, onCategoryAdded }: CatPickerProps) {
  const [addingCat, setAddingCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#a8d4f5')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!newCatName.trim()) return
    setSaving(true)
    const res = await addCategory(newCatName.trim(), newCatColor)
    if (!res.error && res.id) {
      const newCat: Category = { id: res.id, name: newCatName.trim(), color: newCatColor }
      onCategoryAdded(newCat)
      onCatChange(res.id)
      setNewCatName('')
      setNewCatColor('#a8d4f5')
      setAddingCat(false)
    }
    setSaving(false)
  }

  return (
    <div className="board-v2-cat-color-picker">
      <div className="board-v2-cat-color-swatches">
        <button
          type="button"
          className={`board-v2-cat-color-item is-none${!catId && !addingCat ? ' is-selected' : ''}`}
          onClick={() => { onCatChange(''); setAddingCat(false) }}
        >없음</button>
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            className={`board-v2-cat-color-item${catId === cat.id ? ' is-selected' : ''}`}
            data-color={cat.color}
            style={{ '--cat-dot-color': cat.color } as React.CSSProperties}
            onClick={() => { onCatChange(cat.id); setAddingCat(false) }}
          >{cat.name}</button>
        ))}
        <button
          type="button"
          className={`board-v2-cat-color-item is-add${addingCat ? ' is-selected' : ''}`}
          onClick={() => { setAddingCat(v => !v); if (!addingCat) onCatChange('') }}
        >+ 추가</button>
      </div>
      {addingCat && (
        <div className="board-v2-cat-new-form">
          <input
            type="text"
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            placeholder="카테고리 이름"
            className="board-v2-cal-input"
          />
          <div className="board-v2-cat-new-color-row">
            <span className="board-v2-color-label">색상</span>
            <input
              type="color"
              className="board-v2-color-input"
              value={newCatColor}
              onChange={e => setNewCatColor(e.target.value)}
            />
          </div>
          <div className="board-v2-cal-actions">
            <button type="button" className="board-v2-cal-cancel" onClick={() => setAddingCat(false)}>취소</button>
            <button type="button" className="board-v2-cal-submit" disabled={saving || !newCatName.trim()} onClick={handleSave}>
              {saving ? '저장 중' : '저장'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const DOW_MON = ['월', '화', '수', '목', '금', '토', '일']
const DOW_SUN = ['일', '월', '화', '수', '목', '금', '토']
const pad = (n: number) => String(n).padStart(2, '0')
const DEFAULT_COLOR = '#a8d4f5'

export default function MonthCalendar({
  initialEvents,
  initialYear,
  initialMonth,
  todayStr,
  currentUserId,
  startDay = 1,
  initialSelectedDate,
  categoryFilter,
  initialCategories,
}: Props) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(initialYear)
  const [fetchedEvents, setFetchedEvents] = useState<Evt[] | null>(null)
  const [localEvents, setLocalEvents] = useState<Evt[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(
    initialSelectedDate ? parseInt(initialSelectedDate.slice(8, 10), 10) : null,
  )
  const [categories, setCategories] = useState<Category[]>(initialCategories ?? [])
  const [addCatId, setAddCatId] = useState('')
  const [addColor, setAddColor] = useState(DEFAULT_COLOR)
  const [pending, setPending] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCatId, setEditCatId] = useState('')
  const [editColor, setEditColor] = useState(DEFAULT_COLOR)
  const [editPending, setEditPending] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (initialCategories !== undefined) return
    const supabase = createClient()
    supabase
      .from('schedule_category')
      .select('id, name, color')
      .eq('user_id', currentUserId)
      .order('created_at')
      .then(({ data }) => {
        setCategories((data ?? []) as Category[])
      })
  }, [currentUserId, initialCategories])

  const isInitialMonth = year === initialYear && month === initialMonth
  const events = useMemo(() => {
    const base = isInitialMonth ? initialEvents : (fetchedEvents ?? [])
    if (localEvents.length === 0) return base
    const byId = new Map(base.map(event => [event.id, event]))
    localEvents.forEach(event => byId.set(event.id, event))
    return Array.from(byId.values())
  }, [fetchedEvents, initialEvents, isInitialMonth, localEvents])

  useEffect(() => {
    if (isInitialMonth) return
    const monthStart = `${year}-${pad(month)}-01`
    const daysInMonth = new Date(year, month, 0).getDate()
    const monthEnd = `${year}-${pad(month)}-${pad(daysInMonth)}`
    const supabase = createClient()
    let cancelled = false
    let query = supabase
      .from('schedule')
      .select('id, title, date, time, color, is_done, user_id, category_id')
      .eq('user_id', currentUserId)
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .order('date')
    if (categoryFilter) query = query.eq('category_id', categoryFilter)
    query.then(({ data }) => {
      if (!cancelled) setFetchedEvents((data ?? []) as Evt[])
    })
    return () => { cancelled = true }
  }, [categoryFilter, currentUserId, isInitialMonth, month, year])

  const addCatColor = categories.find(c => c.id === addCatId)?.color ?? null
  const editCatColor = categories.find(c => c.id === editCatId)?.color ?? null

  function handleCategoryAdded(cat: Category) {
    setCategories(prev => [...prev, cat])
  }

  function startEdit(event: Evt) {
    setEditingId(event.id)
    setEditCatId(event.category_id ?? '')
    setEditColor(event.color ?? DEFAULT_COLOR)
    setEditError(null)
  }

  async function handleUpdateSubmit(e: React.FormEvent<HTMLFormElement>, eventId: string) {
    e.preventDefault()
    setEditPending(true)
    const formData = new FormData(e.currentTarget)
    const resolvedColor = editCatColor ?? editColor
    formData.set('color', resolvedColor)
    if (editCatId) formData.set('category_id', editCatId)
    const result = await updateSchedule(eventId, formData)
    if (result.error) {
      setEditError(result.error)
    } else {
      const title = (formData.get('title') as string)?.trim() ?? ''
      const time = (formData.get('time') as string) || null
      setLocalEvents(prev => [
        ...prev.filter(item => item.id !== eventId),
        ...events.filter(item => item.id === eventId).map(item => ({
          ...item, title, time, color: resolvedColor, category_id: editCatId || null,
        })),
      ])
      setEditingId(null)
      router.refresh()
    }
    setEditPending(false)
  }

  async function handleDelete(eventId: string) {
    setEditPending(true)
    const result = await deleteSchedule(eventId)
    if (result.error) {
      setEditError(result.error)
    } else {
      setLocalEvents(prev => prev.filter(item => item.id !== eventId))
      setFetchedEvents(prev => prev ? prev.filter(item => item.id !== eventId) : prev)
      setEditingId(null)
      router.refresh()
    }
    setEditPending(false)
  }

  function prevMonth() {
    setSelectedDay(null)
    if (month === 1) { setYear(v => v - 1); setMonth(12) }
    else setMonth(v => v - 1)
  }

  function nextMonth() {
    setSelectedDay(null)
    if (month === 12) { setYear(v => v + 1); setMonth(1) }
    else setMonth(v => v + 1)
  }

  const todayYear = parseInt(todayStr.slice(0, 4), 10)
  const todayMonth = parseInt(todayStr.slice(5, 7), 10)
  const todayDay = parseInt(todayStr.slice(8, 10), 10)
  const isCurrentMonth = year === todayYear && month === todayMonth
  const dayLabels = startDay === 1 ? DOW_MON : DOW_SUN
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDow = new Date(year, month - 1, 1).getDay()
  const startOffset = startDay === 1 ? (firstDow + 6) % 7 : firstDow
  const holidays = getHolidaysForMonth(year, month)
  const holidayMap = new Map(holidays.map(h => [parseInt(h.date.slice(8, 10), 10), h.name]))

  const eventsByDay = new Map<number, Evt[]>()
  events.forEach(event => {
    const day = parseInt(event.date.slice(8, 10), 10)
    if (!eventsByDay.has(day)) eventsByDay.set(day, [])
    eventsByDay.get(day)!.push(event)
  })

  const selectedDateStr = selectedDay ? `${year}-${pad(month)}-${pad(selectedDay)}` : ''
  const selectedEvents = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : []

  async function handleAddSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedDateStr) return
    setPending(true)
    setAddError(null)
    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('date', selectedDateStr)
    formData.set('color', addCatColor ?? addColor)
    if (addCatId) formData.set('category_id', addCatId)
    else if (categoryFilter) formData.set('category_id', categoryFilter)
    const result = await addSchedule(formData)
    if (result.error) {
      setAddError(result.error)
    } else {
      if (result.schedule) setLocalEvents(prev => [...prev, result.schedule!])
      form.reset()
      setAddCatId('')
      setAddColor(DEFAULT_COLOR)
      router.refresh()
    }
    setPending(false)
  }

  return (
    <div className="board-v2-month-cal">
      <div className="board-v2-month-cal-header">
        <button type="button" className="board-v2-month-cal-arrow" onClick={prevMonth} aria-label="이전 달">&lt;</button>
        <div className="board-v2-month-cal-title-group">
          <span className="board-v2-month-cal-title">{year}년 {month}월</span>
          <button
            type="button"
            className="board-v2-month-cal-year-btn"
            onClick={() => { setDatePickerOpen(v => !v); setPickerYear(year) }}
            aria-label="년/월 선택"
            aria-expanded={datePickerOpen}
          >
            ▾
          </button>
        </div>
        <button type="button" className="board-v2-month-cal-arrow" onClick={nextMonth} aria-label="다음 달">&gt;</button>
      </div>

      {datePickerOpen && (
        <div className="board-v2-date-picker">
          <div className="board-v2-date-picker-year-row">
            <button type="button" onClick={() => setPickerYear(y => y - 1)}>&lt;</button>
            <span>{pickerYear}년</span>
            <button type="button" onClick={() => setPickerYear(y => y + 1)}>&gt;</button>
          </div>
          <div className="board-v2-date-picker-months">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <button
                key={m}
                type="button"
                className={[
                  'board-v2-date-picker-month-btn',
                  pickerYear === year && m === month ? 'is-active' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => {
                  setYear(pickerYear); setMonth(m)
                  setDatePickerOpen(false); setSelectedDay(null)
                }}
              >
                {m}월
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="board-v2-month-cal-dow">
        {dayLabels.map((label, index) => {
          const isSat = startDay === 1 ? index === 5 : index === 6
          const isSun = startDay === 1 ? index === 6 : index === 0
          return <div key={label} className={isSat ? 'is-sat' : isSun ? 'is-sun' : ''}>{label}</div>
        })}
      </div>

      <div className="board-v2-month-cal-grid">
        {Array.from({ length: startOffset }, (_, index) => (
          <div key={`pad-${index}`} className="board-v2-month-cal-cell is-pad" />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1
          const dayOfWeek = (startOffset + index) % 7
          const isSat = startDay === 1 ? dayOfWeek === 5 : dayOfWeek === 6
          const isSun = startDay === 1 ? dayOfWeek === 6 : dayOfWeek === 0
          const isToday = isCurrentMonth && day === todayDay
          const isSelected = day === selectedDay
          const dayEvents = eventsByDay.get(day) ?? []
          const holidayName = holidayMap.get(day)

          return (
            <button
              key={day}
              type="button"
              className={[
                'board-v2-month-cal-cell',
                isToday ? 'is-today' : '',
                isSelected ? 'is-selected' : '',
                // 공휴일은 토요일이라도 항상 is-sun (빨간색)
                (isSun || holidayName) ? 'is-sun' : isSat ? 'is-sat' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => setSelectedDay(value => value === day ? null : day)}
            >
              <div className="board-v2-month-cal-day-row">
                <span className="board-v2-month-cal-day">{day}</span>
                {holidayName && <span className="board-v2-month-cal-holiday-name">{holidayName}</span>}
              </div>
              <div className="board-v2-month-cal-events">
                {dayEvents.slice(0, 3).map(item => (
                  <span
                    key={item.id}
                    className={[
                      'board-v2-month-cal-ev',
                      item.time ? '' : 'is-allday',
                      item.is_done ? 'is-done' : '',
                      item.user_id !== currentUserId ? 'is-shared' : '',
                    ].filter(Boolean).join(' ')}
                    style={item.time
                      ? { borderLeftColor: item.color ?? 'var(--board-accent)' }
                      : { background: item.color ?? 'var(--board-accent)' }}
                  >
                    {item.time ? `${item.time.slice(0, 5)} ` : ''}{item.title}
                  </span>
                ))}
                {dayEvents.length > 3 && (
                  <span className="board-v2-month-cal-more">+{dayEvents.length - 3}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {selectedDay && (
        <div className="board-v2-month-cal-detail">
          <div className="board-v2-month-cal-detail-hd">
            <strong>{month}월 {selectedDay}일</strong>
            <button type="button" onClick={() => setSelectedDay(null)}>닫기</button>
          </div>

          {selectedEvents.length > 0 && (
            <ul className="board-v2-month-cal-ev-list">
              {selectedEvents.map(item => (
                editingId === item.id ? (
                  <li key={item.id} className="board-v2-month-cal-ev-edit-item">
                    <form onSubmit={e => handleUpdateSubmit(e, item.id)}>
                      <input name="title" defaultValue={item.title} className="board-v2-cal-input" required autoFocus />
                      <TimePicker name="time" endName="time_end" defaultValue={item.time ?? undefined} />
                      <CategoryColorPicker
                        categories={categories}
                        catId={editCatId}
                        onCatChange={setEditCatId}
                        onCategoryAdded={handleCategoryAdded}
                      />
                      {editError && <p className="board-v2-cal-error">{editError}</p>}
                      <div className="board-v2-cal-actions">
                        <button type="button" className="board-v2-cal-delete" disabled={editPending} onClick={() => handleDelete(item.id)}>삭제</button>
                        <button type="button" className="board-v2-cal-cancel" disabled={editPending} onClick={() => setEditingId(null)}>취소</button>
                        <button type="submit" className="board-v2-cal-submit" disabled={editPending}>
                          {editPending ? '저장 중' : '저장'}
                        </button>
                      </div>
                    </form>
                  </li>
                ) : (
                  <li
                    key={item.id}
                    className={[
                      item.time ? '' : 'is-allday',
                      item.is_done ? 'is-done' : '',
                      item.user_id !== currentUserId ? 'is-shared' : '',
                    ].filter(Boolean).join(' ')}
                    style={{ borderLeftColor: item.color ?? 'var(--board-accent)' }}
                  >
                    {item.time
                      ? <span className="board-v2-month-cal-ev-time">{item.time.slice(0, 5)}</span>
                      : <span className="board-v2-month-cal-allday-badge">종일</span>}
                    <span className="board-v2-month-cal-ev-title">{item.title}</span>
                    {item.user_id !== currentUserId && <span className="board-v2-month-cal-shared-badge">공유</span>}
                    {item.user_id === currentUserId && (
                      <button type="button" className="board-v2-month-cal-ev-edit-btn" onClick={() => startEdit(item)}>편집</button>
                    )}
                  </li>
                )
              ))}
            </ul>
          )}

          <form onSubmit={handleAddSubmit} className="board-v2-month-cal-add">
            <input name="title" placeholder="+ 일정 추가" className="board-v2-cal-input" required />
            <TimePicker name="time" endName="time_end" />
            <CategoryColorPicker
              categories={categories}
              catId={addCatId}
              onCatChange={setAddCatId}
              onCategoryAdded={handleCategoryAdded}
            />
            {addError && <p className="board-v2-cal-error">{addError}</p>}
            <div className="board-v2-cal-actions">
              <button type="submit" disabled={pending} className="board-v2-cal-submit">
                {pending ? '저장 중' : '저장'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
