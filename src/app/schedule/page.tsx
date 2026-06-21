import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BoardShell, { resolveTheme, resolveFont, boardHref } from '@/components/BoardShell'
import AddButton from '@/components/AddButton'
import MonthCalendar from '@/components/MonthCalendar'
import WeekDiaryView from '@/components/WeekDiaryView'
import CategoryQuickAdd from '@/components/CategoryQuickAdd'
import HeaderBar from '@/components/HeaderBar'
import BottomNav from '@/components/BottomNav'
import { fetchGroup } from '@/lib/group'

type ProfilePrefs = {
  calendar_start_day?: number | null
  theme?: string | null
  font?: string | null
  nickname?: string | null
  diary_name?: string | null
  avatar_url?: string | null
}

type ScheduleRow = {
  id: string
  title: string
  date: string
  time: string | null
  color: string | null
  is_done: boolean
  user_id: string
  category_id?: string | null
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams?: Promise<{ theme?: string; font?: string; date?: string; cat?: string; view?: string }>
}) {
  const params = await searchParams
  const catParam = params?.cat ?? null
  const view = params?.view === 'week' ? 'week' : 'month'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  const selectedDate = params?.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : undefined
  const anchor = selectedDate ? new Date(`${selectedDate}T00:00:00`) : now
  const year = anchor.getFullYear()
  const month = anchor.getMonth() + 1
  const monthStart = `${year}-${pad(month)}-01`
  const monthEnd = `${year}-${pad(month)}-${new Date(year, month, 0).getDate()}`

  const dow = now.getDay()
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(now.getDate() + (dow === 0 ? -6 : 1 - dow))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const weekStart = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`
  const weekEnd = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`

  let scheduleQuery = view === 'month'
    ? supabase.from('schedule').select('id, title, date, time, color, is_done, user_id, category_id').eq('user_id', user.id).gte('date', monthStart).lte('date', monthEnd).order('date')
    : supabase.from('schedule').select('id, title, date, time, color, is_done, user_id, category_id').eq('user_id', user.id).gte('date', weekStart).lte('date', weekEnd).order('date')
  if (catParam && view === 'month') scheduleQuery = scheduleQuery.eq('category_id', catParam)

  const [{ data: profile }, group, { data: scheduleData }, { data: categories }] = await Promise.all([
    supabase.from('users').select('calendar_start_day, theme, font, nickname, diary_name, avatar_url').eq('id', user.id).single(),
    fetchGroup(supabase, user.id),
    scheduleQuery,
    supabase.from('schedule_category').select('id, name, color').eq('user_id', user.id).order('created_at'),
  ])

  const profilePrefs = profile as ProfilePrefs | null
  const theme = resolveTheme(params, profilePrefs?.theme)
  const font = resolveFont(params, profilePrefs?.font)
  const startDay = ((profilePrefs?.calendar_start_day ?? 1) as 0 | 1)

  const monthSchedules: ScheduleRow[] = view === 'month' ? (scheduleData ?? []) as ScheduleRow[] : []
  const weekSchedules: ScheduleRow[] = view === 'week' ? (scheduleData ?? []) as ScheduleRow[] : []
  const cats = (categories ?? []) as { id: string; name: string; color: string }[]

  function schedHref(opts?: { date?: string; cat?: string | null; view?: string }) {
    const q = new URLSearchParams()
    if (theme !== 'white') q.set('theme', theme)
    if (font !== 'gothic') q.set('font', font)
    if (opts?.date) q.set('date', opts.date)
    if (opts?.cat) q.set('cat', opts.cat)
    if (opts?.view && opts.view !== 'month') q.set('view', opts.view)
    const s = q.toString()
    return s ? `/schedule?${s}` : '/schedule'
  }

  return (
    <BoardShell theme={theme} font={font} headerSlot={
      <HeaderBar
        userId={user.id} theme={theme} font={font} basePath="/schedule"
        nickname={profilePrefs?.nickname}
        diaryName={profilePrefs?.diary_name}
        avatarUrl={profilePrefs?.avatar_url}
        calendarStartDay={startDay}
        group={group}
      />
    }>
      <div className="board-v2-main">
      <section className="board-v2-window">
        <div className="board-v2-window-body">
          <div className="board-v2-window-heading-row">
            <a href={schedHref({})} className="board-v2-tab-heading">일정</a>
            <AddButton type="일정" label="일정 등록" defaultDate={view === 'month' ? selectedDate : undefined} />
          </div>

          {/* 이번 달 / 이번 주 뷰 토글 */}
          <div className="board-v2-sched-view-toggle">
            <a
              href={schedHref({ view: 'month' })}
              className={`board-v2-sched-view-btn${view === 'month' ? ' is-active' : ''}`}
            >
              이번 달
            </a>
            <a
              href={schedHref({ view: 'week' })}
              className={`board-v2-sched-view-btn${view === 'week' ? ' is-active' : ''}`}
            >
              이번 주
            </a>
          </div>

          {view === 'month' ? (
            <>
              <div className="board-v2-cat-filter-row">
                <a href={schedHref({ date: selectedDate })} className={`board-v2-cat-chip${!catParam ? ' is-active' : ''}`}>
                  전체
                </a>
                {cats.map(cat => (
                  <a
                    key={cat.id}
                    href={schedHref({ date: selectedDate, cat: catParam === cat.id ? null : cat.id })}
                    className={`board-v2-cat-chip${catParam === cat.id ? ' is-active' : ''}`}
                    style={{ '--chip-color': cat.color } as React.CSSProperties}
                  >
                    {cat.name}
                  </a>
                ))}
                <CategoryQuickAdd />
              </div>
              <MonthCalendar
                key={`${startDay}-${catParam}`}
                initialEvents={monthSchedules}
                initialYear={year}
                initialMonth={month}
                todayStr={todayStr}
                currentUserId={user.id}
                startDay={startDay}
                initialSelectedDate={selectedDate}
                categoryFilter={catParam ?? undefined}
                initialCategories={cats}
              />
            </>
          ) : (
            <WeekDiaryView
              initialSchedules={weekSchedules}
              initialWeekStart={weekStart}
              currentUserId={user.id}
              todayStr={todayStr}
            />
          )}
        </div>
      </section>
      <BottomNav theme={theme} font={font} />
      </div>
    </BoardShell>
  )
}
