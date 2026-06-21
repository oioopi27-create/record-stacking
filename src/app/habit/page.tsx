import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BoardShell, { boardHref, resolveFont, resolveTheme } from '@/components/BoardShell'
import HeaderBar from '@/components/HeaderBar'
import BottomNav from '@/components/BottomNav'
import AddButton from '@/components/AddButton'
import HabitMonthView from '@/components/HabitMonthView'
import HabitWeekGrid from '@/components/HabitWeekGrid'
import MoodChart from '@/components/MoodChart'
import TodayFocusList from '@/components/TodayFocusList'
import type { MoodLevel } from '@/app/actions/entries'
import { weekOfMonthLabel } from '@/lib/date-labels'

const pad = (n: number) => String(n).padStart(2, '0')

type ProfilePrefs = {
  calendar_start_day?: number | null
  theme?: string | null
  font?: string | null
}

export default async function HabitPage({
  searchParams,
}: {
  searchParams?: Promise<{ theme?: string; font?: string; view?: string; week?: string }>
}) {
  const params = await searchParams
  const isMonth = params?.view === 'month'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('calendar_start_day, theme, font')
    .eq('id', user.id)
    .single()
  const profilePrefs = profile as ProfilePrefs | null
  const theme = resolveTheme(params, profilePrefs?.theme)
  const font = resolveFont(params, profilePrefs?.font)
  const startDay = ((profilePrefs?.calendar_start_day ?? 1) as 0 | 1)

  const now = new Date()
  const requested = params?.week ? new Date(`${params.week}T00:00:00`) : null
  const anchor = requested && !Number.isNaN(requested.getTime()) ? requested : now
  const year = anchor.getFullYear()
  const month = anchor.getMonth() + 1
  const todayKey = now.toISOString().split('T')[0]

  const { data: habits } = await supabase
    .from('habit')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at')
  const habitIds = habits?.map(habit => habit.id) ?? []

  function habitViewHref(view: 'week' | 'month') {
    const base = boardHref('/habit', theme, font)
    if (view === 'week') return base
    return base.includes('?') ? `${base}&view=month` : `${base}?view=month`
  }

  const headerBar = <HeaderBar userId={user.id} theme={theme} font={font} basePath="/habit" />

  if (isMonth) {
    const daysInMonth = new Date(year, month, 0).getDate()
    const monthStart = `${year}-${pad(month)}-01`
    const monthEnd = `${year}-${pad(month)}-${pad(daysInMonth)}`
    const habitMonthHref = (diff: number) => {
      const date = new Date(year, month - 1 + diff, 1)
      const dateParam = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`
      const base = boardHref('/habit', theme, font)
      return base.includes('?') ? `${base}&view=month&week=${dateParam}` : `${base}?view=month&week=${dateParam}`
    }

    const [checksResult, reviewResult] = await Promise.all([
      habitIds.length > 0
        ? supabase
            .from('habit_check')
            .select('habit_id, date')
            .in('habit_id', habitIds)
            .gte('date', monthStart)
            .lte('date', monthEnd)
            .eq('is_checked', true)
        : Promise.resolve({ data: [] }),
      supabase
        .from('habit_review')
        .select('habit_id, review')
        .eq('user_id', user.id)
        .eq('month_start', monthStart),
    ])

    return (
      <BoardShell theme={theme} font={font} headerSlot={headerBar}>
        <div className="board-v2-main">
        <section className="board-v2-window">
        <div className="board-v2-window-body">
          <div className="board-v2-window-heading-row">
            <a href={habitViewHref('month')} className="board-v2-tab-heading">습관</a>
            <AddButton type="습관" label="습관 생성" />
          </div>

          <div className="board-v2-habit-view-toggle">
            <a href={habitViewHref('week')} className="board-v2-habit-view-btn">이번 주</a>
            <a href={habitViewHref('month')} className="board-v2-habit-view-btn is-active">이번 달</a>
          </div>

          <nav className="board-v2-week-arrow-nav" aria-label="습관 월 이동">
            <a href={habitMonthHref(-1)} aria-label="지난 달">‹</a>
            <span>{year}.{pad(month)}</span>
            <a href={habitMonthHref(1)} aria-label="다음 달">›</a>
          </nav>

          <HabitMonthView
            key={`${year}-${month}`}
            habits={habits ?? []}
            checks={(checksResult.data ?? []) as { habit_id: string; date: string }[]}
            reviews={(reviewResult.data ?? []) as { habit_id: string; review: string | null }[]}
            year={year}
            month={month}
          />
        </div>
        </section>
        <BottomNav theme={theme} font={font} />
        </div>
      </BoardShell>
    )
  }

  const dayOfWeek = anchor.getDay()
  const weekStart = new Date(anchor)
  if (startDay === 1) weekStart.setDate(anchor.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  else weekStart.setDate(anchor.getDate() - dayOfWeek)

  const dayNames = startDay === 1
    ? ['월', '화', '수', '목', '금', '토', '일']
    : ['일', '월', '화', '수', '목', '금', '토']
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)
    return {
      dayName: dayNames[index],
      dateStr: date.toISOString().split('T')[0],
      isToday: date.toDateString() === now.toDateString(),
    }
  })

  const weekStartStr = weekDays[0].dateStr
  const weekEndStr = weekDays[6].dateStr
  const weekLabel = weekOfMonthLabel(weekStart)
  const habitWeekHref = (week?: string) => {
    const base = boardHref('/habit', theme, font)
    if (!week) return base
    return base.includes('?') ? `${base}&week=${week}` : `${base}?week=${week}`
  }
  const navDate = (diff: number) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + diff)
    return date.toISOString().split('T')[0]
  }

  const [checksResult, moodResult, focusResult] = await Promise.all([
    habitIds.length > 0
      ? supabase
          .from('habit_check')
          .select('habit_id, date, is_checked')
          .in('habit_id', habitIds)
          .gte('date', weekStartStr)
          .lte('date', weekEndStr)
      : Promise.resolve({ data: [] }),
    supabase
      .from('mood_check')
      .select('date, mood')
      .eq('user_id', user.id)
      .gte('date', weekStartStr)
      .lte('date', weekEndStr),
    supabase
      .from('focus_item')
      .select('id, text, is_done')
      .eq('user_id', user.id)
      .eq('date', todayKey)
      .order('sort_order')
      .order('created_at'),
  ])

  return (
    <BoardShell theme={theme} font={font} headerSlot={headerBar}>
      <div className="board-v2-main">
      <section className="board-v2-window">
      <div className="board-v2-window-body">
        <div className="board-v2-window-heading-row">
          <a href={habitViewHref('week')} className="board-v2-tab-heading">습관</a>
          <AddButton type="습관" label="습관 생성" />
        </div>

        <div className="board-v2-habit-view-toggle">
          <a href={habitViewHref('week')} className="board-v2-habit-view-btn is-active">이번 주</a>
          <a href={habitViewHref('month')} className="board-v2-habit-view-btn">이번 달</a>
        </div>
        <nav className="board-v2-week-arrow-nav" aria-label="습관 주 이동">
          <a href={habitWeekHref(navDate(-7))} aria-label="지난 주">‹</a>
          <span>{weekLabel}</span>
          <a href={habitWeekHref(navDate(7))} aria-label="다음 주">›</a>
        </nav>
        <HabitWeekGrid
          habits={habits ?? []}
          checks={(checksResult.data ?? []) as { habit_id: string; date: string; is_checked: boolean }[]}
          weekDays={weekDays}
        />
        <MoodChart moods={(moodResult.data ?? []) as { date: string; mood: MoodLevel }[]} weekDays={weekDays} />
        <TodayFocusList
          dateKey={todayKey}
          initialItems={(focusResult.data ?? []) as { id: string; text: string; is_done: boolean }[]}
        />
      </div>
      </section>
      <BottomNav theme={theme} font={font} />
      </div>
    </BoardShell>
  )
}
