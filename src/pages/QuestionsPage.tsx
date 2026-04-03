import { useState } from 'react'
import templatesJson from '../assets/json/question-templates.json'

interface TemplateOption {
  id: number
  optionText: string
}

interface QuestionTemplate {
  id: number
  category: string
  questionText: string
  options: TemplateOption[]
  credits: number
}

const templates = templatesJson as QuestionTemplate[]

const ALL_CATEGORIES = ['All', ...Array.from(new Set(templates.map(t => t.category)))]

const CATEGORY_COLORS: Record<string, string> = {
  'Toss':          'var(--sun)',
  'Batting':       'var(--mint)',
  'Bowling':       '#fb923c',
  'Match Outcome': '#6dd5ed',
  'Fielding':      '#c084fc',
  'Powerplay':     '#f472b6',
  'Death Overs':   '#f87171',
  'Sixes & Fours': '#4da6ff',
}

export function QuestionsPage() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [expanded, setExpanded] = useState<number | null>(null)

  const filtered = activeCategory === 'All'
    ? templates
    : templates.filter(t => t.category === activeCategory)

  const categoryCounts = ALL_CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = cat === 'All' ? templates.length : templates.filter(t => t.category === cat).length
    return acc
  }, {})

  return (
    <div className="page-content">
      <div className="page-toolbar">
        <div>
          <h2 className="matches-page-title">Question Templates</h2>
          <p className="subtle">{templates.length} templates · select any to use for a match</p>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="match-filter-tabs" style={{ marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {ALL_CATEGORIES.map(cat => (
          <button
            key={cat}
            type="button"
            className={`match-filter-tab${activeCategory === cat ? ' active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
            <span className="match-filter-count">{categoryCounts[cat]}</span>
          </button>
        ))}
      </div>

      {/* Template list */}
      <div className="qt-list">
        {filtered.map(template => {
          const color = CATEGORY_COLORS[template.category] ?? 'var(--teal)'
          const isExpanded = expanded === template.id
          return (
            <div key={template.id} className="qt-card">
              {/* Header row */}
              <button
                type="button"
                className="qt-header"
                onClick={() => setExpanded(isExpanded ? null : template.id)}
                aria-expanded={isExpanded}
              >
                <div className="qt-header-left">
                  <span className="qt-seq">#{template.id}</span>
                  <div className="qt-meta">
                    <span
                      className="qt-category-badge"
                      style={{ color, borderColor: color + '55', background: color + '18' }}
                    >
                      {template.category}
                    </span>
                    <span className="qt-question-text">{template.questionText}</span>
                  </div>
                </div>
                <div className="qt-header-right">
                  <span className="qt-credits">{template.credits.toFixed(2)} cr</span>
                  <span className="qt-chevron" style={{ transform: isExpanded ? 'rotate(180deg)' : undefined }}>
                    ▾
                  </span>
                </div>
              </button>

              {/* Expanded options */}
              {isExpanded && (
                <div className="qt-options">
                  {template.options.map(opt => (
                    <div key={opt.id} className="qt-option">
                      <span className="qt-option-id">{opt.id}</span>
                      <span className="qt-option-text">{opt.optionText}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
