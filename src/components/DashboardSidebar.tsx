import { createClient } from '@/lib/supabase/server'
import ProfileCard from '@/components/ProfileCard'
import CalendarGrid from '@/components/CalendarGrid'
import TodayMemoToggle from '@/components/TodayMemoToggle'
import { CalendarStartDayProvider } from '@/context/CalendarStartDayContext'
import { boardHref, type BoardFont, type BoardTheme } from '@/components/BoardShell'

type Props = {
  userId: string
  theme: BoardTheme
  font: BoardFont
  basePath: string
}

type ProfileRow = {
  nickname?: string | null
  diary_name?: string | null
  avatar_url?: string | null
  calendar_start_day?: number | null
}

export default async function DashboardSidebar({ userId, theme, font, basePath }: Props) {
  const supabase = await createClient()
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const todayNum = now.getDate()
  const todayStr = `${year}-${pad(month)}-${pad(todayNum)}`
  const monthStart = `${year}-${pad(month)}-01`
  const monthEnd = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`

  const dow = now.getDay()
  const weekStartDate = new Date(now)
  weekStartDate.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
  const weekEndDate = new Date(weekStartDate)
  weekEndDate.setDate(weekStartDate.getDate() + 6)
  const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const weekStart = dateStr(weekStartDate)
  const weekEnd = dateStr(weekEndDate)

  const [
    { data: profile },
    { data: userHabits },
    { count: scheduleCount },
    { data: todayExpenses },
    { data: todaySchedules },
    { data: weekSchedules },
    { data: monthScheduleCards },
    { data: monthSchedules },
    { data: recentMemos },
    { data: membership },
  ] = await Promise.all([
    supabase.from('users').select('nickname, diary_name, avatar_url, calendar_start_day').eq('id', userId).single(),
    supabase.from('habit').select('id, name').eq('user_id', userId).order('created_at').limit(3),
    supabase.from('schedule').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('date', todayStr),
    supabase.from('expense').select('title, amount, entry_type').eq('user_id', userId).eq('date', todayStr).limit(8),
    supabase.from('schedule').select('id, title').eq('user_id', userId).eq('date', todayStr).order('created_at').limit(3),
    supabase.from('schedule').select('id, title').eq('user_id', userId).gte('date', weekStart).lte('date', weekEnd).order('date').limit(3),
    supabase.from('schedule').select('id, title').eq('user_id', userId).gte('date', monthStart).lte('date', monthEnd).order('date').limit(3),
    supabase.from('schedule').select('date, color').eq('user_id', userId).gte('date', monthStart).lte('date', monthEnd),
    supabase.from('memo_card').select('id, date, text').eq('user_id', userId).order('date', { ascending: false }).order('created_at', { ascending: false }).limit(3),
    supabase
      .from('calendar_group_member')
      .select('group_id, calendar_group(id, name, invite_code)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle(),
  ])

  const habitIds = userHabits?.map(habit => habit.id) ?? []
  let habitCheckCount = 0
  if (habitIds.length > 0) {
    const { count } = await supabase
      .from('habit_check')
      .select('id', { count: 'exact', head: true })
      .in('habit_id', habitIds)
      .eq('date', todayStr)
      .eq('is_checked', true)
    habitCheckCount = count ?? 0
  }

  const groupRaw = (membership as { calendar_group?: { id: string; name: string; invite_code: string } | null } | null)?.calendar_group ?? null
  const group = groupRaw ?? null
  let members: { user_id: string; nickname: string | null }[] = []
  if (group) {
    const { data: memberRows } = await supabase
      .from('calendar_group_member')
      .select('user_id, users(nickname)')
      .eq('group_id', group.id)
      .neq('user_id', userId)
    members = (memberRows ?? []).map(member => ({
      user_id: member.user_id,
      nickname: (member as { users?: { nickname?: string } | null }).users?.nickname ?? null,
    }))
  }

  const walletRows = (todayExpenses ?? []) as { title: string; amount: number; entry_type?: 'income' | 'expense' | null }[]
  const incomeTotal = walletRows.filter(row => row.entry_type === 'income').reduce((sum, row) => sum + row.amount, 0)
  const expenseTotal = walletRows.filter(row => row.entry_type !== 'income').reduce((sum, row) => sum + row.amount, 0)
  const scheduleCardItems =
    todaySchedules && todaySchedules.length > 0
      ? { label: '오늘', items: todaySchedules }
      : weekSchedules && weekSchedules.length > 0
        ? { label: '이번 주', items: weekSchedules }
        : { label: '이번 달', items: monthScheduleCards ?? [] }

  const profileRow = profile as ProfileRow | null
  const nickname = profileRow?.nickname ?? '사용자'
  const diaryName = profileRow?.diary_name ?? '기록 들이기'
  const avatarUrl = profileRow?.avatar_url ?? null
  const calendarStartDay = ((profileRow?.calendar_start_day ?? 1) as 0 | 1)
  const calendarEvents = (monthSchedules ?? []).map(schedule => ({
    day: parseInt(schedule.date.slice(-2), 10),
    color: schedule.color as string | null,
  }))

  return (
    <div className="board-v2-sidebar">
      <aside className="board-v2-left">
        <CalendarStartDayProvider initial={calendarStartDay}>
          <ProfileCard
            nickname={nickname}
            diaryName={diaryName}
            avatarUrl={avatarUrl}
            userId={userId}
            calendarStartDay={calendarStartDay}
            group={group}
            members={members}
            theme={theme}
            font={font}
            basePath={basePath}
          />
          <CalendarGrid year={year} month={month} today={todayNum} events={calendarEvents} />
        </CalendarStartDayProvider>
        <TodayMemoToggle
          scheduleCount={scheduleCount ?? 0}
          habitCheckCount={habitCheckCount}
          walletCount={walletRows.length}
          memos={recentMemos ?? []}
          todayLabel={`${month}/${todayNum}`}
          theme={theme}
          font={font}
        />
      </aside>

      <aside className="board-v2-right">
        <section className="board-v2-sticky board-v2-sticky-white">
          <a className="board-v2-sticky-title" href={boardHref('/schedule', theme, font)}>일정</a>
          <a className="board-v2-sticky-body" href={boardHref('/schedule', theme, font)}>
            {scheduleCardItems.items.length > 0
              ? `${scheduleCardItems.label} ${scheduleCardItems.items.map(schedule => schedule.title).join(' · ')}`
              : '오늘 일정을 추가해보세요'}
          </a>
        </section>
        <section className="board-v2-sticky board-v2-sticky-blue">
          <a className="board-v2-sticky-title" href={boardHref('/habit', theme, font)}>습관</a>
          <a className="board-v2-sticky-body board-v2-sticky-habit-body" href={boardHref('/habit', theme, font)}>
            {userHabits && userHabits.length > 0
              ? userHabits.map(habit => (
                  <span key={habit.id} className="board-v2-sticky-habit-item">{habit.name}</span>
                ))
              : '오늘 습관을 체크해보세요'}
          </a>
        </section>
        <section className="board-v2-sticky board-v2-sticky-cream">
          <a className="board-v2-sticky-title" href={boardHref('/expense', theme, font)}>지갑</a>
          <a className="board-v2-wallet-summary board-v2-sticky-body" href={boardHref('/expense', theme, font)}>
            <span><em>오늘의 수입</em><strong>+{incomeTotal.toLocaleString()}원</strong></span>
            <span><em>오늘의 지출</em><strong>-{expenseTotal.toLocaleString()}원</strong></span>
          </a>
        </section>
      </aside>
    </div>
  )
}
