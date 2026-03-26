import { useState } from 'react'
import './App.css'
import { ApiKeyGate } from './components/ApiKeyGate'
import { SideNav } from './components/SideNav'
import { TopBar } from './components/TopBar'
import { getApiKey, clearApiKey } from './lib/api'
import type { Page } from './lib/types'
import { HomePage } from './pages/HomePage'

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

  const handleLogout = () => {
    clearApiKey()
    setIsAuthenticated(false)
  }

  if (!isAuthenticated) {
    return (
      <div className="app-shell gate-shell">
        <ApiKeyGate onAuthenticated={() => setIsAuthenticated(true)} />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="admin-layout">
        <SideNav current={currentPage} onNavigate={setCurrentPage} />

        <div className="main-content">
          <TopBar pageName={PAGE_LABELS[currentPage]} onLogout={handleLogout} />

          {currentPage === 'home' && <HomePage onNavigate={setCurrentPage} />}
          {currentPage === 'matches' && (
            <div className="page-content">
              <div className="panel"><p className="panel-title">Matches</p><p className="subtle">Coming soon</p></div>
            </div>
          )}
          {currentPage === 'questions' && (
            <div className="page-content">
              <div className="panel"><p className="panel-title">Questions</p><p className="subtle">Coming soon</p></div>
            </div>
          )}
          {currentPage === 'users' && (
            <div className="page-content">
              <div className="panel"><p className="panel-title">Users</p><p className="subtle">Coming soon</p></div>
            </div>
          )}
          {currentPage === 'transactions' && (
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
