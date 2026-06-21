'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  weekLabel: string
  weekStart: string
  prevHref: string
  nextHref: string
  basePath: string
}

export default function HabitDateNav({ weekLabel, weekStart, prevHref, nextHref, basePath }: Props) {
  const [jumpOpen, setJumpOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleJump(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    if (!val) return
    const picked = new Date(`${val}T00:00:00`)
    if (isNaN(picked.getTime())) return
    const sep = basePath.includes('?') ? '&' : '?'
    router.push(`${basePath}${sep}week=${val}`)
    setJumpOpen(false)
  }

  return (
    <nav className="board-v2-week-arrow-nav" aria-label="습관 주 이동">
      <a href={prevHref} aria-label="지난 주">&lt;</a>
      <div className="board-v2-week-arrow-nav-center">
        <span>{weekLabel}</span>
        <button
          type="button"
          className="board-v2-week-diary-jump-btn"
          onClick={() => { setJumpOpen(v => !v); setTimeout(() => inputRef.current?.showPicker?.(), 50) }}
          aria-label="날짜 선택"
        >
          ▾
        </button>
        {jumpOpen && (
          <input
            ref={inputRef}
            type="date"
            className="board-v2-week-diary-jump-input"
            defaultValue={weekStart}
            onChange={handleJump}
            onBlur={() => setJumpOpen(false)}
            autoFocus
          />
        )}
      </div>
      <a href={nextHref} aria-label="다음 주">&gt;</a>
    </nav>
  )
}
