'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveMood, type MoodLevel } from '@/app/actions/entries'

type WeekDay = { dayName: string; dateStr: string; isToday: boolean }

type Props = {
  moods: { date: string; mood: MoodLevel }[]
  weekDays: WeekDay[]
}

const MOOD_LEVELS: { key: MoodLevel; label: string; emoji: string }[] = [
  { key: 'good',  label: 'GOOD',  emoji: '😊' },
  { key: 'calm',  label: 'CALM',  emoji: '😌' },
  { key: 'tired', label: 'TIRED', emoji: '😮‍💨' },
  { key: 'sad',   label: 'SAD',   emoji: '😔' },
]

const MOOD_IDX: Record<MoodLevel, number> = { good: 0, calm: 1, tired: 2, sad: 3 }

// Smaller SVG coordinate constants
const W = 360, H = 104
const PL = 60, PR = 0, PT = 12, PB = 32
const CW = W - PL - PR   // 278
const CH = H - PT - PB   // 60

const colW = CW / 7
const gx = (i: number) => PL + (i + 0.5) * colW
const gy = (mi: number) => PT + (mi / 3) * CH

export default function MoodChart({ moods, weekDays }: Props) {
  const [states, setStates] = useState<Map<string, MoodLevel>>(() => {
    const m = new Map<string, MoodLevel>()
    moods.forEach(r => m.set(r.date, r.mood))
    return m
  })
  const [selecting, setSelecting] = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const router = useRouter()

  async function handleSelect(dateStr: string, mood: MoodLevel) {
    setSaving(true)
    setStates(prev => new Map(prev).set(dateStr, mood))
    setSelecting(null)
    await saveMood(dateStr, mood)
    setSaving(false)
    router.refresh()
  }

  const pts = weekDays.map((d, i) => {
    const m = states.get(d.dateStr)
    return m ? { x: gx(i), y: gy(MOOD_IDX[m]), date: d.dateStr } : null
  }).filter(Boolean) as { x: number; y: number; date: string }[]

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  return (
    <div className="board-v2-mood-wrap">
      <p className="board-v2-mood-title">
        MOOD TRACKER
        <span className="board-v2-mood-hint">날짜 클릭 후 기분 선택</span>
      </p>
      <div className="board-v2-mood-chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="board-v2-mood-svg">
          {/* today column background */}
          {weekDays.map((d, i) => d.isToday && (
            <rect key={d.dateStr} x={gx(i) - colW / 2} y={PT} width={colW} height={CH}
              className="board-v2-mood-today-col" style={{ pointerEvents: 'none' }} />
          ))}

          {/* selected column highlight */}
          {selecting && weekDays.map((d, i) => d.dateStr === selecting && (
            <rect key={`sel-${d.dateStr}`} x={gx(i) - colW / 2} y={PT - 4} width={colW} height={CH + 8}
              className="board-v2-mood-selected-col" style={{ pointerEvents: 'none' }} />
          ))}

          {/* grid lines + Y labels */}
          {MOOD_LEVELS.map((m, i) => (
            <g key={m.key}>
              <line x1={gx(0) - colW / 2} y1={gy(i)} x2={W - PR} y2={gy(i)} className="board-v2-mood-grid" />
              <text x={gx(0) - colW / 2 - 6} y={gy(i) + 3} textAnchor="end" className="board-v2-mood-label">{m.label}</text>
            </g>
          ))}

          {/* mood polyline */}
          {pts.length > 1 && <polyline points={polyline} fill="none" className="board-v2-mood-line" />}

          {/* dots */}
          {pts.map(p => <circle key={p.date} cx={p.x} cy={p.y} r={4} className="board-v2-mood-dot" />)}

          {/* clickable day columns + two-line X labels (dayName + date number) */}
          {weekDays.map((d, i) => {
            const dateNum = d.dateStr.slice(-2).replace(/^0/, '')
            const isToday = d.isToday
            return (
              <g key={d.dateStr} style={{ cursor: saving ? 'not-allowed' : 'pointer' }}
                onClick={() => !saving && setSelecting(d.dateStr)}>
                <rect x={gx(i) - colW / 2} y={PT} width={colW} height={CH} fill="transparent" />
                <text x={gx(i)} y={H - 18} textAnchor="middle"
                  className={`board-v2-mood-day${isToday ? ' is-today' : ''}`}>
                  {d.dayName}
                </text>
                <text x={gx(i)} y={H - 5} textAnchor="middle"
                  className={`board-v2-mood-date-num${isToday ? ' is-today' : ''}`}>
                  {dateNum}
                </text>
              </g>
            )
          })}
        </svg>

        {selecting && (
          <div className="board-v2-mood-selector">
            {MOOD_LEVELS.map(m => (
              <button key={m.key} type="button"
                className={`board-v2-mood-btn${states.get(selecting) === m.key ? ' is-active' : ''}`}
                onClick={() => handleSelect(selecting, m.key)}>
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
            <button type="button" className="board-v2-mood-cancel" onClick={() => setSelecting(null)}>✕</button>
          </div>
        )}
      </div>
    </div>
  )
}
