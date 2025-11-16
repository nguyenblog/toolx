import React from 'react'
import Button from '../ui/Button.jsx'
import { downloadICS } from '../../utils/ics.js'

export default function SubscriptionCard({ data, onRenew }) {
  const { name, nextBillingDate, cost, status } = data
  const format = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })

  return (
    <div className={`card ${status}`}>
      <div className="card-main">
        <div className="card-title">{name}</div>
        <div className="card-sub">Hạn thanh toán: {nextBillingDate}</div>
      </div>
      <div className="card-actions">
        <div className="price">{format.format(cost)}</div>
        <Button variant="primary" onClick={onRenew}>Gia Hạn Nhanh</Button>
        <Button variant="ghost" onClick={() => downloadICS({
          title: `${name} - Thanh toán`,
          date: nextBillingDate,
          description: `Thanh toán định kỳ cho ${name}`,
        })}>Thêm vào Lịch</Button>
      </div>
    </div>
  )
}