import React from 'react'
import Button from '../ui/Button.jsx'

export default function UsageList({ items = [], locale = 'vi-VN', onReorder, onRenew, onCancel, statusOverride = null, groupMode = false, getGroupKey, getGroupLabel, actionsSttSlot = null, actionsAmountSlot = null, renewOpening = false, renewOpeningId = null }) {
  const fmtCurrency = (n) => {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n || 0)
    } catch {
      return `${(n || 0).toLocaleString('vi-VN')} ₫`
    }
  }

  const fmtDate = (s) => {
    if (!s) return '—'
    try {
      // Safe parse for YYYY-MM-DD across browsers (iOS/Safari quirks)
      const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s)
      let d
      if (m) {
        const y = Number(m[1]); const mo = Number(m[2]) - 1; const da = Number(m[3])
        d = new Date(y, mo, da)
      } else {
        d = new Date(s)
      }
      if (isNaN(d.getTime())) return '—'
      return d.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
    } catch {
      return '—'
    }
  }

  const cycleLabel = (c) => {
    const isVi = locale.startsWith('vi')
    const mapVi = { month: 'Theo tháng', year: 'Theo năm', day: 'Theo ngày' }
    const mapEn = { month: 'Monthly', year: 'Yearly', day: 'Daily' }
    return (isVi ? mapVi : mapEn)[c] || (isVi ? 'Theo tháng' : 'Monthly')
  }

  const daysUntil = (s) => {
    if (!s) return NaN
    try {
      const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s)
      let due
      if (m) {
        const y = Number(m[1]); const mo = Number(m[2]) - 1; const da = Number(m[3])
        due = new Date(y, mo, da)
      } else {
        due = new Date(s)
      }
      if (isNaN(due.getTime())) return NaN
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate())
      const diffMs = startOfDue.getTime() - startOfToday.getTime()
      return Math.floor(diffMs / (1000 * 60 * 60 * 24))
    } catch {
      return NaN
    }
  }


  const statusColor = (s) => {
    if (s === 'active') return 'var(--green-500)'
    if (s === 'warning') return 'var(--yellow-500)'
    if (s === 'expired') return 'var(--red-500)'
    return 'var(--gray-400)'
  }

  const [dragIndex, setDragIndex] = React.useState(null)
  const [overIndex, setOverIndex] = React.useState(null)

  // Sorting state
  const [sortBy, setSortBy] = React.useState(null) // 'next' | 'amount' | null
  const [sortDir, setSortDir] = React.useState('asc') // 'asc' | 'desc'
  // Phân biệt single-click và double-click, tránh xung đột
  const clickTimerRef = React.useRef(null)
  const handleSortClick = (key) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
    }
    clickTimerRef.current = setTimeout(() => {
      if (sortBy === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortBy(key)
        setSortDir('asc')
        setPage(1)
      }
    }, 180)
  }

  const handleSortDoubleClick = (key) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
    }
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortDir('asc') // lần double-click đầu tiên đặt về 'gần nhất' hoặc 'ít nhất'
      setPage(1)
    }
  }

  const dateValue = (s) => {
    if (!s) return NaN
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s)
    let d
    if (m) {
      const y = Number(m[1]); const mo = Number(m[2]) - 1; const da = Number(m[3])
      d = new Date(y, mo, da)
    } else {
      d = new Date(s)
    }
    const t = d.getTime()
    return Number.isFinite(t) ? t : NaN
  }

  const sortedItems = React.useMemo(() => {
    const arr = [...items]
    const asc = sortDir === 'asc'
    const groupKeyOf = (x) => {
      if (!groupMode || !getGroupKey) return ''
      try { return String(getGroupKey(x) || '') } catch { return '' }
    }
    const primarySort = (a, b) => {
      if (!sortBy) return 0
      let va, vb
      if (sortBy === 'next') {
        va = dateValue(a.nextBillingDate)
        vb = dateValue(b.nextBillingDate)
      } else if (sortBy === 'amount') {
        va = Number(a.cost) || 0
        vb = Number(b.cost) || 0
      } else {
        return 0
      }
      if (!Number.isFinite(va)) va = asc ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY
      if (!Number.isFinite(vb)) vb = asc ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY
      if (va === vb) return 0
      return asc ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1)
    }
    arr.sort((a, b) => {
      if (groupMode && getGroupKey) {
        const ka = groupKeyOf(a)
        const kb = groupKeyOf(b)
        if (ka !== kb) return ka < kb ? -1 : 1
      }
      const ps = primarySort(a, b)
      return ps
    })
    return arr
  }, [items, sortBy, sortDir, groupMode, getGroupKey])

  // Pagination
  const [page, setPage] = React.useState(1)
  const [pageSizeOpt, setPageSizeOpt] = React.useState('10') // '10' | 'full'
  const isFull = pageSizeOpt === 'full'
  const pageSize = isFull ? (sortedItems.length || 1) : Number(pageSizeOpt)
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize))
  const baseIndex = (page - 1) * pageSize
  const pageItems = sortedItems.slice(baseIndex, baseIndex + pageSize)

  // Persist user preferences: page size and current page
  React.useEffect(() => {
    try {
      const savedOpt = localStorage.getItem('toolx.usage.pageSizeOpt')
      if (savedOpt === 'full' || savedOpt === '10') {
        setPageSizeOpt(savedOpt)
      }
    } catch {}
  }, [])

  React.useEffect(() => {
    try {
      localStorage.setItem('toolx.usage.pageSizeOpt', pageSizeOpt)
    } catch {}
  }, [pageSizeOpt])

  React.useEffect(() => {
    // Restore page when not in Full mode; clamp to valid range
    try {
      if (!isFull) {
        const savedPageStr = localStorage.getItem('toolx.usage.page') || '1'
        const savedPage = parseInt(savedPageStr, 10)
        if (Number.isFinite(savedPage)) {
          const clamped = Math.max(1, Math.min(totalPages, savedPage))
          setPage(clamped)
        }
      } else {
        setPage(1)
      }
    } catch {}
    // Re-run when items length or pageSize changes to keep clamp accurate
  }, [isFull, totalPages])

  React.useEffect(() => {
    try {
      localStorage.setItem('toolx.usage.page', String(page))
    } catch {}
  }, [page])

  const handleDragStart = (idx) => (e) => {
    const abs = baseIndex + idx
    setDragIndex(abs)
    e.dataTransfer.effectAllowed = 'move'
    try { e.dataTransfer.setData('text/plain', String(abs)) } catch {}
  }
  const handleDragOver = (idx) => (e) => {
    e.preventDefault()
    const abs = baseIndex + idx
    setOverIndex(abs)
    e.dataTransfer.dropEffect = 'move'
  }
  const handleDrop = (idx) => (e) => {
    e.preventDefault()
    let from = dragIndex
    try {
      const fromStr = e.dataTransfer.getData('text/plain')
      if (from === null && fromStr) from = parseInt(fromStr, 10)
    } catch {}
    if (Number.isInteger(from)) {
      const next = [...items]
      const [moved] = next.splice(from, 1)
      const toAbs = baseIndex + idx
      next.splice(toAbs, 0, moved)
      if (onReorder) onReorder(next)
    }
    setDragIndex(null)
    setOverIndex(null)
  }
  const handleDragEnd = () => {
    setDragIndex(null)
    setOverIndex(null)
  }

  return (
    <div className="usage-list" role="table" aria-label="Danh sách dịch vụ đang dùng">
      {/* Hàng hành động chỉ hiển thị khi có slot truyền vào */}
      {(actionsSttSlot || actionsAmountSlot) && (
        <div
          className="usage-actions-row"
          style={{
            display: 'grid',
            gridTemplateColumns: '40px 2fr 1fr 1fr 1fr 0.8fr 1fr 160px',
            alignItems: 'center',
            gap: 0,
            marginBottom: 4,
          }}
        >
          <div style={{ gridColumn: '1 / 2', display: 'flex', justifyContent: 'flex-start' }}>
            {actionsSttSlot}
          </div>
          <div style={{ gridColumn: '7 / 8', display: 'flex', justifyContent: 'flex-end' }}>
            {actionsAmountSlot}
          </div>
        </div>
      )}
      <div className="usage-header" role="row">
        <div className="usage-col usage-stt" role="columnheader">STT</div>
        <div className="usage-col usage-name" role="columnheader">
          <span className="usage-status-dot placeholder" aria-hidden="true" />
          <span className="usage-service-name">Tên dịch vụ</span>
        </div>
        <div className="usage-col" role="columnheader">Loại dịch vụ</div>
        <div className="usage-col" role="columnheader">Ngày bắt đầu</div>
        <div className="usage-col" role="columnheader">
          <button
            type="button"
            className="sort-button"
            onClick={() => handleSortClick('next')}
            onDoubleClick={() => handleSortDoubleClick('next')}
            aria-label="Sắp xếp theo ngày hết hạn"
          >
            Ngày hết hạn
            {sortBy === 'next' && (
              <span className="sort-indicator" aria-hidden="true">{sortDir === 'asc' ? '▲' : '▼'}</span>
            )}
          </button>
        </div>
        <div className="usage-col usage-status" role="columnheader">Trạng thái</div>
        <div className="usage-col usage-amount" role="columnheader">
          <button
            type="button"
            className="sort-button"
            onClick={() => handleSortClick('amount')}
            onDoubleClick={() => handleSortDoubleClick('amount')}
            aria-label="Sắp xếp theo thành tiền"
          >
            Thành tiền
            {sortBy === 'amount' && (
              <span className="sort-indicator" aria-hidden="true">{sortDir === 'asc' ? '▲' : '▼'}</span>
            )}
          </button>
        </div>
        <div className="usage-col usage-action" role="columnheader" aria-hidden="true"></div>
      </div>
      {pageItems.map((it, idx) => {
        const showHeader = (() => {
          if (!groupMode || !getGroupKey) return false
          const cur = (() => { try { return String(getGroupKey(it) || '') } catch { return '' } })()
          const prevItem = pageItems[idx - 1]
          const prev = prevItem ? (() => { try { return String(getGroupKey(prevItem) || '') } catch { return '' } })() : null
          return !prev || prev !== cur
        })()
        const headerLabel = (() => {
          if (!showHeader) return null
          if (getGroupLabel) { try { return String(getGroupLabel(it) || '') } catch { return null } }
          const k = (() => { try { return String(getGroupKey(it) || '') } catch { return '' } })()
          return k || null
        })()
        const d = daysUntil(it.nextBillingDate)
        let dueTitle = null
        let dueClass = 'next-date'
        if (Number.isFinite(d)) {
          if (d === 0) {
            dueTitle = 'Hết hạn hôm nay'
          } else if (d > 0 && d <= 3) {
            dueTitle = `Còn ${d} ngày`
            dueClass += ' due-urgent'
          } else if (d < 0) {
            dueTitle = `Đã quá hạn ${Math.abs(d)} ngày`
            dueClass += ' due-expired'
          }
        }
        return (
        <div
          key={it.id}
          className={`usage-row ${overIndex === (baseIndex + idx) ? 'drag-over' : ''}`}
          role="row"
          draggable
          onDragStart={handleDragStart(idx)}
          onDragOver={handleDragOver(idx)}
          onDrop={handleDrop(idx)}
          onDragEnd={handleDragEnd}
        >
          {showHeader && headerLabel && (
            <div className="group-header" style={{ gridColumn: '1 / -1' }}>{headerLabel}</div>
          )}
          <div className="usage-col usage-stt" role="cell">{baseIndex + idx + 1}</div>
          <div className="usage-col usage-name" role="cell">
            <span className="usage-status-dot" style={{ backgroundColor: statusColor(it.status) }} />
            <span className="usage-service-name">{it.name}</span>
          </div>
          {/* Meta gộp cho mobile: Loại, Bắt đầu, Hết hạn */}
          <div className="usage-meta mobile-only" role="cell" aria-label="Thông tin dịch vụ">
            <span>Loại: {cycleLabel(it.cycle)}</span>{' '}•{' '}
            <span>Bắt đầu: {fmtDate(it.startDate)}</span>{' '}•{' '}
            <span>Hết hạn: {fmtDate(it.nextBillingDate)}</span>
          </div>
          <div className="usage-col usage-cycle" role="cell">{cycleLabel(it.cycle)}</div>
          <div className="usage-col usage-start" role="cell">{fmtDate(it.startDate)}</div>
          <div className="usage-col usage-next" role="cell">
            <span
              className={dueClass}
              title={dueTitle || undefined}
              aria-label={dueTitle || undefined}
            >
              {fmtDate(it.nextBillingDate)}
            </span>
          </div>
          <div className="usage-col usage-status" role="cell">
            {statusOverride === 'ON' ? (
              <span className="status-badge on" aria-label="ON">ON</span>
            ) : it.canceled ? (
              <span className="status-badge off" aria-label="OFF">OFF</span>
            ) : (
              <span className="status-badge on" aria-label="ON">ON</span>
            )}
          </div>
          <div className="usage-col usage-amount" role="cell">{fmtCurrency(it.cost)}</div>
          <div className="usage-col usage-action" role="cell">
            <span className="action-links" role="group" aria-label="Thao tác">
              <button
                type="button"
                className="link-button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); if (onRenew) onRenew(it) }}
              >
                {'Gia hạn'}
              </button>
              <span className="action-sep" aria-hidden="true"> | </span>
              <button
                type="button"
                className="link-button link-muted"
                disabled={!!it.canceled}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); if (!it.canceled && onCancel) onCancel(it) }}
              >Hủy gói</button>
            </span>
          </div>
        </div>
        )
      })}
      {/* Pagination controls bottom-right */}
      <div className="usage-pagination" role="navigation" aria-label="Phân trang">
        <div className="pagination-inner">
          <label htmlFor="pageSizeSelect" className="pagination-size-label">Hiển thị</label>
          <select
            id="pageSizeSelect"
            className="chip-select"
            aria-label="Số dòng mỗi trang"
            value={pageSizeOpt}
            onChange={(e) => { setPageSizeOpt(e.target.value); setPage(1) }}
          >
            <option value="10">10 dòng</option>
            <option value="full">Full</option>
          </select>
          {!isFull && (
            <button className="chip-button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Trang trước">Trước</button>
          )}
          <span className="pagination-status" aria-live="polite">Trang {page}/{totalPages}</span>
          {!isFull && (
            <button className="chip-button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} aria-label="Trang sau">Sau</button>
          )}
        </div>
      </div>
    </div>
  )
}
  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortDir('asc')
      setPage(1)
    }
  }