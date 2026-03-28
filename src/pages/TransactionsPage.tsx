import { useState, useEffect } from 'react'
import matchesJson from '../assets/json/matches.json'
import { api } from '../lib/api'
import type { User, Transaction, TransactionWithUser } from '../lib/types'
import {
  TransactionType,
  TransactionStatus,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_STATUS_LABELS,
} from '../lib/types'

// ── Local match shape (only what we need) ─────────────────────────────────────
interface MatchItem {
  id: string
  matchName: string
  matchDate: string
  firstBattingTeamCode: string
  secondBattingTeamCode: string
}

const matches = matchesJson as MatchItem[]

type FilterMode = 'user' | 'match'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDateTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function typeBadgeClass(type: TransactionType): string {
  switch (type) {
    case TransactionType.Deposit:         return 'badge-active'
    case TransactionType.Withdrawal:      return 'badge-inactive'
    case TransactionType.MatchSettlement: return 'badge-admin'
    case TransactionType.AdminOverride:   return 'badge-superadmin'
    default:                              return ''
  }
}

function statusBadgeClass(status: TransactionStatus): string {
  return status === TransactionStatus.Completed ? 'badge-active' : 'badge-player'
}

// ── Component ─────────────────────────────────────────────────────────────────
export function TransactionsPage() {
  const [mode, setMode] = useState<FilterMode>('user')

  // Users
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  // Results
  const [rows, setRows] = useState<(Transaction | TransactionWithUser)[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedMatchId, setSelectedMatchId] = useState<string>('')

  // Build a lookup map: matchId → matchName
  const matchMap = new Map(matches.map(m => [m.id, `${m.firstBattingTeamCode} vs ${m.secondBattingTeamCode}`]))

  // Load users once
  useEffect(() => {
    setUsersLoading(true)
    api.users.getAll()
      .then(setUsers)
      .catch(() => {/* silently fail – dropdown stays empty */})
      .finally(() => setUsersLoading(false))
  }, [])

  // Reset results when mode changes
  useEffect(() => {
    setRows([])
    setError(null)
    setSelectedUserId('')
    setSelectedMatchId('')
  }, [mode])

  // Load by user
  useEffect(() => {
    if (mode !== 'user' || !selectedUserId) return
    setLoading(true)
    setError(null)
    api.transactions.getByUser(selectedUserId)
      .then(data => setRows([...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load transactions'))
      .finally(() => setLoading(false))
  }, [selectedUserId, mode])

  // Load by match
  useEffect(() => {
    if (mode !== 'match' || !selectedMatchId) return
    setLoading(true)
    setError(null)
    api.transactions.getByMatch(selectedMatchId)
      .then(data => setRows([...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load transactions'))
      .finally(() => setLoading(false))
  }, [selectedMatchId, mode])

  const hasData = rows.length > 0
  const noSelection = mode === 'user' ? !selectedUserId : !selectedMatchId

  return (
    <div className="page-content">
      {/* Toolbar */}
      <div className="page-toolbar">
        <div>
          <h2 className="panel-title">Transactions</h2>
          <p className="subtle">
            {hasData ? `${rows.length} transaction${rows.length !== 1 ? 's' : ''}` : 'Select a filter to view transactions'}
          </p>
        </div>
      </div>

      {/* Filter panel */}
      <div className="panel" style={{ marginBottom: '1.25rem' }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            type="button"
            className={mode === 'user' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setMode('user')}
          >
            By User
          </button>
          <button
            type="button"
            className={mode === 'match' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setMode('match')}
          >
            By Match
          </button>
        </div>

        {/* Selector */}
        {mode === 'user' ? (
          <div className="form-group" style={{ maxWidth: '420px' }}>
            <label className="form-label" htmlFor="user-select">User</label>
            <select
              id="user-select"
              className="form-control"
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              disabled={usersLoading}
            >
              <option value="">
                {usersLoading ? 'Loading users…' : '— Select a user —'}
              </option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            {selectedUserId && (() => {
              const u = users.find(u => u.id === selectedUserId)
              return u ? (
                <p style={{ marginTop: '0.5rem', fontSize: '0.88rem' }}>
                  Current balance: <span style={{ color: 'var(--sun)', fontWeight: 600, fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>{u.credits.toFixed(2)} cr</span>
                </p>
              ) : null
            })()}
          </div>
        ) : (
          <div className="form-group" style={{ maxWidth: '420px' }}>
            <label className="form-label" htmlFor="match-select">Match</label>
            <select
              id="match-select"
              className="form-control"
              value={selectedMatchId}
              onChange={e => setSelectedMatchId(e.target.value)}
            >
              <option value="">— Select a match —</option>
              {matches.map(m => (
                <option key={m.id} value={m.id}>
                  {m.firstBattingTeamCode} vs {m.secondBattingTeamCode} — {new Date(m.matchDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Results */}
      {noSelection && !loading && (
        <div className="panel">
          <p className="subtle" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            Select a {mode === 'user' ? 'user' : 'match'} above to view transactions.
          </p>
        </div>
      )}

      {loading && (
        <div className="panel">
          <p className="subtle" style={{ textAlign: 'center', padding: '1.5rem 0' }}>Loading…</p>
        </div>
      )}

      {error !== null && (
        <div className="panel">
          <p style={{ color: 'var(--rose)', fontSize: '0.88rem' }}>{error}</p>
        </div>
      )}

      {!loading && !noSelection && !error && (
        <div className="panel">
          {rows.length === 0 ? (
            <p className="subtle" style={{ textAlign: 'center', padding: '1.5rem 0' }}>No transactions found.</p>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date &amp; Time</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    {mode === 'user' && <th>Match</th>}
                    {mode === 'match' && <th>User</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(t => {
                    const isPositive = t.overallCreditChange >= 0
                    const amountColor = isPositive ? 'var(--mint)' : 'var(--rose)'
                    const amountPrefix = isPositive ? '+' : ''
                    const matchLabel = t.matchId ? (matchMap.get(t.matchId) ?? t.matchId.slice(0, 8) + '…') : '—'
                    const userName = 'userName' in t ? (t as TransactionWithUser).userName : null

                    return (
                      <tr key={t.id}>
                        <td style={{ opacity: 0.75 }}>{formatDateTime(t.createdAt)}</td>
                        <td>
                          <span className={`badge ${typeBadgeClass(t.type)}`}>
                            {TRANSACTION_TYPE_LABELS[t.type]}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: amountColor, fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>
                          {amountPrefix}{t.overallCreditChange.toFixed(2)}
                        </td>
                        <td>
                          <span className={`badge ${statusBadgeClass(t.status)}`}>
                            {TRANSACTION_STATUS_LABELS[t.status]}
                          </span>
                        </td>
                        {mode === 'user' && <td style={{ opacity: 0.7 }}>{matchLabel}</td>}
                        {mode === 'match' && <td style={{ opacity: 0.85 }}>{userName ?? '—'}</td>}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
