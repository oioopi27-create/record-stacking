import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BoardShell, { resolveTheme, resolveFont, boardHref } from '@/components/BoardShell'
import HeaderBar from '@/components/HeaderBar'
import BottomNav from '@/components/BottomNav'
import AddButton from '@/components/AddButton'
import MemoList from '@/components/MemoList'

type ProfilePrefs = {
  theme?: string | null
  font?: string | null
  nickname?: string | null
  diary_name?: string | null
  avatar_url?: string | null
  calendar_start_day?: number | null
}

export default async function MemoPage({
  searchParams,
}: {
  searchParams?: Promise<{ theme?: string; font?: string; date?: string }>
}) {
  const params = await searchParams
  const selectedDate = params?.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : undefined

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: memos }] = await Promise.all([
    supabase.from('users').select('theme, font, nickname, diary_name, avatar_url, calendar_start_day').eq('id', user.id).single(),
    supabase
      .from('memo_card')
      .select('id, date, text')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const profilePrefs = profile as ProfilePrefs | null
  const theme = resolveTheme(params, profilePrefs?.theme)
  const font = resolveFont(params, profilePrefs?.font)
  const calendarStartDay = ((profilePrefs?.calendar_start_day ?? 1) as 0 | 1)

  return (
    <BoardShell theme={theme} font={font} headerSlot={
      <HeaderBar
        userId={user.id} theme={theme} font={font} basePath="/memo"
        nickname={profilePrefs?.nickname}
        diaryName={profilePrefs?.diary_name}
        avatarUrl={profilePrefs?.avatar_url}
        calendarStartDay={calendarStartDay}
      />
    }>
      <div className="board-v2-main">
      <section className="board-v2-window">
        <div className="board-v2-window-body">
          <div className="board-v2-window-heading-row">
            <a href={boardHref('/memo', theme, font)} className="board-v2-tab-heading">메모</a>
            <AddButton type="메모" label="메모 추가" defaultDate={selectedDate} />
          </div>
          {memos && memos.length > 0 ? (
            <MemoList memos={memos} />
          ) : (
            <p className="board-v2-coming-soon">+ 버튼으로 첫 메모를 남겨보세요.</p>
          )}
        </div>
      </section>
      <BottomNav theme={theme} font={font} />
      </div>
    </BoardShell>
  )
}
