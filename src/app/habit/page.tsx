import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BoardShell, { resolveTheme, resolveFont, boardHref } from '@/components/BoardShell'
import AddButton from '@/components/AddButton'
import HabitWeekGrid from '@/components/HabitWeekGrid'
import MoodChart from '@/components/MoodChart'
import HabitMonthView from '@/components/HabitMonthView'
import DashboardSidebar from '@/components/DashboardSidebar'
import type { MoodLevel } from '@/app/actions/entries'

export default async function HabitPage({
  searchParams,
}: {
  searchParams?: Promise<{ theme?: string; font?: string; view?: string }>
}) {
  const params = await searchParams
  const theme  = resolveTheme(params)
  const font   = resolveFont(params)
  const isMonth = params?.view === 'month'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1
  const pad   = (n: number) => String(n).padStart(2, '0')

  const { data: profile } = await supabase
    .from('users')
    .select('calendar_start_day')
    .eq('id', user.id)
    .single()
  const startDay = ((profile as { calendar_start_day?: number } | null)?.calendar_start_day ?? 1) as 0 | 1

  const { data: habits } = await supabase
    .from('habit')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at')
  const habitIds = habits?.map(h => h.id) ?? []

  // ── 주간 토글 링크 URL 생성 ──────────────────────
  const weekHref  = boardHref('/habit', theme, font)
  const monthHref = boardHref('/habit', theme, font).replace('/habit', '/habit?view=month&_=').replace('?_=', '?view=month')
    .replace('?view=month&_=', '?view=month')

  // 간단 URL 헬퍼 (boardHref에 view 추가)
  function habitViewHref(v: string) {
    const base = boardHref('/habit', theme, font)
    if (v === 'week') return base
    return base.includes('?') ? base + '&view=month' : base + '?view=month'
  }

  if (isMonth) {
    // ── 월간 데이터 ────────────────────────────────
    const daysInMonth = new Date(year, month, 0).getDate()
    const monthStart  = `${year}-${pad(month)}-01`
    const monthEnd    = `${year}-${pad(month)}-${daysInMonth}`

    const [checksResult, moodResult] = await Promise.all([
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
        .from('mood_check')
        .select('date, mood')
        .eq('user_id', user.id)
        .gte('date', monthStart)
        .lte('date', monthEnd),
    ])

    const monthChecks = (checksResult.data ?? []) as { habit_id: string; date: string }[]
    const monthMoods  = (moodResult.data  ?? []) as { date: string; mood: MoodLevel }[]

    return (
      <BoardShell theme={theme} font={font} basePath="/habit">
        <div className="board-v2-content-row">
          <DashboardSidebar userId={user.id} />
        </div>

        <section className="board-v2-window">
          <div className="board-v2-window-bar">
            <nav className="board-v2-tabs" aria-label="메인 탭">
              <a                       href={boardHref('/week',     theme, font)}>일주일</a>
              <a                       href={boardHref('/schedule', theme, font)}>일정</a>
              <a className="is-active" href={boardHref('/habit',    theme, font)}>습관</a>
              <a                       href={boardHref('/expense',  theme, font)}>지출</a>
              <a                       href={boardHref('/memo',     theme, font)}>메모</a>
            </nav>
          </div>
          <div className="board-v2-window-body">
            <header className="board-v2-page-title">
              <span>습관 트래커</span>
              <h1>{year}년 {month}월</h1>
            </header>

            {/* 주간 / 월간 토글 */}
            <div className="board-v2-habit-view-toggle">
              <a href={habitViewHref('week')}  className="board-v2-habit-view-btn">이번 주</a>
              <a href={habitViewHref('month')} className="board-v2-habit-view-btn is-active">이번 달</a>
            </div>

            <HabitMonthView
              habits={habits ?? []}
              checks={monthChecks}
              moods={monthMoods}
              year={year}
              month={month}
              startDay={startDay}
            />
          </div>
        </section>
      </BoardShell>
    )
  }

  // ── 주간 데이터 ──────────────────────────────────
  const dow = now.getDay()
  const weekStart = new Date(now)
  if (startDay === 1) {
    weekStart.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
  } else {
    weekStart.setDate(now.getDate() - dow)
  }
  const dayNames = startDay === 1
    ? ['월', '화', '수', '목', '금', '토', '일']
    : ['일', '월', '화', '수', '목', '금', '토']

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return {
      dayName: dayNames[i],
      dateStr: d.toISOString().split('T')[0],
      isToday: d.toDateString() === now.toDateString(),
    }
  })

  const weekStartStr = weekDays[0].dateStr
  const weekEndStr   = weekDays[6].dateStr
  const weekLabel = `${weekStartStr.slice(5).replace('-', '/')} ~ ${weekEndStr.slice(5).replace('-', '/')}`

  const [checksResult, moodResult] = await Promise.all([
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
  ])

  const checks = (checksResult.data ?? []) as { habit_id: string; date: string; is_checked: boolean }[]
  const moods  = (moodResult.data  ?? []) as { date: string; mood: MoodLevel }[]

  return (
    <BoardShell theme={theme} font={font} basePath="/habit">
      <div className="board-v2-content-row">
        <DashboardSidebar userId={user.id} />
      </div>

      <section className="board-v2-window">
        <div className="board-v2-window-bar">
          <nav className="board-v2-tabs" aria-label="메인 탭">
            <a                       href={boardHref('/week',     theme, font)}>일주일</a>
            <a                       href={boardHref('/schedule', theme, font)}>일정</a>
            <a className="is-active" href={boardHref('/habit',    theme, font)}>습관</a>
            <a                       href={boardHref('/expense',  theme, font)}>지출</a>
            <a                       href={boardHref('/memo',     theme, font)}>메모</a>
          </nav>
        </div>
        <div className="board-v2-window-body">
          <header className="board-v2-page-title">
            <span>습관 트래커</span>
            <h1>{weekLabel}</h1>
          </header>

          {/* 주간 / 월간 토글 */}
          <div className="board-v2-habit-view-toggle">
            <a href={habitViewHref('week')}  className="board-v2-habit-view-btn is-active">이번 주</a>
            <a href={habitViewHref('month')} className="board-v2-habit-view-btn">이번 달</a>
          </div>

          <AddButton type="습관" label="습관 생성" />
          <HabitWeekGrid habits={habits ?? []} checks={checks} weekDays={weekDays} />
          <MoodChart moods={moods} weekDays={weekDays} />
        </div>
      </section>
    </BoardShell>
  )
}
