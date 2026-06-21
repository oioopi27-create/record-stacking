import Link from 'next/link'
import ProfileCard from '@/components/ProfileCard'
import { CalendarStartDayProvider } from '@/context/CalendarStartDayContext'
import { createClient } from '@/lib/supabase/server'
import type { BoardFont, BoardTheme } from '@/components/BoardShell'

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

export default async function HeaderBar({ userId, theme, font, basePath }: Props) {
  const supabase = await createClient()
  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from('users').select('nickname, diary_name, avatar_url, calendar_start_day').eq('id', userId).single(),
    supabase
      .from('calendar_group_member')
      .select('group_id, calendar_group(id, name, invite_code)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle(),
  ])

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

  const profileRow = profile as ProfileRow | null
  const nickname = profileRow?.nickname ?? '사용자'
  const diaryName = profileRow?.diary_name ?? '기록 들이기'
  const avatarUrl = profileRow?.avatar_url ?? null
  const calendarStartDay = ((profileRow?.calendar_start_day ?? 1) as 0 | 1)

  return (
    <header className="board-v2-header">
      <Link href="/week" className="board-v2-logo" aria-label="기록 들이기">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={theme === 'black' ? '/logo_b.png' : '/logo.png'} alt="기록 들이기" className="board-v2-logo-img" />
      </Link>
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
      </CalendarStartDayProvider>
    </header>
  )
}
