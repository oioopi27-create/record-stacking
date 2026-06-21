import type { ReactNode } from 'react'
import Link from 'next/link'

export const themes = ['white', 'beige', 'pastel-pink', 'black'] as const
export const fonts = ['gothic', 'memoment', 'kyobo'] as const
export type BoardTheme = (typeof themes)[number]
export type BoardFont = (typeof fonts)[number]

export function resolveTheme(params?: { theme?: string }, fallback?: string | null): BoardTheme {
  if (themes.includes(params?.theme as BoardTheme)) return params!.theme as BoardTheme
  if (themes.includes(fallback as BoardTheme)) return fallback as BoardTheme
  return 'white'
}

export function resolveFont(params?: { font?: string }, fallback?: string | null): BoardFont {
  if (fonts.includes(params?.font as BoardFont)) return params!.font as BoardFont
  if (fonts.includes(fallback as BoardFont)) return fallback as BoardFont
  return 'gothic'
}

export function boardHref(path: string, theme: BoardTheme, font: BoardFont): string {
  const q = new URLSearchParams()
  if (theme !== 'white') q.set('theme', theme)
  if (font !== 'gothic') q.set('font', font)
  const s = q.toString()
  return s ? `${path}?${s}` : path
}

export default function BoardShell({
  children,
  theme,
  font,
  headerSlot,
}: {
  children: ReactNode
  theme: BoardTheme
  font: BoardFont
  headerSlot?: ReactNode
}) {
  return (
    <main className={`board-v2-shell board-v2-theme-${theme} board-v2-font-${font}`} data-theme={theme}>
      {headerSlot ?? (
        <header className="board-v2-topbar">
          <Link href="/" className="board-v2-logo" aria-label="기록 들이기">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={theme === 'black' ? '/logo_b.png' : '/logo.png'} alt="기록 들이기" className="board-v2-logo-img" />
          </Link>
        </header>
      )}
      {children}
    </main>
  )
}
