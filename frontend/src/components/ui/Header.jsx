import React from 'react'

export default function Header({ labels = { home: 'Home', blog: 'Blog', pricing: 'Pricing', dashboard: 'Dashboard', history: 'History', active: 'Active', twofa: '2FA' }, rightSlot = null, title = null, onSidebarToggle = null }) {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [hash, setHash] = React.useState(typeof window !== 'undefined' ? (window.location.hash || '#/') : '#/')

  React.useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const isActive = (href) => (hash === href)
  return (
      <header className={`site-header ${menuOpen ? 'menu-open' : ''}`} role="banner">
      <div className="header-left">
        <button
          className="menu-button"
          type="button"
          aria-label={onSidebarToggle ? 'Toggle sidebar' : 'Mở menu'}
          aria-controls="primary-nav"
          aria-expanded={menuOpen}
          onClick={() => {
            if (typeof onSidebarToggle === 'function') {
              onSidebarToggle()
            } else {
              setMenuOpen(v => !v)
            }
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <span className="mobile-title">{title || labels.home}</span>
      </div>
      <nav id="primary-nav" className="header-nav" aria-label="Primary">
        {/* Nhóm link Header chính (Trang chủ/Blog/Pricing) */}
        <a className={`header-link ${isActive('#/') ? 'active' : ''}`} href="#/" aria-label="Trang chủ" onClick={() => setMenuOpen(false)}>{labels.home}</a>
        <a className={`header-link ${isActive('#/history') ? 'active' : ''}`} href="#/history" aria-label="Lịch sử" onClick={() => setMenuOpen(false)}>{labels.blog}</a>
        <a className={`header-link ${isActive('#/active') ? 'active' : ''}`} href="#/active" aria-label="Đang hoạt động" onClick={() => setMenuOpen(false)}>{labels.pricing}</a>
        {/* Nhóm link Sidebar gộp vào mobile menu (ẩn trên desktop) */}
        <a className={`header-link mobile-only ${isActive('#/dashboard') ? 'active' : ''}`} href="#/dashboard" aria-label={labels.dashboard} onClick={() => setMenuOpen(false)}>{labels.dashboard}</a>
        <a className={`header-link mobile-only ${isActive('#/history') ? 'active' : ''}`} href="#/history" aria-label={labels.history} onClick={() => setMenuOpen(false)}>{labels.history}</a>
        <a className={`header-link mobile-only ${isActive('#/active') ? 'active' : ''}`} href="#/active" aria-label={labels.active} onClick={() => setMenuOpen(false)}>{labels.active}</a>
        <a className={`header-link mobile-only ${isActive('#/2fa') ? 'active' : ''}`} href="#/2fa" aria-label={labels.twofa} onClick={() => setMenuOpen(false)}>{labels.twofa}</a>
      </nav>
      <div className="header-right">{rightSlot}</div>
    </header>
  )
}