import Link from 'next/link'
import ProfileCard from '@/components/ProfileCard'
import { CalendarStartDayProvider } from '@/context/CalendarStartDayContext'
import type { BoardFont, BoardTheme } from '@/components/BoardShell'
import type { GroupData } from '@/lib/group'

type Props = {
  userId: string
  theme: BoardTheme
  font: BoardFont
  basePath: string
  nickname?: string | null
  diaryName?: string | null
  avatarUrl?: string | null
  calendarStartDay?: 0 | 1
  group?: GroupData
}

export default function HeaderBar({
  userId, theme, font, basePath,
  nickname: nicknameProp,
  diaryName: diaryNameProp,
  avatarUrl: avatarUrlProp,
  calendarStartDay: calendarStartDayProp,
  group = null,
}: Props) {
  const nickname = nicknameProp ?? '사용자'
  const diaryName = diaryNameProp ?? '기록 들이기'
  const avatarUrl = avatarUrlProp ?? null
  const calendarStartDay = calendarStartDayProp ?? 1
  const members = group?.members ?? []

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
