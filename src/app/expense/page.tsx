import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BoardShell, { resolveTheme, resolveFont } from '@/components/BoardShell'
import HeaderBar from '@/components/HeaderBar'
import BottomNav from '@/components/BottomNav'
import AddButton from '@/components/AddButton'
import HabitDateNav from '@/components/HabitDateNav'
import { weekOfMonthLabel } from '@/lib/date-labels'

type ProfilePrefs = {
  theme?: string | null
  font?: string | null
  nickname?: string | null
  diary_name?: string | null
  avatar_url?: string | null
  calendar_start_day?: number | null
}

export default async function ExpensePage({
  searchParams,
}: {
  searchParams?: Promise<{ theme?: string; font?: string; week?: string; date?: string; filter?: string }>
}) {
  const params = await searchParams
  const filterParam = params?.filter === 'income' ? 'income' : params?.filter === 'expense' ? 'expense' : null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const selectedDate = params?.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : undefined
  const requested = params?.week ? new Date(`${params.week}T00:00:00`) : selectedDate ? new Date(`${selectedDate}T00:00:00`) : null
  const anchor = requested && !Number.isNaN(requested.getTime()) ? requested : now
  const pad = (n: number) => String(n).padStart(2, '0')
  const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const dow = anchor.getDay()
  const weekStart = new Date(anchor)
  weekStart.setDate(anchor.getDate() - (dow === 0 ? 6 : dow - 1))
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekStartStr = toDateStr(weekStart)
  const weekEndStr = toDateStr(weekEnd)
  const weekLabel = weekOfMonthLabel(weekStart)

  let expenseQuery = supabase
    .from('expense')
    .select('id, title, amount, date, entry_type, category_id, payment_method_id')
    .eq('user_id', user.id)
    .gte('date', weekStartStr)
    .lte('date', weekEndStr)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (filterParam) expenseQuery = expenseQuery.eq('entry_type', filterParam)

  const [
    { data: profile },
    [{ data: expenses }, { data: allExpenses }, { data: expenseCats }, { data: payMethods }],
  ] = await Promise.all([
    supabase.from('users').select('theme, font, nickname, diary_name, avatar_url, calendar_start_day').eq('id', user.id).single(),
    Promise.all([
      expenseQuery,
      supabase.from('expense').select('amount, entry_type').eq('user_id', user.id).gte('date', weekStartStr).lte('date', weekEndStr),
      supabase.from('expense_category').select('id, name, color').eq('user_id', user.id),
      supabase.from('payment_method').select('id, name, color').eq('user_id', user.id),
    ]),
  ])

  const profilePrefs = profile as ProfilePrefs | null
  const theme = resolveTheme(params, profilePrefs?.theme)
  const font = resolveFont(params, profilePrefs?.font)
  const calendarStartDay = ((profilePrefs?.calendar_start_day ?? 1) as 0 | 1)

  function walletWeekHref(opts?: { week?: string; filter?: string | null }) {
    const q = new URLSearchParams()
    if (theme !== 'white') q.set('theme', theme)
    if (font !== 'gothic') q.set('font', font)
    if (opts?.week) q.set('week', opts.week)
    if (opts?.filter) q.set('filter', opts.filter)
    const s = q.toString()
    return s ? `/expense?${s}` : '/expense'
  }

  const navDate = (diff: number) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + diff)
    return toDateStr(d)
  }

  function expenseBasePath() {
    const q = new URLSearchParams()
    if (theme !== 'white') q.set('theme', theme)
    if (font !== 'gothic') q.set('font', font)
    if (filterParam) q.set('filter', filterParam)
    const s = q.toString()
    return s ? `/expense?${s}` : '/expense'
  }

  const allRows = (allExpenses ?? []) as { amount: number; entry_type?: 'income' | 'expense' | null }[]
  const incomeTotal = allRows.filter(row => row.entry_type === 'income').reduce((sum, row) => sum + row.amount, 0)
  const expenseTotal = allRows.filter(row => row.entry_type !== 'income').reduce((sum, row) => sum + row.amount, 0)
  const walletRows = (expenses ?? []) as { id: string; title: string; amount: number; date: string; entry_type?: 'income' | 'expense' | null; category_id?: string | null; payment_method_id?: string | null }[]
  const catMap = Object.fromEntries((expenseCats ?? []).map(c => [c.id, c as { id: string; name: string; color: string | null }]))
  const methodMap = Object.fromEntries((payMethods ?? []).map(m => [m.id, m as { id: string; name: string; color: string | null }]))

  return (
    <BoardShell theme={theme} font={font} headerSlot={
      <HeaderBar
        userId={user.id} theme={theme} font={font} basePath="/expense"
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
            <a href={walletWeekHref({})} className="board-v2-tab-heading">지갑</a>
            <AddButton type="지출" label="기록" defaultDate={selectedDate} />
          </div>
          <HabitDateNav
            weekLabel={weekLabel}
            weekStart={weekStartStr}
            prevHref={walletWeekHref({ week: navDate(-7), filter: filterParam })}
            nextHref={walletWeekHref({ week: navDate(7), filter: filterParam })}
            basePath={expenseBasePath()}
          />
          <div className="board-v2-wallet-total">
            <a href={walletWeekHref({ week: params?.week, filter: null })} className={`board-v2-wallet-filter-btn${!filterParam ? ' is-active' : ''}`}>
              전체
            </a>
            <a
              href={walletWeekHref({ week: params?.week, filter: filterParam === 'income' ? null : 'income' })}
              className={`board-v2-wallet-filter-btn is-income${filterParam === 'income' ? ' is-active' : ''}`}
            >
              수입 +{incomeTotal.toLocaleString()}원
            </a>
            <a
              href={walletWeekHref({ week: params?.week, filter: filterParam === 'expense' ? null : 'expense' })}
              className={`board-v2-wallet-filter-btn is-expense${filterParam === 'expense' ? ' is-active' : ''}`}
            >
              지출 -{expenseTotal.toLocaleString()}원
            </a>
          </div>
          {walletRows.length > 0 ? (
            <ul className="board-v2-expense-list">
              {walletRows.map(row => {
                const cat = row.category_id ? catMap[row.category_id] : null
                const method = row.payment_method_id ? methodMap[row.payment_method_id] : null
                return (
                  <li key={row.id} className={row.entry_type === 'income' ? 'is-income' : 'is-expense'}>
                    <div className="board-v2-expense-li-main">
                      <span>{row.title}</span>
                      {(cat || method) && (
                        <div className="board-v2-expense-li-chips">
                          {cat && (
                            <span
                              className="board-v2-expense-li-chip"
                              style={{ '--c': cat.color ?? 'var(--board-chip)' } as React.CSSProperties}
                            >{cat.name}</span>
                          )}
                          {method && (
                            <span className="board-v2-expense-li-chip board-v2-expense-li-chip-method"
                              style={{ '--c': method.color ?? 'var(--board-chip)' } as React.CSSProperties}
                            >{method.name}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <strong>{row.entry_type === 'income' ? '+' : '-'}{row.amount.toLocaleString()}원</strong>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="board-v2-coming-soon">
              {filterParam === 'income'
                ? '이번 주 수입 기록이 없어요.'
                : filterParam === 'expense'
                  ? '이번 주 지출 기록이 없어요.'
                  : '이번 주 지갑 기록이 없어요. + 버튼으로 추가해보세요.'}
            </p>
          )}
        </div>
      </section>
      <BottomNav theme={theme} font={font} />
      </div>
    </BoardShell>
  )
}
