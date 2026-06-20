import { createClient } from '@/lib/supabase/server'
import ProfileCard from '@/components/ProfileCard'
import CalendarGrid from '@/components/CalendarGrid'
import { CalendarStartDayProvider } from '@/context/CalendarStartDayContext'

type Props = { userId: string }

export default async function DashboardSidebar({ userId }: Props) {
  const supabase = await createClient()
  const now = new Date()
  const year     = now.getFullYear()
  const month    = now.getMonth() + 1
  const todayNum = now.getDate()
  const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(todayNum).padStart(2, '0')}`
  const pad = (n: number) => String(n).padStart(2, '0')
  const monthStart = `${year}-${pad(month)}-01`
  const monthEnd   = `${year}-${pad(month)}-${new Date(year, month, 0).getDate()}`

  const [
    { data: profile },
    { data: userHabits },
    { count: scheduleCount },
    { data: todayExpenses },
    { data: todaySchedules },
    { data: monthSchedules },
    { data: membership },
  ] = await Promise.all([
    supabase.from('users').select('nickname, diary_name, avatar_url, calendar_start_day').eq('id', userId).single(),
    supabase.from('habit').select('id').eq('user_id', userId),
    supabase.from('schedule').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('date', todayStr),
    supabase.from('expense').select('title, amount').eq('user_id', userId).eq('date', todayStr).limit(3),
    supabase.from('schedule').select('id, title').eq('user_id', userId).eq('date', todayStr).order('created_at').limit(3),
    supabase.from('schedule').select('date, color').eq('user_id', userId).gte('date', monthStart).lte('date', monthEnd),
    supabase
      .from('calendar_group_member')
      .select('group_id, calendar_group(id, name, invite_code)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle(),
  ])

  const habitIds = userHabits?.map(h => h.id) ?? []
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
    members = (memberRows ?? []).map(m => ({
      user_id: m.user_id,
      nickname: (m as { users?: { nickname?: string } | null }).users?.nickname ?? null,
    }))
  }

  const expenseTotal = todayExpenses?.reduce((s, e) => s + e.amount, 0) ?? 0
  const nickname    = profile?.nickname ?? '사용자'
  const diaryName   = (profile as { diary_name?: string } | null)?.diary_name ?? '기록 들이기'
  const avatarUrl   = (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null
  const calendarStartDay = ((profile as { calendar_start_day?: number } | null)?.calendar_start_day ?? 1) as 0 | 1

  const calendarEvents = (monthSchedules ?? []).map(s => ({
    day: parseInt(s.date.slice(-2), 10),
    color: s.color as string | null,
  }))

  return (
    <>
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
        />
        <CalendarGrid year={year} month={month} today={todayNum} events={calendarEvents} />
        </CalendarStartDayProvider>
        <section className="board-v2-mini-card board-v2-top-card">
          <span className="board-v2-label">오늘</span>
          <ul className="board-v2-today-list">
            <li><span>일정</span><strong>{scheduleCount ?? 0}개</strong></li>
            <li><span>습관</span><strong>{habitCheckCount}개</strong></li>
            <li><span>지출</span><strong>{todayExpenses?.length ?? 0}건</strong></li>
          </ul>
        </section>
      </aside>

      <aside className="board-v2-right">
        <section className="board-v2-sticky board-v2-sticky-white">
          <span>일정</span>
          <p>
            {todaySchedules && todaySchedules.length > 0
              ? todaySchedules.map(s => s.title).join(' · ')
              : '오늘 일정을 추가해보세요'}
          </p>
        </section>
        <section className="board-v2-sticky board-v2-sticky-blue">
          <span>습관</span>
          <p>{habitCheckCount > 0 ? `오늘 ${habitCheckCount}개 완료` : '오늘 습관을 체크해보세요'}</p>
        </section>
        <section className="board-v2-sticky board-v2-sticky-cream">
          <span>지출</span>
          <p>{expenseTotal > 0 ? `오늘 지출 ${expenseTotal.toLocaleString()}원` : '오늘 지출 없음'}</p>
        </section>
      </aside>
    </>
  )
}
