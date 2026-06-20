'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Schedule } from '@/types'

// ─── 날짜 유틸 ────────────────────────────────────────────────────────────────

function getMonday(base: Date, offsetWeeks: number): Date {
  const d = new Date(base)
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay()
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow) + offsetWeeks * 7)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0]
}

function isSameDay(a: Date, b: Date): boolean {
  return toDateStr(a) === toDateStr(b)
}

function getWeekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
  const firstMondayOffset = firstDay.getDay() === 0 ? 1 : 8 - firstDay.getDay()
  const firstMonday = new Date(date.getFullYear(), date.getMonth(), 1 + firstMondayOffset)

  if (date < firstMonday) return 1
  return Math.floor((date.getDate() - firstMonday.getDate()) / 7) + 2
}

function getWeekName(n: number): string {
  return ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째'][n - 1] ?? `${n}번째`
}

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const DAY_KO = ['월', '화', '수', '목', '금', '토', '일']

const DAY_CHIPS = [
  { bg: 'rgba(132, 132, 132, 0.12)', selectedBg: 'rgba(132, 132, 132, 0.18)', text: '#77736f' },
  { bg: 'rgba(132, 132, 132, 0.12)', selectedBg: 'rgba(132, 132, 132, 0.18)', text: '#77736f' },
  { bg: 'rgba(132, 132, 132, 0.12)', selectedBg: 'rgba(132, 132, 132, 0.18)', text: '#77736f' },
  { bg: 'rgba(132, 132, 132, 0.12)', selectedBg: 'rgba(132, 132, 132, 0.18)', text: '#77736f' },
  { bg: 'rgba(132, 132, 132, 0.12)', selectedBg: 'rgba(132, 132, 132, 0.18)', text: '#77736f' },
  { bg: 'rgba(155, 218, 199, 0.24)', selectedBg: 'rgba(155, 218, 199, 0.34)', text: '#65766f' },
  { bg: 'rgba(230, 126, 134, 0.18)', selectedBg: 'rgba(230, 126, 134, 0.26)', text: '#8a6969' },
]

const MENU_ITEMS = [
  { id: 'schedule', label: '일정', symbol: '🗓', angle: 182, bg: '#fde8e8', text: '#a03030' },
  { id: 'memo',     label: '메모', symbol: '✏️', angle: 218, bg: '#ede8fd', text: '#5030a0' },
  { id: 'habit',    label: '습관', symbol: '✓',  angle: 252, bg: '#e4fdf0', text: '#207050' },
  { id: 'expense',  label: '지출', symbol: '💳', angle: 286, bg: '#fffae0', text: '#807000' },
] as const

function polarXY(angleDeg: number, r = 82) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: Math.cos(rad) * r, y: -Math.sin(rad) * r }
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

type Props = { nickname: string }

export default function WeekView({ nickname }: Props) {
  const today = new Date()

  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState<Date>(today)
  const [menuOpen, setMenuOpen] = useState(false)
  const [widgetOpen, setWidgetOpen] = useState(false)
  const [calendarActionDate, setCalendarActionDate] = useState<Date | null>(null)
  const [quickAddType, setQuickAddType] = useState<(typeof MENU_ITEMS)[number]['id'] | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])

  const monday = getMonday(today, weekOffset)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const isCurrentWeek = weekOffset === 0
  const displayName = nickname || '체리'
  const weekOfMonth = getWeekOfMonth(monday)
  const weekLabel = `${monday.getMonth() + 1}월 ${getWeekName(weekOfMonth)} 주`
  const calendarStart = getMonday(new Date(monday.getFullYear(), monday.getMonth(), 1), 0)
  const calendarDays = Array.from({ length: 35 }, (_, i) => addDays(calendarStart, i))

  useEffect(() => {
    const mon = getMonday(new Date(), weekOffset)
    const start = toDateStr(mon)
    const end = toDateStr(addDays(mon, 6))
    createClient()
      .from('schedule')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('sort_order')
      .then(({ data }) => setSchedules(data ?? []))
  }, [weekOffset])

  return (
    <>
      {/* ── 헤더 ─────────────────────────────────────────────────────── */}
      <header style={{
        position: 'relative',
        background: 'rgba(255,253,248,0.92)',
        borderBottom: '0.5px dashed var(--border)',
        padding: '20px 88px 14px 88px',
      }}>
        <button
          onClick={() => {
            setWidgetOpen(v => !v)
            setCalendarActionDate(null)
            setQuickAddType(null)
          }}
          style={{
            position: 'absolute',
            left: '34px',
            top: '24px',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            border: '0.5px solid rgba(132, 91, 92, 0.22)',
            background: 'rgba(255,255,255,0.86)',
            color: '#8f7b79',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 3px 10px rgba(93,65,59,0.08)',
          }}
          aria-label="프로필 위젯 열기"
        >
          {displayName.slice(0, 1)}
        </button>

        {widgetOpen && (
          <div style={{
            position: 'absolute',
            top: '62px',
            left: '26px',
            width: '218px',
            zIndex: 70,
            border: '0.5px solid rgba(132, 91, 92, 0.16)',
            borderRadius: '12px',
            background: 'rgba(255, 252, 250, 0.96)',
            boxShadow: '0 16px 34px rgba(93,65,59,0.16)',
            padding: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f7c3c8, #f5dfd5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8a6969',
                fontWeight: 700,
              }}>
                {displayName.slice(0, 1)}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {displayName}
                </p>
                <button style={{
                  marginTop: '4px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  padding: 0,
                  cursor: 'pointer',
                }}>
                  내 프로필 확인
                </button>
              </div>
            </div>

            <div style={{ borderTop: '0.5px dashed var(--border)', paddingTop: '10px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                {monday.getMonth() + 1}월 캘린더
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', fontSize: '10px', color: 'var(--text-muted)' }}>
                {DAY_KO.map(day => <span key={day} style={{ textAlign: 'center' }}>{day}</span>)}
                {calendarDays.map(day => {
                  const inMonth = day.getMonth() === monday.getMonth()
                  const inWeek = day >= weekDays[0] && day <= weekDays[6]
                  return (
                    <button
                      key={toDateStr(day)}
                      onClick={() => {
                        setSelectedDay(day)
                        setCalendarActionDate(day)
                        setQuickAddType(null)
                      }}
                      style={{
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        border: 'none',
                        background: inWeek ? 'rgba(233,155,162,0.22)' : 'transparent',
                        color: inMonth ? 'var(--text-secondary)' : 'rgba(184,168,152,0.45)',
                        fontWeight: isSameDay(day, today) ? 700 : 400,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {day.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>

            {calendarActionDate && (
              <div style={{
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: '0.5px dashed var(--border)',
              }}>
                <p style={{ margin: '0 0 8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {calendarActionDate.getMonth() + 1}.{calendarActionDate.getDate()}에 추가
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  {MENU_ITEMS.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setQuickAddType(item.id)
                      }}
                      style={{
                        border: `0.5px solid ${item.text}24`,
                        borderRadius: '8px',
                        background: item.bg,
                        color: item.text,
                        padding: '7px 6px',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {calendarActionDate && quickAddType && (
              <div style={{
                marginTop: '8px',
                border: '0.5px solid var(--border)',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.72)',
                padding: '8px',
              }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                }}>
                  {MENU_ITEMS.find(item => item.id === quickAddType)?.label} 내용
                </label>
                <textarea
                  placeholder="내용을 적어주세요"
                  rows={2}
                  style={{
                    width: '100%',
                    resize: 'vertical',
                    border: '0.5px solid var(--border)',
                    borderRadius: '8px',
                    background: 'var(--paper)',
                    color: 'var(--text-primary)',
                    padding: '8px',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  style={{
                    marginTop: '7px',
                    width: '100%',
                    border: 'none',
                    borderRadius: '8px',
                    background: 'var(--accent)',
                    color: '#fff',
                    padding: '7px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  임시 추가
                </button>
              </div>
            )}
          </div>
        )}

        {/* 주 이동 */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
          <button onClick={() => setWeekOffset(o => o - 1)} style={navBtnStyle}>‹</button>
          <div style={{
            flex: 1, textAlign: 'center',
            color: 'var(--text-primary)',
          }}>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              {displayName}의 이번 주
            </p>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {weekLabel}
            </p>
          </div>
          <button onClick={() => setWeekOffset(o => o + 1)} style={navBtnStyle}>›</button>
        </div>

        {/* 파스텔 요일 컬러칩 */}
        <div style={{
          display: 'flex',
          gap: '5px',
          justifyContent: 'center',
          padding: '10px',
          border: '0.5px solid var(--border)',
          borderRadius: '10px',
          background: 'rgba(255,250,240,0.72)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.8) inset',
        }}>
          {weekDays.map((date, i) => {
            const isToday = isCurrentWeek && isSameDay(date, today)
            const isSelected = isSameDay(date, selectedDay)
            const chip = DAY_CHIPS[i]
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(date)}
                style={{
                  width: '32px', height: '32px',
                  borderRadius: '50%',
                  background: chip.bg,
                  border: isToday
                    ? '1.5px solid rgba(120, 114, 108, 0.34)'
                    : isSelected
                      ? '1.5px solid rgba(120, 114, 108, 0.28)'
                      : '1.5px solid transparent',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.12s',
                  transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: '8px', fontWeight: 500, color: '#77736f', lineHeight: 1 }}>
                  {DAY_KO[i]}
                </span>
                <span style={{
                  fontSize: '13px', lineHeight: 1,
                  fontWeight: isToday ? 600 : 400,
                  color: '#77736f',
                  fontFamily: 'var(--font-handwriting)',
                }}>
                  {date.getDate()}
                </span>
              </button>
            )
          })}
        </div>
      </header>

      {/* ── 요일 목록 ──────────────────────────────────────────────────── */}
      <main style={{ padding: '6px 0 88px' }}>
        {weekDays.map((date, i) => {
          const isToday    = isSameDay(date, today)
          const isSelected = isSameDay(date, selectedDay)
          const isWeekend  = i >= 5
          const daySched   = schedules.filter(s => s.date === toDateStr(date))
          const chip       = DAY_CHIPS[i]

          return (
            <button
              key={i}
              onClick={() => setSelectedDay(date)}
              style={{
                width: '100%', textAlign: 'left',
                background: isSelected ? chip.selectedBg : 'transparent',
                borderLeft: isSelected ? `3px solid ${chip.text}` : '3px solid transparent',
                borderRight: 'none', borderTop: 'none',
                borderBottom: i < 6 ? '0.5px dashed rgba(83,64,42,0.13)' : 'none',
                padding: '15px 20px 15px 24px',
                cursor: 'pointer',
                minHeight: '68px',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>

                {/* 요일 + 날짜 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '26px' }}>
                  <span style={{
                    fontSize: '10px', fontWeight: 500, lineHeight: 1,
                    color: isToday ? 'var(--accent)' : isWeekend ? '#c09080' : 'var(--text-muted)',
                  }}>
                    {DAY_KO[i]}
                  </span>
                  <span style={{
                    fontSize: '20px', lineHeight: 1.1,
                    fontWeight: isToday ? 600 : 400,
                    color: isToday ? 'var(--accent)' : 'var(--text-primary)',
                    fontFamily: 'var(--font-handwriting)',
                  }}>
                    {date.getDate()}
                  </span>
                  {isToday && (
                    <div style={{
                      width: '4px', height: '4px', borderRadius: '50%',
                      background: 'var(--accent)', marginTop: '2px',
                    }} />
                  )}
                </div>

                {/* 일정 목록 / 빈 날 안내 */}
                <div style={{
                  flex: 1, display: 'flex', flexWrap: 'wrap', gap: '4px',
                  alignItems: 'center', paddingTop: '4px',
                }}>
                  {daySched.length === 0 ? (
                    <span style={{
                      fontSize: '12px',
                      color: isToday ? 'var(--text-secondary)' : 'var(--text-muted)',
                      fontStyle: 'italic',
                    }}>
                      {isToday ? '오늘의 기록을 남겨보세요' : '기록 없는 날'}
                    </span>
                  ) : (
                    daySched.map(s => (
                      <span key={s.id} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                      background: 'var(--bg)',
                      border: '0.5px solid var(--border)',
                        borderRadius: '999px',
                        padding: '4px 8px',
                        fontSize: '12px', color: 'var(--text-primary)',
                        boxShadow: '0 1px 0 rgba(255,255,255,0.8) inset',
                      }}>
                        {s.use_check && (
                          <span style={{ fontSize: '10px', color: s.is_done ? 'var(--accent)' : 'var(--text-muted)' }}>
                            {s.is_done ? '✓' : '○'}
                          </span>
                        )}
                        {s.time && (
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {s.time.slice(0, 5)}
                          </span>
                        )}
                        {s.title}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </main>

      {/* ── 메뉴 백드롭 ──────────────────────────────────────────────── */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 39, background: 'rgba(44,34,24,0.08)' }}
        />
      )}

      {/* ── FAB + 방사형 메뉴 ─────────────────────────────────────────── */}
      <div style={{ position: 'absolute', top: '36px', right: '34px', zIndex: 80 }}>

        {MENU_ITEMS.map((item, idx) => {
          const { x, y } = polarXY(item.angle)
          return (
            <button
              key={item.id}
              onClick={() => setMenuOpen(false)}
              style={{
                position: 'absolute',
                width: '48px', height: '48px',
                left: '-24px', top: '-24px',
                borderRadius: '12px',
                background: item.bg,
                border: `1.5px solid ${item.text}30`,
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '1px',
                transform: menuOpen
                  ? `translate(${x}px, ${y}px) scale(1)`
                  : `translate(0px, 0px) scale(0)`,
                opacity: menuOpen ? 1 : 0,
                transition: menuOpen
                  ? [
                      `transform 0.28s cubic-bezier(.34,1.7,.64,1) ${idx * 45}ms`,
                      `opacity 0.18s ease ${idx * 35}ms`,
                    ].join(', ')
                  : 'transform 0.15s ease, opacity 0.12s ease',
                pointerEvents: menuOpen ? 'auto' : 'none',
              }}
            >
              <span style={{ fontSize: '16px', lineHeight: 1 }}>{item.symbol}</span>
              <span style={{ fontSize: '9px', fontWeight: 500, marginTop: '1px', color: item.text }}>
                {item.label}
              </span>
            </button>
          )
        })}

        <button
          onClick={() => setMenuOpen(v => !v)}
          style={{
            position: 'absolute',
            width: '34px', height: '34px',
            left: '-17px', top: '-17px',
            borderRadius: '50%',
            background: menuOpen ? '#8f7b79' : '#f1a1a8',
            border: '2px solid rgba(255,255,255,0.88)',
            color: '#ffffff',
            fontSize: '21px', fontWeight: 300, lineHeight: 1,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.25s ease, background 0.2s ease',
            transform: menuOpen ? 'rotate(45deg)' : 'rotate(0deg)',
            boxShadow: '0 4px 12px rgba(143,87,93,0.22)',
          }}
        >
          +
        </button>
      </div>
    </>
  )
}

const navBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '22px',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  padding: '4px 10px',
  lineHeight: 1,
}
