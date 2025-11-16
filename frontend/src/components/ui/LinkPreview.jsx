import React from 'react'

export default function LinkPreview({ url }) {
  const API_BASE = (import.meta?.env && import.meta.env.VITE_API_BASE_URL) ? import.meta.env.VITE_API_BASE_URL : '/api'
  const [data, setData] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()
    const load = async () => {
      setError('')
      setData(null)
      if (!url) return
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE}/link-preview?url=${encodeURIComponent(url)}`, { signal: ctrl.signal })
        if (!res.ok) throw new Error('Tải preview thất bại')
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) setError(e.message || 'Lỗi tải preview')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true; ctrl.abort() }
  }, [url])

  if (!url) return null

  return (
    <div className="link-preview-card" role="region" aria-label="Xem trước liên kết">
      {loading && (
        <div className="link-preview-skeleton">
          <div className="skeleton-thumb" />
          <div className="skeleton-lines">
            <div className="line" />
            <div className="line short" />
          </div>
        </div>
      )}
      {!loading && data && (
        <a className="link-preview-inner" href={data.url} target="_blank" rel="noopener noreferrer">
          {data.image && <img className="link-preview-thumb" src={data.image} alt="preview" />}
          {!data.image && <div className="link-preview-thumb placeholder" aria-hidden="true" />}
          <div className="link-preview-content">
            <div className="link-preview-title">{data.title || 'Không có tiêu đề'}</div>
            {data.description && <div className="link-preview-desc">{data.description}</div>}
            <div className="link-preview-meta">
              {data.favicon && <img className="link-preview-favicon" src={data.favicon} alt="icon" />}
              <span className="link-preview-site">{data.siteName || ''}</span>
            </div>
          </div>
        </a>
      )}
      {!loading && error && (
        <div className="link-preview-error">{error}</div>
      )}
    </div>
  )
}