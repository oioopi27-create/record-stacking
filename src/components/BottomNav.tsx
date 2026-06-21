'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { boardHref, type BoardFont, type BoardTheme } from '@/components/BoardShell'

const NAV_ITEMS = [
  { href: '/week', label: '홈' },
  { href: '/schedule', label: '일정' },
  { href: '/habit', label: '습관' },
  { href: '/expense', label: '지갑' },
  { href: '/memo', label: '메모' },
]

type Props = {
  theme: BoardTheme
  font: BoardFont
}

export default function BottomNav({ theme, font }: Props) {
  const pathname = usePathname()

  return (
    <nav className="board-v2-bottom-nav" aria-label="메인 메뉴">
      {NAV_ITEMS.map(item => (
        <Link
          key={item.href}
          href={boardHref(item.href, theme, font)}
          className={pathname === item.href ? 'is-active' : ''}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
