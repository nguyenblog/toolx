import React from 'react'

export default function Sidebar({
  projectName,
  onStartResize,
  labels = { dashboard: 'Dashboard', history: 'Lịch sử', active: 'Đang hoạt động', twofa: '2FA' },
  collapsed = false,
  onToggleCollapse,
  onNavigate,
  activePath = '#/',
  userEmail = '',
  isAuthenticated = false,
  onLogout,
}) {
  const displayEmail = (userEmail || '').trim()
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
              <button
                type="button"
                className="sidebar-brand"
                onClick={() => onNavigate && onNavigate('#/')}
                aria-label="Trang chủ"
                title="Trang chủ"
              >
        {(() => {
          const base = (import.meta?.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/'
          const logoUrl = `${base}toolx-logo.svg`
          return <img src={logoUrl} alt="ToolX" className="sidebar-brand-logo" />
        })()}
                <span>{projectName}</span>
              </button>
              {isAuthenticated && displayEmail && (
                <span
                  className={`sidebar-user-email truncate`}
                  title={displayEmail}
                >
                  {displayEmail}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isAuthenticated && (
                <button
                  type="button"
                  className="chip-button"
                  onClick={() => onLogout && onLogout()}
                  aria-label="Đăng xuất"
                  title="Đăng xuất"
                >
                  <span>Logout</span>
                </button>
              )}
              <button
                className="collapse-toggle"
                onClick={onToggleCollapse}
                aria-label="Thu gọn sidebar"
                title="Thu gọn sidebar"
              >
                {/* Chevron-left icon (bigger) */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div
            className="collapse-inline collapse-label"
            onClick={onToggleCollapse}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggleCollapse() }}
            aria-label="Mở rộng sidebar"
            title="Mở rộng sidebar"
          >
            {/* Menu icon (hamburger) */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>Menu</span>
          </div>
        )}
      </div>
      {!collapsed && (
        <nav className="sidebar-nav">
          <button
            type="button"
            className={`nav-item ${activePath === '#/dashboard' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('#/dashboard')}
            aria-label={labels.dashboard}
          >
            <span className="nav-label">{labels.dashboard}</span>
          </button>
          <button
            type="button"
            className={`nav-item ${activePath === '#/history' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('#/history')}
            aria-label={labels.history}
          >
            <span className="nav-label">{labels.history}</span>
          </button>
          <button
            type="button"
            className={`nav-item ${activePath === '#/active' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('#/active')}
            aria-label={labels.active}
          >
            <span className="nav-label">{labels.active}</span>
          </button>
          <button
            type="button"
            className={`nav-item ${activePath === '#/2fa' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('#/2fa')}
            aria-label={labels.twofa}
          >
            <span className="nav-label">{labels.twofa}</span>
          </button>
        </nav>
      )}
      <div className="sidebar-resizer" onMouseDown={onStartResize} />
    </aside>
  )
}