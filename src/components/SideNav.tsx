import type { Page } from '../lib/types'

interface NavItem {
  page: Page
  label: string
  icon: string
  superAdminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { page: 'home', label: 'Dashboard', icon: '⊞' },
  { page: 'matches', label: 'Matches', icon: '🏏' },
  { page: 'questions', label: 'Templates', icon: '❓' },
  { page: 'match-questions', label: 'Questions', icon: '📝' },
  { page: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  { page: 'users', label: 'Users', icon: '👤', superAdminOnly: true },
  { page: 'transactions', label: 'Transactions', icon: '💳', superAdminOnly: true },
]

interface Props {
  current: Page
  onNavigate: (page: Page) => void
  isSuperAdmin: boolean
}

export function SideNav({ current, onNavigate, isSuperAdmin }: Props) {
  const visibleItems = NAV_ITEMS.filter(item => !item.superAdminOnly || isSuperAdmin)

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-head">
          <p className="sidebar-eyebrow">IPL Gaming</p>
          <p className="sidebar-title">Admin</p>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {visibleItems.map(({ page, label, icon }) => (
            <button
              key={page}
              type="button"
              className={`sidebar-link${current === page ? ' active' : ''}`}
              onClick={() => onNavigate(page)}
              aria-current={current === page ? 'page' : undefined}
            >
              <span className="sidebar-link-icon" aria-hidden="true">{icon}</span>
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {visibleItems.map(({ page, label, icon }) => (
          <button
            key={page}
            type="button"
            className={`bottom-nav-item${current === page ? ' active' : ''}`}
            onClick={() => onNavigate(page)}
            aria-current={current === page ? 'page' : undefined}
          >
            <span className="bottom-nav-icon" aria-hidden="true">{icon}</span>
            <span className="bottom-nav-label">{label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}

