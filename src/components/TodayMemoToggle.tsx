'use client'

import { useState } from 'react'
import Link from 'next/link'
import { boardHref, type BoardFont, type BoardTheme } from '@/components/BoardShell'
import { compactDate } from '@/lib/date-labels'
import AddButton from '@/components/AddButton'
import SummaryCards from '@/components/SummaryCards'

type Memo = { id: string; date: string; text: string | null }

type Props = {
  scheduleCount: number
  habitPercent?: number
  walletNet?: number
  habitCheckCount?: number
  walletCount?: number
  memos: Memo[]
  todayLabel?: string
  theme: BoardTheme
  font: BoardFont
}

export default function TodayMemoToggle({
  scheduleCount,
  habitPercent,
  walletNet,
  habitCheckCount,
  walletCount,
  memos,
  theme,
  font,
}: Props) {
  const [view, setView] = useState<'today' | 'memo'>('today')

  return (
    <section className="board-v2-mini-card board-v2-top-card board-v2-today-memo">
      <div className="board-v2-mini-toggle">
        <button
          type="button"
          className={view === 'today' ? 'is-active' : ''}
          onClick={() => setView('today')}
        >
          오늘
        </button>
        <button
          type="button"
          className={view === 'memo' ? 'is-active' : ''}
          onClick={() => setView('memo')}
        >
          메모
        </button>
      </div>

      {view === 'today' ? (
        <SummaryCards
          scheduleCount={scheduleCount}
          habitPercent={habitPercent ?? habitCheckCount ?? 0}
          walletNet={walletNet ?? walletCount ?? 0}
          theme={theme}
          font={font}
        />
      ) : (
        <div className="board-v2-mini-memo-list">
          {memos.length > 0 ? memos.map(memo => (
            <Link key={memo.id} href={`${boardHref('/memo', theme, font)}#memo-${memo.id}`}>
              <span>{compactDate(memo.date)}</span>
              {memo.text || '빈 메모'}
            </Link>
          )) : (
            <p>아직 메모가 없어요.</p>
          )}
          <div className="board-v2-mini-memo-add-wrap">
            <AddButton type="메모" label="메모 추가" />
          </div>
        </div>
      )}
    </section>
  )
}
