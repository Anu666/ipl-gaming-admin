import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import type { User } from '../lib/types'
import { UserRole, USER_ROLE_LABELS, CreditsOperation } from '../lib/types'

// ── Local types ──────────────────────────────────────────────────────────────
type ModalState =
  | { type: 'create' }
  | { type: 'edit'; user: User }
  | { type: 'delete'; user: User }
  | { type: 'credits'; user: User }
  | { type: 'created'; user: User }

interface UserFormState {
  name: string
  email: string
  phoneNumber: string
  role: UserRole
  credits: number
  isActive: boolean
}

// ── Constants ────────────────────────────────────────────────────────────────
const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: UserRole.Player, label: 'Player' },
  { value: UserRole.Moderator, label: 'Moderator' },
  { value: UserRole.Admin, label: 'Admin' },
  { value: UserRole.SuperAdmin, label: 'Super Admin' },
]

const EMPTY_FORM: UserFormState = {
  name: '',
  email: '',
  phoneNumber: '',
  role: UserRole.Player,
  credits: 0,
  isActive: true,
}

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  [UserRole.Player]: 'badge badge-player',
  [UserRole.Moderator]: 'badge badge-moderator',
  [UserRole.Admin]: 'badge badge-admin',
  [UserRole.SuperAdmin]: 'badge badge-superadmin',
}

// ── Main page ────────────────────────────────────────────────────────────────
export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.users.getAll()
      setUsers(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const closeModal = () => {
    setModal(null)
    setFormError(null)
    setCopied(null)
  }

  const handleCreate = async (form: UserFormState) => {
    setSubmitting(true)
    setFormError(null)
    try {
      const created = await api.users.create({
        name: form.name,
        email: form.email,
        phoneNumber: form.phoneNumber,
        role: form.role,
        credits: form.credits,
        isActive: form.isActive,
      })
      setUsers(prev => [created, ...prev])
      setModal({ type: 'created', user: created })
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (form: UserFormState, user: User) => {
    setSubmitting(true)
    setFormError(null)
    try {
      const updated = await api.users.update({
        id: user.id,
        name: form.name,
        email: form.email,
        phoneNumber: form.phoneNumber,
        role: form.role,
        isActive: form.isActive,
      })
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))
      closeModal()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to update user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (user: User) => {
    setSubmitting(true)
    setFormError(null)
    try {
      await api.users.delete(user.id)
      setUsers(prev => prev.filter(u => u.id !== user.id))
      closeModal()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to delete user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateCredits = async (user: User, credits: number, operation: CreditsOperation) => {
    setSubmitting(true)
    setFormError(null)
    try {
      const updated = await api.users.updateCredits(user.id, { credits, operation })
      setUsers(prev => prev.map(u => u.id === updated.id ? { ...updated } : u))
      closeModal()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to update credits')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSyncCache = async () => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      await api.users.refreshCache()
      setSyncMsg({ ok: true, text: 'Cache refreshed' })
    } catch (e) {
      setSyncMsg({ ok: false, text: e instanceof Error ? e.message : 'Sync failed' })
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 3000)
    }
  }

  const copyToClipboard = (text: string, key: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(prev => prev === key ? null : prev), 2000)
    })
  }

  return (
    <div className="page-content">
      {/* Toolbar */}
      <div className="page-toolbar">
        <div>
          <h2 className="panel-title">Users</h2>
          <p className="subtle">{loading ? 'Loading…' : `${users.length} total`}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {syncMsg !== null && (
            <span style={{
              fontSize: '0.82rem',
              color: syncMsg.ok ? 'var(--mint)' : 'var(--rose)',
              opacity: 0.9,
            }}>
              {syncMsg.ok ? '✓' : '✕'} {syncMsg.text}
            </span>
          )}
          <button
            className="btn-secondary"
            type="button"
            onClick={() => void handleSyncCache()}
            disabled={syncing}
            title="Refresh the in-memory user API key cache"
          >
            {syncing ? 'Syncing…' : '↻ Sync Cache'}
          </button>
          <button className="btn-primary" type="button" onClick={() => setModal({ type: 'create' })}>
            + Add User
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="panel">
        {loading && (
          <p className="subtle" style={{ textAlign: 'center', padding: '2rem' }}>Loading users…</p>
        )}

        {error !== null && (
          <p style={{ color: 'var(--rose)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {error}
            <button
              className="btn-secondary"
              type="button"
              onClick={() => void loadUsers()}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}
            >
              Retry
            </button>
          </p>
        )}

        {!loading && error === null && (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Credits</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', opacity: 0.45 }}>
                      No users found
                    </td>
                  </tr>
                )}
                {users.map(user => (
                  <tr key={user.id}>
                    <td><strong>{user.name}</strong></td>
                    <td>{user.email || '—'}</td>
                    <td>{user.phoneNumber || '—'}</td>
                    <td>
                      <span className={ROLE_BADGE_CLASS[user.role]}>
                        {USER_ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td><span className="credits-val">{user.credits}</span></td>
                    <td>
                      <span className={user.isActive ? 'badge badge-active' : 'badge badge-inactive'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{new Date(user.createdDate).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div className="action-row">
                        <button
                          className="btn-icon edit"
                          title="Edit user"
                          type="button"
                          onClick={() => setModal({ type: 'edit', user })}
                        >✏️</button>
                        <button
                          className="btn-icon credits"
                          title="Update credits"
                          type="button"
                          onClick={() => setModal({ type: 'credits', user })}
                        >💰</button>
                        <button
                          className="btn-icon"
                          title="Copy API key"
                          type="button"
                          style={{ opacity: copied === user.id ? 1 : undefined }}
                          onClick={() => copyToClipboard(user.apiKey, user.id)}
                        >{copied === user.id ? '✓' : '🔑'}</button>
                        <button
                          className="btn-icon danger"
                          title={user.role === UserRole.SuperAdmin ? 'Super Admin users cannot be deleted' : 'Delete user'}
                          type="button"
                          disabled={user.role === UserRole.SuperAdmin}
                          onClick={() => setModal({ type: 'delete', user })}
                        >🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal !== null && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          {/* Create / Edit */}
          {(modal.type === 'create' || modal.type === 'edit') && (
            <UserFormModal
              mode={modal.type}
              user={modal.type === 'edit' ? modal.user : undefined}
              onSubmit={form => {
                if (modal.type === 'create') {
                  void handleCreate(form)
                } else {
                  void handleUpdate(form, modal.user)
                }
              }}
              onCancel={closeModal}
              submitting={submitting}
              error={formError}
            />
          )}

          {/* Delete confirmation */}
          {modal.type === 'delete' && (
            <div className="modal">
              <div className="modal-header">
                <h3 className="modal-title">Delete User</h3>
                <button className="modal-close-btn" onClick={closeModal} type="button">✕</button>
              </div>
              <div className="modal-body">
                {modal.user.role === UserRole.SuperAdmin ? (
                  <p style={{ color: 'var(--rose)' }}>
                    <strong>{modal.user.name}</strong> is a Super Admin and cannot be deleted.
                  </p>
                ) : (
                  <>
                    <p>
                      Are you sure you want to permanently delete{' '}
                      <strong>{modal.user.name}</strong>?
                    </p>
                    <p className="subtle">This action cannot be undone.</p>
                  </>
                )}
                {formError !== null && (
                  <p style={{ color: 'var(--rose)', marginTop: '0.5rem' }}>{formError}</p>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={closeModal} disabled={submitting} type="button">
                  {modal.user.role === UserRole.SuperAdmin ? 'Close' : 'Cancel'}
                </button>
                {modal.user.role !== UserRole.SuperAdmin && (
                  <button
                    className="btn-danger"
                    onClick={() => void handleDelete(modal.user)}
                    disabled={submitting}
                    type="button"
                  >
                    {submitting ? 'Deleting…' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Update credits */}
          {modal.type === 'credits' && (
            <CreditsModal
              user={modal.user}
              onSubmit={(credits, operation) => void handleUpdateCredits(modal.user, credits, operation)}
              onCancel={closeModal}
              submitting={submitting}
              error={formError}
            />
          )}

          {/* Post-create: show generated API key */}
          {modal.type === 'created' && (
            <div className="modal">
              <div className="modal-header">
                <h3 className="modal-title">User Created</h3>
                <button className="modal-close-btn" onClick={closeModal} type="button">✕</button>
              </div>
              <div className="modal-body">
                <p style={{ color: 'var(--mint)', marginBottom: '1.25rem', fontWeight: 600 }}>
                  ✓ User created successfully
                </p>

                <div className="form-group">
                  <span className="form-label">Name</span>
                  <p style={{ margin: '0.2rem 0 0' }}>{modal.user.name}</p>
                </div>
                <div className="form-group">
                  <span className="form-label">Email</span>
                  <p style={{ margin: '0.2rem 0 0' }}>{modal.user.email || '—'}</p>
                </div>
                <div className="form-group">
                  <span className="form-label">Role</span>
                  <p style={{ margin: '0.2rem 0 0' }}>
                    <span className={ROLE_BADGE_CLASS[modal.user.role]}>
                      {USER_ROLE_LABELS[modal.user.role]}
                    </span>
                  </p>
                </div>
                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <span className="form-label">API Key — share with user</span>
                  <div className="api-key-display">
                    <code className="key-value">{modal.user.apiKey}</code>
                    <button
                      className="copy-btn"
                      type="button"
                      onClick={() => copyToClipboard(modal.user.apiKey, 'modal')}
                    >
                      {copied === 'modal' ? '✓ Copied' : '📋 Copy'}
                    </button>
                  </div>
                  <p className="subtle" style={{ marginTop: '0.4rem' }}>
                    This key will not be shown again from the admin panel.
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-primary" onClick={closeModal} type="button">Done</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── User add / edit form modal ────────────────────────────────────────────────
interface UserFormModalProps {
  mode: 'create' | 'edit'
  user?: User
  onSubmit: (form: UserFormState) => void
  onCancel: () => void
  submitting: boolean
  error: string | null
}

function UserFormModal({ mode, user, onSubmit, onCancel, submitting, error }: UserFormModalProps) {
  const [form, setForm] = useState<UserFormState>(
    user
      ? {
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          credits: user.credits,
          isActive: user.isActive,
        }
      : { ...EMPTY_FORM }
  )

  const set = <K extends keyof UserFormState>(key: K, value: UserFormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSubmit(form)
  }

  return (
    <div className="modal modal-wide">
      <div className="modal-header">
        <h3 className="modal-title">{mode === 'create' ? 'Add User' : 'Edit User'}</h3>
        <button className="modal-close-btn" onClick={onCancel} type="button">✕</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="uf-name">Name *</label>
              <input
                id="uf-name"
                className="form-control"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                required
                placeholder="Full name"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="uf-email">Email</label>
              <input
                id="uf-email"
                className="form-control"
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="user@example.com"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="uf-phone">Phone</label>
              <input
                id="uf-phone"
                className="form-control"
                value={form.phoneNumber}
                onChange={e => set('phoneNumber', e.target.value)}
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="uf-role">Role</label>
              <select
                id="uf-role"
                className="form-control"
                value={form.role}
                onChange={e => set('role', Number(e.target.value) as UserRole)}
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <span className="form-label">Status</span>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e => set('isActive', e.target.checked)}
              />
              <span>{form.isActive ? 'Active' : 'Inactive'}</span>
            </label>
          </div>

          {error !== null && (
            <p style={{ color: 'var(--rose)', margin: '0.25rem 0 0', fontSize: '0.88rem' }}>{error}</p>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting
              ? mode === 'create' ? 'Creating…' : 'Saving…'
              : mode === 'create' ? 'Create User' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Credits update modal ──────────────────────────────────────────────────────
interface CreditsModalProps {
  user: User
  onSubmit: (credits: number, operation: CreditsOperation) => void
  onCancel: () => void
  submitting: boolean
  error: string | null
}

function CreditsModal({ user, onSubmit, onCancel, submitting, error }: CreditsModalProps) {
  const [operation, setOperation] = useState<CreditsOperation>(CreditsOperation.Deposit)
  const [amountStr, setAmountStr] = useState<string>('')

  const amount = parseFloat(amountStr) || 0

  const preview = (() => {
    if (operation === CreditsOperation.Deposit) return user.credits + amount
    if (operation === CreditsOperation.Withdrawal) return user.credits - amount
    return amount // Override
  })()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(amount, operation)
  }

  const handleOperationChange = (op: CreditsOperation) => {
    setOperation(op)
    setAmountStr(op === CreditsOperation.Override ? String(user.credits) : '')
  }

  const inputLabel = operation === CreditsOperation.Deposit
    ? 'Amount to deposit'
    : operation === CreditsOperation.Withdrawal
      ? 'Amount to withdraw'
      : 'New total balance'

  return (
    <div className="modal">
      <div className="modal-header">
        <h3 className="modal-title">Update Credits</h3>
        <button className="modal-close-btn" onClick={onCancel} type="button">✕</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <p style={{ marginBottom: '1rem' }}>
            Updating credits for <strong>{user.name}</strong>
          </p>

          <div className="form-group">
            <span className="form-label">Operation</span>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="cr-op"
                  checked={operation === CreditsOperation.Deposit}
                  onChange={() => handleOperationChange(CreditsOperation.Deposit)}
                />
                Deposit
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="cr-op"
                  checked={operation === CreditsOperation.Withdrawal}
                  onChange={() => handleOperationChange(CreditsOperation.Withdrawal)}
                />
                Withdrawal
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="cr-op"
                  checked={operation === CreditsOperation.Override}
                  onChange={() => handleOperationChange(CreditsOperation.Override)}
                />
                Admin Override
              </label>
            </div>
          </div>

          {operation === CreditsOperation.Override && (
            <p style={{ fontSize: '0.82rem', color: 'var(--subtle)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
              Creates 2 transactions: one zeroing the current balance, one setting the new value. Both are type <em>Admin Override</em>.
            </p>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="cr-amount">{inputLabel}</label>
            <input
              id="cr-amount"
              className="form-control"
              type="number"
              min={0}
              step={0.01}
              value={amountStr}
              placeholder="0"
              onChange={e => setAmountStr(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginTop: '0.25rem' }}>
            <span className="subtle">Current: <span style={{ color: 'var(--sun)', fontWeight: 600 }}>{user.credits}</span></span>
            <span className="subtle">Result: <span style={{ color: preview < 0 ? 'var(--rose)' : 'var(--mint)', fontWeight: 600 }}>{Math.round(preview * 100) / 100}</span></span>
          </div>

          {operation === CreditsOperation.Withdrawal && preview < 0 && (
            <p style={{ color: 'var(--rose)', marginTop: '0.5rem', fontSize: '0.82rem' }}>
              Warning: withdrawal amount exceeds current balance.
            </p>
          )}

          {error !== null && (
            <p style={{ color: 'var(--rose)', marginTop: '0.75rem', fontSize: '0.88rem' }}>{error}</p>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Updating…' : 'Update Credits'}
          </button>
        </div>
      </form>
    </div>
  )
}
