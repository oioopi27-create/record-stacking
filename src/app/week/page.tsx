import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BoardShell, { resolveTheme, resolveFont, boardHref } from '@/components/BoardShell'
import PlusMenu from '@/components/PlusMenu'
import WeekDayStrip from '@/components/WeekDayStrip'
import DashboardSidebar from '@/components/DashboardSidebar'

export default async function WeekPage({
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
  const todayStr = now.toISOString().split('T')[0]

  // Fetch user settings (calendar start day)
  const { data: profile } = await supabase
    .from('users')
    .select('nickname, calendar_start_day')
    .eq('id', user.id)
    .single()

  const nickname      = profile?.nickname ?? '사용자'
  const startDay      = ((profile as { calendar_start_day?: number } | null)?.calendar_start_day ?? 1) as 0 | 1

  const now2 = new Date(now)
  const dow  = now2.getDay() // 0=Sun ... 6=Sat
  const weekStart = new Date(now2)
  if (startDay === 1) {
    weekStart.setDate(now2.getDate() - (dow === 0 ? 6 : dow - 1))
  } else {
    weekStart.setDate(now2.getDate() - dow)
  }
  const dayNames = startDay === 1
    ? ['월', '화', '수', '목', '금', '토', '일']
    : ['일', '월', '화', '수', '목', '금', '토']

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    const isSat = startDay === 1 ? i === 5 : i === 6
    const isSun = startDay === 1 ? i === 6 : i === 0
    return {
      dayName: dayNames[i],
      date: d.getDate(),
      dateStr: d.toISOString().split('T')[0],
      isToday: d.toDateString() === now.toDateString(),
      tone: (isSat ? 'saturday' : isSun ? 'holiday' : 'weekday') as 'weekday' | 'saturday' | 'holiday',
    }
  })

  const weekStartStr = weekDays[0].dateStr
  const weekEndStr   = weekDays[6].dateStr
  const month = now.getMonth() + 1

  const { data: weekSchedules } = await supabase
    .from('schedule')
    .select('id, title, date')
    .eq('user_id', user.id)
    .gte('date', weekStartStr)
    .lte('date', weekEndStr)
    .order('date')

  const schedulesByDate = new Map<string, { id: string; title: string }[]>()
  weekSchedules?.forEach(s => {
    if (!schedulesByDate.has(s.date)) schedulesByDate.set(s.date, [])
    schedulesByDate.get(s.date)!.push(s)
  })

  return (
    <BoardShell theme={theme} font={font} basePath="/week">
      <div className="board-v2-content-row">
        <DashboardSidebar userId={user.id} />
      </div>

      <section className="board-v2-window">
        <div className="board-v2-window-bar">
          <nav className="board-v2-tabs" aria-label="메인 탭">
            <a className="is-active" href={boardHref('/week',     theme, font)}>일주일</a>
            <a                       href={boardHref('/schedule', theme, font)}>일정</a>
            <a                       href={boardHref('/habit',    theme, font)}>습관</a>
            <a                       href={boardHref('/expense',  theme, font)}>지출</a>
            <a                       href={boardHref('/memo',     theme, font)}>메모</a>
          </nav>
        </div>
        <div className="board-v2-window-body">
          <PlusMenu />
          <header className="board-v2-page-title">
            <span>이번 주</span>
            <h1>{nickname}의 {month}월 일정</h1>
          </header>

          <WeekDayStrip weekDays={weekDays} />

          {weekSchedules && weekSchedules.length > 0 ? (
            <div className="board-v2-list compact">
              {weekDays.flatMap(item => {
                const items = schedulesByDate.get(item.dateStr) ?? []
                return items.map(s => (
                  <article key={s.id} className={`${item.isToday ? 'is-active ' : ''}is-${item.tone}`}>
                    <div>
                      <span>{item.dayName}</span>
                      <strong>{item.date}</strong>
                    </div>
                    <p>{s.title}</p>
                  </article>
                ))
              })}
            </div>
          ) : (
            <p className="board-v2-coming-soon">이번 주 일정이 없어요 · + 로 추가해보세요</p>
          )}
        </div>
      </section>
    </BoardShell>
  )
}
