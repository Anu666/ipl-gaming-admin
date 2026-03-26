import { useState, useEffect } from 'react'
import './App.css'
import { ApiKeyGate } from './components/ApiKeyGate'
import { SideNav } from './components/SideNav'
import { TopBar } from './components/TopBar'
import { getApiKey, clearApiKey, api } from './lib/api'
import type { Page, User } from './lib/types'
import { UserRole } from './lib/types'
import { HomePage } from './pages/HomePage'
import { UsersPage } from './pages/UsersPage'

const PAGE_LABELS: Record<Page, string> = {
  home: 'Dashboard',
  matches: 'Matches',
  questions: 'Questions',
  users: 'Users',
  transactions: 'Transactions',
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getApiKey())
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userLoading, setUserLoading] = useState(false)
  const [userError, setUserError] = useState<string | null>(null)

  const fetchMe = () => {
    if (!isAuthenticated) return
    setUserLoading(true)
    setUserError(null)
    api.users.getMe()
      .then(user => { setCurrentUser(user); setUserError(null) })
      .catch((err: unknown) => {
        const is401 = err instanceof Error && err.message.startsWith('[401]')
        if (is401) {
          clearApiKey()
          setIsAuthenticated(false)
        } else {
          const msg = err instanceof Error ? err.message : 'Unknown error'
          setUserError(msg)
        }
      })
      .finally(() => setUserLoading(false))
  }

  useEffect(() => {
    setCurrentUser(null)
    setUserError(null)
    fetchMe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const handleLogout = () => {
    clearApiKey()
    setCurrentUser(null)
    setIsAuthenticated(false)
  }

  if (!isAuthenticated) {
    return (
      <div className="app-shell gate-shell">
        <ApiKeyGate onAuthenticated={() => setIsAuthenticated(true)} />
      </div>
    )
  }

  if (userLoading) {
    return (
      <div className="app-shell gate-shell">
        <p style={{ opacity: 0.6 }}>Verifying credentials…</p>
      </div>
    )
  }

  if (userError !== null) {
    return (
      <div className="app-shell gate-shell">
        <div className="gate-card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</p>
          <h2 className="gate-title" style={{ fontSize: '1.4rem' }}>Something went wrong</h2>
          <p className="gate-subtitle" style={{ marginBottom: '1.5rem', color: 'var(--rose)', fontSize: '0.85rem', wordBreak: 'break-all' }}>
            {userError}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={fetchMe} type="button">
              Retry
            </button>
            <button className="btn-primary" onClick={() => window.location.reload()} type="button">
              Refresh page
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isSuperAdmin = currentUser?.role === UserRole.SuperAdmin

  // Redirect away from Users page if role drops
  const safePage: Page = currentPage === 'users' && !isSuperAdmin ? 'home' : currentPage

  return (
    <div className="app-shell">
      <div className="admin-layout">
        <SideNav current={safePage} onNavigate={setCurrentPage} isSuperAdmin={isSuperAdmin} />

        <div className="main-content">
          <TopBar
            pageName={PAGE_LABELS[safePage]}
            onLogout={handleLogout}
            userName={currentUser?.name}
            userRole={currentUser?.role}
          />

          {safePage === 'home' && <HomePage onNavigate={setCurrentPage} />}
          {safePage === 'users' && isSuperAdmin && <UsersPage />}
          {safePage === 'matches' && (
            <div className="page-content">
              <div className="panel"><p className="panel-title">Matches</p><p className="subtle">Coming soon</p></div>
            </div>
          )}
          {safePage === 'questions' && (
            <div className="page-content">
              <div className="panel"><p className="panel-title">Questions</p><p className="subtle">Coming soon</p></div>
            </div>
          )}
          {safePage === 'transactions' && (
            <div className="page-content">
              <div className="panel"><p className="panel-title">Transactions</p><p className="subtle">Coming soon</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
