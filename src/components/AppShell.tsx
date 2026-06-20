import type { ReactNode } from 'react'
import Link from 'next/link'

export type AppPage = 'week' | 'habit' | 'expense'

const TABS = [
  { href: '/week',    page: 'week'    as const, label: '이번 주' },
  { href: '/habit',   page: 'habit'   as const, label: '습관'    },
  { href: '/expense', page: 'expense' as const, label: '지출'    },
]

export default function AppShell({ children, activePage }: { children: ReactNode; activePage: AppPage }) {
  return (
    <div className="diary-desktop">
      <div className="diary-window">
        <div className="diary-window-bar" aria-hidden="true">
          <span />
          <span />
          <span />
          <div className="diary-address">localhost:3000 / record stacking</div>
        </div>

        <div className="diary-binder">
          <section className="diary-page">
            <div className="diary-page-content">
              {children}
            </div>
          </section>

          <nav className="diary-tab-rail" aria-label="기록 탭">
          {TABS.map(tab => {
            const isActive = tab.page === activePage
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`diary-side-tab diary-side-tab-${tab.page}${isActive ? ' is-active' : ''}`}
              >
                {tab.label}
              </Link>
            )
          })}
          </nav>
        </div>
      </div>
    </div>
  )
}
