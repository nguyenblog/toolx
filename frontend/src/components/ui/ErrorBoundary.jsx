import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Log error for debugging
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const isDev = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) || false
      return (
        <div style={{ padding: 24 }}>
          <h2>Đã xảy ra lỗi hiển thị</h2>
          <p>Vui lòng tải lại trang hoặc thử lại sau.</p>
          {isDev && (
            <div style={{ marginTop: 12, padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fafafa' }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Chi tiết (chỉ hiển thị ở chế độ dev):</div>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                {String(this.state.error?.stack || this.state.error?.message || this.state.error || '')}
              </pre>
            </div>
          )}
        </div>
      )
    }
    return this.props.children
  }
}