import type { ReactNode } from 'react'

export const themes = ['mono', 'beige', 'pink', 'black'] as const
export const fonts  = ['gothic', 'gangwon', 'kyobo'] as const
export type BoardTheme = (typeof themes)[number]
export type BoardFont  = (typeof fonts)[number]

const themeLabels: Record<BoardTheme, string> = {
  mono: 'Mono', beige: 'Beige', pink: 'Pink', black: 'Black',
}
const themeColors: Record<BoardTheme, string> = {
  mono: '#9a9a9a', beige: '#c8b39d', pink: '#e79aa5', black: '#1e1e1e',
}
const fontLabels: Record<BoardFont, string> = {
  gothic:  '프리텐다드',
  gangwon: '메모먼트꾹꾹',
  kyobo:   '교보손글씨',
}
const fontFamilies: Record<BoardFont, string> = {
  gothic:  '"Pretendard", "Noto Sans KR", sans-serif',
  gangwon: '"MemomentKkukkukk", "Pretendard", sans-serif',
  kyobo:   '"KyoboHandwriting2025lyb", "Pretendard", sans-serif',
}

export function resolveTheme(params?: { theme?: string }): BoardTheme {
  return themes.includes(params?.theme as BoardTheme) ? (params!.theme as BoardTheme) : 'mono'
}
export function resolveFont(params?: { font?: string }): BoardFont {
  return fonts.includes(params?.font as BoardFont) ? (params!.font as BoardFont) : 'gothic'
}

export function boardHref(path: string, theme: BoardTheme, font: BoardFont): string {
  const q = new URLSearchParams()
  if (theme !== 'mono') q.set('theme', theme)
  if (font !== 'gothic') q.set('font', font)
  const s = q.toString()
  return s ? `${path}?${s}` : path
}

export default function BoardShell({
  children,
  theme,
  font,
  basePath,
}: {
  children: ReactNode
  theme: BoardTheme
  font: BoardFont
  basePath: string
}) {
  const themeHref = (t: BoardTheme) => boardHref(basePath, t, font)
  const fontHref  = (f: BoardFont)  => boardHref(basePath, theme, f)

  return (
    <main className={`board-v2-shell board-v2-theme-${theme} board-v2-font-${font}`} data-theme={theme}>
      <header className="board-v2-topbar">
        <a href="/" className="board-v2-logo" aria-label="기록쌓기 홈">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={theme === 'black' ? '/logo_b.png' : '/logo.png'} alt="기록쌓기" className="board-v2-logo-img" />
        </a>
      </header>
      {children}
    </main>
  )
}
