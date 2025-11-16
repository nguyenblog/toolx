import React from 'react'

export default function NotFound({ onGoHome }) {
  return (
    <section className="auth-section" aria-label="Trang 404">
      <div className="brand-hero" style={{ marginTop: 24 }}>
        <div className="brand-name">ToolX</div>
  {(() => {
    const base = (import.meta?.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/'
    const logoUrl = `${base}toolx-logo.svg`
    return <img src={logoUrl} alt="ToolX logo" className="brand-logo" />
  })()}
        <div className="brand-slogan">Liên kết bạn truy cập hiện chưa được hỗ trợ.</div>
      </div>
      <div className="auth-core" style={{ gap: 12 }}>
        <h1 style={{ margin: '8px 0' }}>404 — Trang không tồn tại</h1>
        <p style={{ color: 'var(--muted-foreground)', margin: 0 }}>Vui lòng quay lại Trang chủ hoặc chọn mục từ sidebar.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="chip-button" onClick={() => onGoHome ? onGoHome() : (window.location.hash = '#/')}>Về Trang chủ</button>
          <a className="chip-button" href="#/dashboard" aria-label="Tới Dashboard">Tới Dashboard</a>
          <a className="chip-button" href="#/2fa" aria-label="Mở 2FA">Mở 2FA</a>
        </div>
      </div>
    </section>
  )
}