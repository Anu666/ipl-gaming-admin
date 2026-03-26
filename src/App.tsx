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

  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentUser(null)
      return
    }
    setUserLoading(true)
    api.users.getMe()
      .then(setCurrentUser)
      .catch(() => {
        // Invalid or expired API key — force re-authentication
        clearApiKey()
        setIsAuthenticated(false)
      })
      .finally(() => setUserLoading(false))
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
