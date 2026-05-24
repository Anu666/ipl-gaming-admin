import { useState } from 'react'
import type { AwardCategory, AwardWinner } from '../lib/types'

interface AwardsPageProps {
  categories: AwardCategory[]
}

const POSITION_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

function WinnerRow({ winner }: { winner: AwardWinner }) {
  return (
    <div className="award-winner-row">
      <span className="award-medal">{POSITION_MEDAL[winner.position] ?? `#${winner.position}`}</span>
      <span className="award-winner-name">{winner.userName}</span>
      <span className="award-winner-value">{winner.formattedValue}</span>
    </div>
  )
}

function AwardCard({ category, onViewAll }: { category: AwardCategory; onViewAll: () => void }) {
  const podium = category.winners.filter((w) => w.position <= 3)
  const hasMore = category.winners.some((w) => w.position > 3)

  return (
    <div className="award-card">
      <div className="award-card-header">
        <span className="award-emoji">{category.emoji}</span>
        <div>
          <h3 className="award-title">{category.label}</h3>
          <p className="award-description">{category.description}</p>
        </div>
      </div>
      <div className="award-winners">
        {podium.length === 0 ? (
          <p className="award-no-winners">No data yet</p>
        ) : (
          podium.map((w) => <WinnerRow key={`${w.userId}-${w.position}`} winner={w} />)
        )}
      </div>
      {hasMore && (
        <button type="button" className="award-view-all" onClick={onViewAll}>
          View all rankings →
        </button>
      )}
    </div>
  )
}

function AwardDetailView({ category, onBack }: { category: AwardCategory; onBack: () => void }) {
  return (
    <div className="page-content">
      <button type="button" className="award-back-btn" onClick={onBack}>
        ← Back to Awards
      </button>
      <div className="award-detail-header">
        <span className="award-emoji">{category.emoji}</span>
        <div>
          <h2 className="award-detail-title">{category.label}</h2>
          <p className="award-description">{category.description}</p>
        </div>
      </div>
      <div className="table-wrap" style={{ marginTop: '1rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {category.winners.map((w) => (
              <tr key={w.userId} className={w.position <= 3 ? 'award-podium-row' : ''}>
                <td>{POSITION_MEDAL[w.position] ?? `#${w.position}`}</td>
                <td>{w.userName}</td>
                <td>{w.formattedValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AwardsPage({ categories }: AwardsPageProps) {
  const [selected, setSelected] = useState<AwardCategory | null>(null)

  if (selected) {
    return <AwardDetailView category={selected} onBack={() => setSelected(null)} />
  }

  if (categories.length === 0) {
    return (
      <div className="page-content">
        <p style={{ opacity: 0.6 }}>
          No awards yet. Awards are calculated automatically after the first match is marked Done.
        </p>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="awards-grid">
        {categories.map((cat) => (
          <AwardCard key={cat.key} category={cat} onViewAll={() => setSelected(cat)} />
        ))}
      </div>
    </div>
  )
}
