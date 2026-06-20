import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BoardShell, { resolveTheme, resolveFont, boardHref } from '@/components/BoardShell'
import AddButton from '@/components/AddButton'
import MonthCalendar from '@/components/MonthCalendar'
import DashboardSidebar from '@/components/DashboardSidebar'

export default async function SchedulePage({
  searchParams,
}: {
  searchParams?: Promise<{ theme?: string; font?: string }>
}) {
  const params = await searchParams
  const theme = resolveTheme(params)
  const font  = resolveFont(params)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const year     = now.getFullYear()
  const month    = now.getMonth() + 1
  const todayStr = now.toISOString().split('T')[0]
  const pad = (n: number) => String(n).padStart(2, '0')
  const monthStart = `${year}-${pad(month)}-01`
  const monthEnd   = `${year}-${pad(month)}-${new Date(year, month, 0).getDate()}`

  const [{ data: schedules }, { data: profile }] = await Promise.all([
    supabase
      .from('schedule')
      .select('id, title, date, time, color, is_done, user_id')
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .order('date'),
    supabase
      .from('users')
      .select('calendar_start_day')
      .eq('id', user.id)
      .single(),
  ])

  const startDay = ((profile as { calendar_start_day?: number } | null)?.calendar_start_day ?? 1) as 0 | 1

  return (
    <BoardShell theme={theme} font={font} basePath="/schedule">
      <div className="board-v2-content-row">
        <DashboardSidebar userId={user.id} />
      </div>

      <section className="board-v2-window">
        <div className="board-v2-window-bar">
          <nav className="board-v2-tabs" aria-label="메인 탭">
            <a                       href={boardHref('/week',     theme, font)}>일주일</a>
            <a className="is-active" href={boardHref('/schedule', theme, font)}>일정</a>
            <a                       href={boardHref('/habit',    theme, font)}>습관</a>
            <a                       href={boardHref('/expense',  theme, font)}>지출</a>
            <a                       href={boardHref('/memo',     theme, font)}>메모</a>
          </nav>
        </div>
        <div className="board-v2-window-body">
          <header className="board-v2-page-title">
            <span>일정</span>
            <h1>{year}년 {month}월</h1>
          </header>
          <AddButton type="일정" label="일정 등록" />
          <MonthCalendar
            key={startDay}
            initialEvents={schedules ?? []}
            initialYear={year}
            initialMonth={month}
            todayStr={todayStr}
            currentUserId={user.id}
            startDay={startDay}
          />
        </div>
      </section>
    </BoardShell>
  )
}
