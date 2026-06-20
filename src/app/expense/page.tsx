import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BoardShell, { resolveTheme, resolveFont, boardHref } from '@/components/BoardShell'
import AddButton from '@/components/AddButton'
import DashboardSidebar from '@/components/DashboardSidebar'

export default async function ExpensePage({
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

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  const { data: todayExpenses } = await supabase
    .from('expense')
    .select('id, title, amount')
    .eq('user_id', user.id)
    .eq('date', todayStr)
    .order('created_at', { ascending: false })

  const todayTotal = todayExpenses?.reduce((s, e) => s + e.amount, 0) ?? 0

  return (
    <BoardShell theme={theme} font={font} basePath="/expense">
      <div className="board-v2-content-row">
        <DashboardSidebar userId={user.id} />
      </div>

      <section className="board-v2-window">
        <div className="board-v2-window-bar">
          <nav className="board-v2-tabs" aria-label="메인 탭">
            <a                       href={boardHref('/week',     theme, font)}>일주일</a>
            <a                       href={boardHref('/schedule', theme, font)}>일정</a>
            <a                       href={boardHref('/habit',    theme, font)}>습관</a>
            <a className="is-active" href={boardHref('/expense',  theme, font)}>지출</a>
            <a                       href={boardHref('/memo',     theme, font)}>메모</a>
          </nav>
        </div>
        <div className="board-v2-window-body">
          <header className="board-v2-page-title">
            <span>지출 관리</span>
            <h1>오늘 총 지출 {todayTotal.toLocaleString()}원</h1>
          </header>
          <AddButton type="지출" label="지출 기록" />
          {todayExpenses && todayExpenses.length > 0 ? (
            <ul className="board-v2-expense-list">
              {todayExpenses.map(e => (
                <li key={e.id}>
                  <span>{e.title}</span>
                  <strong>{e.amount.toLocaleString()}원</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="board-v2-coming-soon">오늘 지출이 없어요 · 위 버튼으로 추가해보세요</p>
          )}
        </div>
      </section>
    </BoardShell>
  )
}
