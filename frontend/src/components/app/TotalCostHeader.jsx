import React from 'react'

export default function TotalCostHeader({ total, title = 'Tổng chi phí hàng tháng', subtitle = 'Ước tính chi tiêu dịch vụ hiện tại' }) {
  const format = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
  return (
    <div className="total-header">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <div className="total-value">{format.format(total)}</div>
    </div>
  )
}