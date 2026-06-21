import Link from 'next/link'
import { boardHref, type BoardFont, type BoardTheme } from '@/components/BoardShell'

type Props = {
  scheduleCount: number
  habitPercent: number
  walletNet: number
  theme: BoardTheme
  font: BoardFont
}

function signedMoney(value: number) {
  const abs = Math.abs(value).toLocaleString()
  if (value > 0) return `+${abs}원`
  if (value < 0) return `-${abs}원`
  return '0원'
}

export default function SummaryCards({
  scheduleCount,
  habitPercent,
  walletNet,
  theme,
  font,
}: Props) {
  return (
    <div className="board-v2-summary-cards">
      <Link className="board-v2-summary-card" href={boardHref('/schedule', theme, font)}>
        <span>오늘 일정</span>
        <strong>{scheduleCount}개</strong>
      </Link>
      <Link className="board-v2-summary-card" href={boardHref('/habit', theme, font)}>
        <span>이번 주 습관</span>
        <strong>{habitPercent}%</strong>
      </Link>
      <Link className="board-v2-summary-card" href={boardHref('/expense', theme, font)}>
        <span>오늘 지갑</span>
        <strong>{signedMoney(walletNet)}</strong>
      </Link>
    </div>
  )
}
