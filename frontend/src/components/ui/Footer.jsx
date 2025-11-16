import React from 'react'

export default function Footer() {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="footer-inner">
        <a
          className="footer-brand"
          href="#/"
          aria-label="Trang chủ"
          title="Trang chủ"
        >
          ToolX
        </a>
        <span className="footer-sep">•</span>
        <span className="footer-note">All in One - Quản lý lượt đăng ký nhanh chóng.</span>
        <span className="footer-sep">•</span>
        <span className="footer-legal-inline">© 2025 All rights reserved — ByteFlow Solution Company</span>
      </div>
    </footer>
  )
}