interface Props {
  onLogout: () => void
  pageName: string
}

export function TopBar({ onLogout, pageName }: Props) {
  return (
    <header className="topbar">
      <h2 className="topbar-title">{pageName}</h2>
      <div className="topbar-right">
        <button className="logout-btn" onClick={onLogout} type="button">
          Clear API Key
        </button>
      </div>
    </header>
  )
}
