import { useState } from 'react'
import { setApiKey } from '../lib/api'

interface Props {
  onAuthenticated: () => void
}

export function ApiKeyGate({ onAuthenticated }: Props) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) {
      setError('Please enter your API key.')
      return
    }
    setError('')
    setLoading(true)
    try {
      // Optimistically store and let the first real API call validate
      setApiKey(trimmed)
      onAuthenticated()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="gate-card">
      <p className="gate-eyebrow">IPL Gaming</p>
      <h1 className="gate-title">Admin Panel</h1>
      <p className="gate-subtitle">Enter your API key to continue.</p>

      <form onSubmit={handleSubmit} noValidate>
        <label className="gate-label" htmlFor="api-key-input">
          API Key
        </label>
        <input
          id="api-key-input"
          className="gate-input"
          type="password"
          autoComplete="off"
          placeholder="Paste your API key here"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={loading}
          autoFocus
        />
        {error && <p className="gate-error">{error}</p>}
        <button className="gate-btn" type="submit" disabled={loading}>
          {loading ? 'Verifying…' : 'Access Admin Panel'}
        </button>
      </form>
    </div>
  )
}
