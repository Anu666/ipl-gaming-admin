import type { Page } from '../lib/types'

interface Props {
  onNavigate: (page: Page) => void
}

const STATS = [
  { label: 'Matches', value: '—', sub: 'Total scheduled' },
  { label: 'Users', value: '—', sub: 'Registered players' },
  { label: 'Questions', value: '—', sub: 'Across all matches' },
  { label: 'Transactions', value: '—', sub: 'Credit events' },
]

const QUICK_LINKS: { page: Page; icon: string; title: string; sub: string }[] = [
  { page: 'matches', icon: '🏏', title: 'Manage Matches', sub: 'Create, edit, and delete matches' },
  { page: 'questions', icon: '❓', title: 'Manage Questions', sub: 'Set questions and correct options' },
  { page: 'users', icon: '👤', title: 'Manage Users', sub: 'View and update user accounts' },
  { page: 'transactions', icon: '💳', title: 'Transactions', sub: 'Review credit changes' },
]

export function HomePage({ onNavigate }: Props) {
  return (
    <div className="page-content">
      {/* Welcome banner */}
      <div className="welcome-banner" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="welcome-heading">IPL GAMING ADMIN</h1>
          <p className="welcome-sub">Manage matches, questions, users, and scoring from one place.</p>
        </div>
        <div className="welcome-badge">Season 2026</div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        {STATS.map((s) => (
          <div className="stat-card" key={s.label}>
            <p className="stat-label">{s.label}</p>
            <p className="stat-value">{s.value}</p>
            <p className="stat-sub">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="panel">
        <p className="panel-title">Quick Actions</p>
        <p className="subtle">Jump to a section to get started</p>

        <div className="quick-grid">
          {QUICK_LINKS.map(({ page, icon, title, sub }) => (
            <button
              key={page}
              type="button"
              className="quick-card"
              onClick={() => onNavigate(page)}
            >
              <span className="quick-icon" aria-hidden="true">{icon}</span>
              <div>
                <p className="quick-card-title">{title}</p>
                <p className="quick-card-sub">{sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
