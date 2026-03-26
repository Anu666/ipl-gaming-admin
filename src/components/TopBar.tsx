import { UserRole, USER_ROLE_LABELS } from '../lib/types'

interface Props {
  onLogout: () => void
  pageName: string
  userName?: string
  userRole?: UserRole
}

const ROLE_COLOR: Record<UserRole, string> = {
  [UserRole.Player]: '#ffffff44',
  [UserRole.Moderator]: '#219ebc55',
  [UserRole.Admin]: '#3a86ff55',
  [UserRole.SuperAdmin]: '#ffb70355',
}

export function TopBar({ onLogout, pageName, userName, userRole }: Props) {
  return (
    <header className="topbar">
      <h2 className="topbar-title">{pageName}</h2>
      <div className="topbar-right">
        {userName !== undefined && (
          <div className="topbar-user">
            {userRole !== undefined && (
              <span
                className="topbar-role-badge"
                style={{ background: ROLE_COLOR[userRole] }}
              >
                {USER_ROLE_LABELS[userRole]}
              </span>
            )}
            <span className="topbar-username">{userName}</span>
          </div>
        )}
        <button className="logout-btn" onClick={onLogout} type="button">
          Clear API Key
        </button>
      </div>
    </header>
  )
}
