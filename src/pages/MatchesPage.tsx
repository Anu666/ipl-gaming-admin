import { useState, useEffect } from 'react'
import matchesJson from '../assets/json/matches.json'
import { api } from '../lib/api'

// Local interface to avoid the casing mismatch between
// the bundled JSON (firstBattingTeamID) and the TS Match type (firstBattingTeamId).
interface MatchItem {
  id: string
  matchDate: string
  matchName: string
  matchTime: string
  gmtMatchTime: string
  firstBattingTeamName: string
  firstBattingTeamCode: string
  secondBattingTeamName: string
  secondBattingTeamCode: string
  groundName: string
  city: string
  matchCommenceStartDate: string
}

type MatchStatus = 'past' | 'current' | 'upcoming'
type FilterTab = 'all' | MatchStatus

function getStatus(match: MatchItem): MatchStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const matchDay = new Date(match.matchDate)
  matchDay.setHours(0, 0, 0, 0)
  if (matchDay < today) return 'past'
  if (matchDay.getTime() === today.getTime()) return 'current'
  return 'upcoming'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm} IST`
}

const TEAM_COLORS: Record<string, string> = {
  CSK:  '#f7d000',
  MI:   '#4da6ff',
  RCB:  '#ff5a5f',
  KKR:  '#c084fc',
  DC:   '#60a5fa',
  PBKS: '#f87171',
  RR:   '#f472b6',
  SRH:  '#fb923c',
  LSG:  '#34d399',
  GT:   '#94a3b8',
}

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'past',     label: 'Past' },
  { key: 'current',  label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
]

function sortByDate(arr: MatchItem[]): MatchItem[] {
  return [...arr].sort(
    (a, b) =>
      new Date(a.matchCommenceStartDate).getTime() -
      new Date(b.matchCommenceStartDate).getTime(),
  )
}

export function MatchesPage() {
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  useEffect(() => {
    const staticData = matchesJson as unknown as MatchItem[]
    if (staticData.length > 0) {
      setMatches(sortByDate(staticData))
      setLoading(false)
    } else {
      // Fallback: fetch from API when JSON is empty
      api.matches.getAll()
        .then(data => setMatches(sortByDate(data as unknown as MatchItem[])))
        .catch(e => setError(e instanceof Error ? e.message : 'Failed to load matches'))
        .finally(() => setLoading(false))
    }
  }, [])

  const counts: Record<FilterTab, number> = {
    all:      matches.length,
    past:     matches.filter(m => getStatus(m) === 'past').length,
    current:  matches.filter(m => getStatus(m) === 'current').length,
    upcoming: matches.filter(m => getStatus(m) === 'upcoming').length,
  }

  const filtered = activeTab === 'all'
    ? matches
    : matches.filter(m => getStatus(m) === activeTab)

  return (
    <div className="page-content">
      <div className="page-toolbar">
        <div>
          <h2 className="matches-page-title">IPL 2026 Matches</h2>
          {!loading && (
            <p className="subtle">{matches.length} matches scheduled</p>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="match-filter-tabs">
        {FILTER_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`match-filter-tab${activeTab === key ? ' active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
            <span className="match-filter-count">{counts[key]}</span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="panel" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <p className="subtle">Loading matches...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error !== null && (
        <div className="panel" style={{ color: 'var(--rose)' }}>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && error === null && filtered.length === 0 && (
        <div className="panel" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <p className="subtle">
            No {activeTab !== 'all' ? activeTab + ' ' : ''}matches found.
          </p>
        </div>
      )}

      {/* Match cards */}
      {!loading && error === null && filtered.length > 0 && (
        <div className="match-grid">
          {filtered.map(match => {
            const status = getStatus(match)
            const team1Color = TEAM_COLORS[match.firstBattingTeamCode] ?? 'var(--sun)'
            const team2Color = TEAM_COLORS[match.secondBattingTeamCode] ?? 'var(--teal)'
            return (
              <div key={match.id} className={`match-card match-card--${status}`}>
                {/* Status badge */}
                <div className="match-card-top">
                  <span className={`match-status-badge match-status--${status}`}>
                    {status === 'past'
                      ? 'Completed'
                      : status === 'current'
                      ? 'Live Today'
                      : 'Upcoming'}
                  </span>
                </div>

                {/* Teams */}
                <div className="match-vs-row">
                  <div className="match-team">
                    <span
                      className="match-team-code"
                      style={{ color: team1Color }}
                    >
                      {match.firstBattingTeamCode}
                    </span>
                    <span className="match-team-name">
                      {match.firstBattingTeamName}
                    </span>
                  </div>

                  <span className="match-vs-text">vs</span>

                  <div className="match-team match-team--right">
                    <span
                      className="match-team-code"
                      style={{ color: team2Color }}
                    >
                      {match.secondBattingTeamCode}
                    </span>
                    <span className="match-team-name">
                      {match.secondBattingTeamName}
                    </span>
                  </div>
                </div>

                {/* Meta info */}
                <div className="match-meta">
                  <span className="match-meta-item">
                    {formatDate(match.matchDate)}
                  </span>
                  <span className="match-meta-item">
                    {formatTime(match.matchTime)}
                    <span className="subtle" style={{ marginLeft: '0.4rem' }}>
                      ({match.gmtMatchTime})
                    </span>
                  </span>
                  <span className="match-meta-item">
                    {match.groundName}, {match.city}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
