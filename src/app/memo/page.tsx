import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BoardShell, { resolveTheme, resolveFont, boardHref } from '@/components/BoardShell'
import AddButton from '@/components/AddButton'
import DashboardSidebar from '@/components/DashboardSidebar'

export default async function MemoPage({
  searchParams,
}: {
  searchParams?: Promise<{ theme?: string; font?: string }>
}) {
  const params = await searchParams
  const theme = resolveTheme(params)
  const font = resolveFont(params)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memos } = await supabase
    .from('memo_card')
    .select('id, date, text')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <BoardShell theme={theme} font={font} basePath="/memo">
      <div className="board-v2-content-row">
        <DashboardSidebar userId={user.id} />
      </div>

      <section className="board-v2-window">
        <div className="board-v2-window-bar">
          <nav className="board-v2-tabs" aria-label="메인 탭">
            <a                       href={boardHref('/week',     theme, font)}>일주일</a>
            <a                       href={boardHref('/schedule', theme, font)}>일정</a>
            <a                       href={boardHref('/habit',    theme, font)}>습관</a>
            <a                       href={boardHref('/expense',  theme, font)}>지출</a>
            <a className="is-active" href={boardHref('/memo',     theme, font)}>메모</a>
          </nav>
        </div>
        <div className="board-v2-window-body">
          <header className="board-v2-page-title">
            <span>메모란</span>
            <h1>나의 기록</h1>
          </header>
          <AddButton type="메모" label="메모 등록" />
          {memos && memos.length > 0 ? (
            <div className="board-v2-memo-feed">
              {memos.map(m => (
                <div key={m.id} className="board-v2-memo-card">
                  <span className="board-v2-memo-date">{m.date}</span>
                  <p className="board-v2-memo-text">{m.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="board-v2-coming-soon">위 버튼으로 첫 메모를 남겨보세요</p>
          )}
        </div>
      </section>
    </BoardShell>
  )
}
