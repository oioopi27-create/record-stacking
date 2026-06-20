import type { MoodLevel } from '@/app/actions/entries'

const DOW_MON = ['월', '화', '수', '목', '금', '토', '일']
const DOW_SUN = ['일', '월', '화', '수', '목', '금', '토']

const MOOD_EMOJI: Record<MoodLevel, string> = { good: '😊', calm: '😌', tired: '😮‍💨', sad: '😔' }
const MOOD_LABELS: { key: MoodLevel; label: string }[] = [
  { key: 'good', label: 'GOOD' }, { key: 'calm', label: 'CALM' },
  { key: 'tired', label: 'TIRED' }, { key: 'sad', label: 'SAD' },
]

type Props = {
  habits: { id: string; name: string }[]
  checks: { habit_id: string; date: string }[]
  moods: { date: string; mood: MoodLevel }[]
  year: number
  month: number
  startDay: 0 | 1
}

const pad = (n: number) => String(n).padStart(2, '0')

export default function HabitMonthView({ habits, checks, moods, year, month, startDay }: Props) {
  const DOW = startDay === 1 ? DOW_MON : DOW_SUN
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDow    = new Date(year, month - 1, 1).getDay()
  const startOffset = startDay === 1 ? (firstDow + 6) % 7 : firstDow

  const habitCount = habits.length

  // date → checked habit count
  const checksByDate = new Map<string, number>()
  checks.forEach(c => checksByDate.set(c.date, (checksByDate.get(c.date) ?? 0) + 1))

  // date → mood
  const moodByDate = new Map<string, MoodLevel>()
  moods.forEach(m => moodByDate.set(m.date, m.mood))

  // mood frequency
  const moodCounts: Record<MoodLevel, number> = { good: 0, calm: 0, tired: 0, sad: 0 }
  moods.forEach(m => { moodCounts[m.mood]++ })

  const todayStr = new Date().toISOString().split('T')[0]

  // calendar cells: null = padding, number = day
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="board-v2-habit-month">

      {/* 기분 요약 */}
      <div className="board-v2-habit-month-mood">
        <span className="board-v2-label">이번 달 기분</span>
        <div className="board-v2-habit-month-pills">
          {MOOD_LABELS.map(({ key, label }) => moodCounts[key] > 0 && (
            <span key={key} className="board-v2-habit-month-pill">
              {MOOD_EMOJI[key]}
              <span className="board-v2-habit-month-pill-label">{label}</span>
              <strong>{moodCounts[key]}</strong>
            </span>
          ))}
          {moods.length === 0 && (
            <span className="board-v2-habit-month-empty">기록 없음</span>
          )}
        </div>
      </div>

      {/* 달력 그리드 */}
      <div className="board-v2-habit-month-cal">
        {DOW.map((d, i) => {
          const isSat = startDay === 1 ? i === 5 : i === 6
          const isSun = startDay === 1 ? i === 6 : i === 0
          return (
            <div key={d} className={`board-v2-habit-month-dow${isSat ? ' is-sat' : ''}${isSun ? ' is-sun' : ''}`}>{d}</div>
          )
        })}
        {cells.map((day, i) => {
          if (day === null) return <div key={`pad-${i}`} />
          const dateStr = `${year}-${pad(month)}-${pad(day)}`
          const checked  = checksByDate.get(dateStr) ?? 0
          const mood     = moodByDate.get(dateStr)
          const isToday  = dateStr === todayStr
          const colIdx   = (startOffset + day - 1) % 7
          const isSat    = startDay === 1 ? colIdx === 5 : colIdx === 6
          const isSun    = startDay === 1 ? colIdx === 6 : colIdx === 0
          const rate     = habitCount > 0 ? checked / habitCount : -1
          const lvl      = rate < 0 ? '' : rate === 0 ? '' : rate >= 1 ? ' is-full' : ' is-partial'
          return (
            <div
              key={dateStr}
              className={`board-v2-habit-month-cell${lvl}${isToday ? ' is-today' : ''}${isSat ? ' is-sat' : ''}${isSun ? ' is-sun' : ''}`}
            >
              <span className="board-v2-habit-month-num">{day}</span>
              {mood && <span className="board-v2-habit-month-emoji">{MOOD_EMOJI[mood]}</span>}
            </div>
          )
        })}
      </div>

      {/* 습관별 완료율 */}
      {habits.length > 0 && (
        <div className="board-v2-habit-month-summary">
          <span className="board-v2-label">이번 달 습관</span>
          {habits.map(h => {
            const cnt = checks.filter(c => c.habit_id === h.id).length
            const pct = Math.round((cnt / daysInMonth) * 100)
            return (
              <div key={h.id} className="board-v2-habit-month-row">
                <span className="board-v2-habit-month-name">{h.name}</span>
                <div className="board-v2-habit-month-bar-wrap">
                  <div className="board-v2-habit-month-bar" style={{ width: `${pct}%` }} />
                </div>
                <span className="board-v2-habit-month-count">{cnt}/{daysInMonth}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
