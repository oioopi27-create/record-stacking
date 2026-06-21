import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BoardShell, { resolveFont, resolveTheme } from '@/components/BoardShell'
import HeaderBar from '@/components/HeaderBar'
import MainCalendar, { type CalendarDayRecord } from '@/components/MainCalendar'
import TodayMemoToggle from '@/components/TodayMemoToggle'
import BottomNav from '@/components/BottomNav'

type ProfilePrefs = {
  calendar_start_day?: number | null
  theme?: string | null
  font?: string | null
  nickname?: string | null
  diary_name?: string | null
  avatar_url?: string | null
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export default async function WeekPage({
  searchParams,
}: {
  searchParams?: Promise<{ theme?: string; font?: string; month?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const requestedMonth = params?.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : null
  const anchor = requestedMonth ? new Date(`${requestedMonth}-01T00:00:00`) : now
  const year = anchor.getFullYear()
  const month = anchor.getMonth() + 1
  const todayStr = dateKey(now)
  const monthStart = `${year}-${pad(month)}-01`
  const monthEnd = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`

  const [
    { data: profile },
    { count: scheduleCount },
    { data: todayExpenses },
    { data: monthSchedules },
    { data: monthExpenses },
    { data: monthMemos },
    { data: recentMemos },
    { data: userHabits },
  ] = await Promise.all([
    supabase.from('users').select('calendar_start_day, theme, font, nickname, diary_name, avatar_url').eq('id', user.id).single(),
    supabase.from('schedule').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('date', todayStr),
    supabase.from('expense').select('amount, entry_type').eq('user_id', user.id).eq('date', todayStr),
    supabase.from('schedule').select('date, color, title').eq('user_id', user.id).gte('date', monthStart).lte('date', monthEnd),
    supabase.from('expense').select('date, title, amount, entry_type').eq('user_id', user.id).gte('date', monthStart).lte('date', monthEnd),
    supabase.from('memo_card').select('date, text').eq('user_id', user.id).gte('date', monthStart).lte('date', monthEnd),
    supabase
      .from('memo_card')
      .select('id, date, text')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('habit').select('id').eq('user_id', user.id),
  ])

  const profilePrefs = profile as ProfilePrefs | null
  const theme = resolveTheme(params, profilePrefs?.theme)
  const font = resolveFont(params, profilePrefs?.font)
  const startDay = ((profilePrefs?.calendar_start_day ?? 1) as 0 | 1)

  const dayOfWeek = now.getDay()
  const weekStartDate = new Date(now)
  if (startDay === 1) weekStartDate.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  else weekStartDate.setDate(now.getDate() - dayOfWeek)
  const weekEndDate = new Date(weekStartDate)
  weekEndDate.setDate(weekStartDate.getDate() + 6)
  const weekStart = dateKey(weekStartDate)
  const weekEnd = dateKey(weekEndDate)

  const habitIds = userHabits?.map(habit => habit.id) ?? []
  let weekHabitCheckCount = 0
  let monthHabitChecks: { date: string; habit?: { name?: string | null } | null }[] = []
  if (habitIds.length > 0) {
    const [{ count }, { data }] = await Promise.all([
      supabase
      .from('habit_check')
      .select('id', { count: 'exact', head: true })
      .in('habit_id', habitIds)
      .gte('date', weekStart)
      .lte('date', weekEnd)
      .eq('is_checked', true),
      supabase
        .from('habit_check')
        .select('date, habit(name)')
        .in('habit_id', habitIds)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .eq('is_checked', true),
    ])
    weekHabitCheckCount = count ?? 0
    monthHabitChecks = (data ?? []) as { date: string; habit?: { name?: string | null } | null }[]
  }
  const habitTotalSlots = habitIds.length * 7
  const habitPercent = habitTotalSlots > 0
    ? Math.round((weekHabitCheckCount / habitTotalSlots) * 100)
    : 0
  const walletNet = (todayExpenses ?? []).reduce((sum, row) => {
    const amount = Number(row.amount ?? 0)
    return row.entry_type === 'income' ? sum + amount : sum - amount
  }, 0)

  const calendarEvents = (monthSchedules ?? []).map(schedule => ({
    day: parseInt(schedule.date.slice(-2), 10),
    color: schedule.color as string | null,
  }))
  const recordMap = new Map<string, CalendarDayRecord>()
  const ensureRecord = (date: string) => {
    if (!recordMap.has(date)) {
      recordMap.set(date, { date, schedules: [], habits: [], expenses: [], memos: [] })
    }
    return recordMap.get(date)!
  }

  ;(monthSchedules ?? []).forEach(schedule => {
    ensureRecord(schedule.date).schedules.push(schedule.title ?? '일정')
  })
  ;(monthHabitChecks ?? []).forEach(check => {
    ensureRecord(check.date).habits.push(check.habit?.name ?? '습관 체크')
  })
  ;(monthExpenses ?? []).forEach(expense => {
    ensureRecord(expense.date).expenses.push({
      title: expense.title ?? '지갑 기록',
      amount: Number(expense.amount ?? 0),
      entryType: (expense.entry_type ?? 'expense') as 'income' | 'expense' | null,
    })
  })
  ;(monthMemos ?? []).forEach(memo => {
    ensureRecord(memo.date).memos.push(memo.text ?? '빈 메모')
  })
  const calendarRecords = Array.from(recordMap.values())

  return (
    <BoardShell
      theme={theme}
      font={font}
      headerSlot={
        <HeaderBar
          userId={user.id} theme={theme} font={font} basePath="/week"
          nickname={profilePrefs?.nickname}
          diaryName={profilePrefs?.diary_name}
          avatarUrl={profilePrefs?.avatar_url}
          calendarStartDay={startDay}
        />
      }
    >
      <div className="board-v2-main board-v2-main--home">
        <MainCalendar
          year={year}
          month={month}
          todayDate={todayStr}
          startDay={startDay}
          events={calendarEvents}
          records={calendarRecords}
        />
        <TodayMemoToggle
          scheduleCount={scheduleCount ?? 0}
          habitPercent={habitPercent}
          walletNet={walletNet}
          memos={recentMemos ?? []}
          theme={theme}
          font={font}
        />
        <BottomNav theme={theme} font={font} />
      </div>
    </BoardShell>
  )
}
