import React from 'react'

const COLORS = ['#10A37F', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#22C55E', '#E11D48']

export default function PieDonutChart({ items = [], title = 'Tỉ trọng chi phí', metric = 'percent', controlsSlot = null }) {
  const radius = 60
  const stroke = 24
  const size = 160
  const cx = size / 2
  const cy = size / 2
  const C = 2 * Math.PI * radius

  const wrapRef = React.useRef(null)
  const [hoverIdx, setHoverIdx] = React.useState(null)
  const [tooltip, setTooltip] = React.useState({ show: false, x: 0, y: 0, label: '', percent: 0, amount: 0 })

  const groups = React.useMemo(() => {
    const map = new Map()
    items.forEach((it) => {
      const key = it.providerKey || it.name || 'Khác'
      const prev = map.get(key) || { key, label: key, value: 0 }
      map.set(key, { ...prev, value: prev.value + (Number(it.cost) || 0) })
    })
    const arr = Array.from(map.values()).sort((a, b) => b.value - a.value)
    const total = arr.reduce((s, x) => s + x.value, 0)
    return { arr, total }
  }, [items])

  let offset = 0
  const segments = groups.arr.map((g, idx) => {
    const share = groups.total > 0 ? g.value / groups.total : 0
    const len = share * C
    const seg = { color: COLORS[idx % COLORS.length], len, offset, share, g }
    offset += len
    return seg
  })

  const activeSeg = hoverIdx != null ? segments[hoverIdx] : segments[0]

  return (
    <div className="donut-card" role="region" aria-label="Biểu đồ tỉ trọng chi phí" style={{ position: 'relative' }}>
      <div className="donut-title">{title}</div>
      <div className="donut-grid">
        <div className="donut-svg-wrap" ref={wrapRef}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <g transform={`rotate(-90 ${cx} ${cy})`}>
              {segments.map((s, i) => (
                <circle
                  key={`seg-${i}`}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={stroke}
                  strokeLinecap="butt"
                  strokeDasharray={`${s.len} ${C - s.len}`}
                  strokeDashoffset={C - s.offset}
                  style={{ cursor: 'pointer', opacity: hoverIdx == null || hoverIdx === i ? 1 : 0.6 }}
                  onMouseEnter={(e) => {
                    setHoverIdx(i)
                  }}
                  onMouseMove={(e) => {
                    const rect = wrapRef.current?.getBoundingClientRect()
                    const x = e.clientX - (rect?.left || 0)
                    const y = e.clientY - (rect?.top || 0)
                    setTooltip({ show: true, x, y, label: s.g.label, percent: Math.round(s.share * 100), amount: s.g.value })
                  }}
                  onMouseLeave={() => {
                    setHoverIdx(null)
                    setTooltip((t) => ({ ...t, show: false }))
                  }}
                >
                  <title>{`${s.g.label} — ${Math.round(s.share * 100)}%`}</title>
                </circle>
              ))}
              {/* background ring for empty or base */}
              {groups.total === 0 && (
                <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
              )}
            </g>
            {/* center label shows hovered segment if any */}
            {groups.total > 0 && (
              <>
                <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle" fontWeight="700" fontSize="16" fill="currentColor">
                  {metric === 'percent' ? `${Math.round((activeSeg?.share || 0) * 100)}%` : `${(activeSeg?.g?.value || 0).toLocaleString('vi-VN')} ₫`}
                </text>
                {activeSeg?.g?.label && (
                  <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="middle" fontWeight="600" fontSize="12" fill="#6b7280">
                    {activeSeg.g.label}
                  </text>
                )}
              </>
            )}
          </svg>
          {tooltip.show && (
            <div className="donut-tooltip" style={{ left: tooltip.x + 10, top: tooltip.y + 10 }}>
              <div style={{ fontWeight: 700 }}>{tooltip.label}</div>
              <div>{metric === 'percent' ? `${tooltip.percent}%` : `${(tooltip.amount || 0).toLocaleString('vi-VN')} ₫`}</div>
            </div>
          )}
        </div>
        <div className="donut-legend">
          {segments.slice(0, 5).map((s, i) => (
            <div className="legend-item" key={`lg-${i}`}>
              <span className="legend-dot" style={{ background: s.color }} />
              <span className="legend-label">{s.g.label}</span>
              <span className="legend-value">{metric === 'percent' ? `${Math.round(s.share * 100)}%` : `${(s.g.value || 0).toLocaleString('vi-VN')} ₫`}</span>
            </div>
          ))}
          {segments.length > 5 && (
            <div className="legend-item more">+ {segments.length - 5} mục khác</div>
          )}
        </div>
      </div>
      {controlsSlot && (
        <div className="chart-controls" style={{ position: 'absolute', right: 8, bottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          {controlsSlot}
        </div>
      )}
    </div>
  )
}