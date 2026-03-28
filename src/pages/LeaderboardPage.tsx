import type { LeaderboardEntry } from '../lib/types'

interface LeaderboardPageProps {
  rows: LeaderboardEntry[]
}

export function LeaderboardPage({ rows }: LeaderboardPageProps) {
  if (rows.length === 0) {
    return (
      <div className="page-content">
        <p style={{ opacity: 0.6 }}>No completed matches yet. The leaderboard will appear after the first match is marked Done.</p>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>P&amp;L</th>
              <th>✅ Correct</th>
              <th>❌ Wrong</th>
              <th>⏭ Skipped</th>
              <th>🚫 Voided</th>
              <th>Win Rate</th>
              <th>Matches</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const pnlSign = row.totalCreditChange >= 0 ? '+' : ''
              return (
                <tr key={row.userId}>
                  <td>#{row.rank}</td>
                  <td>{row.userName}</td>
                  <td style={{ color: row.totalCreditChange >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                    {pnlSign}{row.totalCreditChange}
                  </td>
                  <td>{row.correctPredictions}</td>
                  <td>{row.wrongPredictions}</td>
                  <td>{row.unansweredQuestions}</td>
                  <td>{row.voidedQuestions}</td>
                  <td>{row.winRate.toFixed(1)}%</td>
                  <td>{row.matchesPlayed}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
