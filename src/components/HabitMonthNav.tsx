'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  year: number
  month: number
  prevHref: string
  nextHref: string
  basePath: string
}

export default function HabitMonthNav({ year, month, prevHref, nextHref, basePath }: Props) {
  const [jumpOpen, setJumpOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const pad = (n: number) => String(n).padStart(2, '0')
  const currentMonthStr = `${year}-${pad(month)}`

  function handleJump(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value  // "YYYY-MM"
    if (!val) return
    const sep = basePath.includes('?') ? '&' : '?'
    router.push(`${basePath}${sep}view=month&week=${val}-01`)
    setJumpOpen(false)
  }

  return (
    <nav className="board-v2-week-arrow-nav" aria-label="습관 월 이동">
      <a href={prevHref} aria-label="지난 달">&lt;</a>
      <div className="board-v2-week-arrow-nav-center">
        <span>{year}.{pad(month)}</span>
        <button
          type="button"
          className="board-v2-week-diary-jump-btn"
          onClick={() => { setJumpOpen(v => !v); setTimeout(() => inputRef.current?.showPicker?.(), 50) }}
          aria-label="월 선택"
        >▾</button>
        {jumpOpen && (
          <input
            ref={inputRef}
            type="month"
            className="board-v2-week-diary-jump-input"
            defaultValue={currentMonthStr}
            onChange={handleJump}
            onBlur={() => setJumpOpen(false)}
            autoFocus
          />
        )}
      </div>
      <a href={nextHref} aria-label="다음 달">&gt;</a>
    </nav>
  )
}
