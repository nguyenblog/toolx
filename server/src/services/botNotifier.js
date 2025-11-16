import assert from 'assert'

export async function sendConfirmNotification(order) {
  const url = process.env.ZALO_BOT_SEND_URL || ''
  const chatId = process.env.ZALO_BOT_CHAT_ID || ''

  assert(url, 'ZALO_BOT_SEND_URL is required')
  assert(chatId, 'ZALO_BOT_CHAT_ID is required')

  const text = buildText(order)
  try { console.log('[botNotifier] text built:', `\n${text}`) } catch {}
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })

  const ct = (res.headers.get('Content-Type') || '').toLowerCase()
  const data = ct.includes('application/json') ? await res.json().catch(() => ({})) : await res.text().catch(() => '')
  if (!res.ok) {
    const err = typeof data === 'string' ? data : (data && data.description) || 'Failed to send bot message'
    const e = new Error(err)
    e.status = res.status
    e.response = data
    throw e
  }
  return data
}

function buildText(order) {
  try {
    const email = order?.email || ''
    const timeIso = order?.time || ''
    const timeStr = (() => { try { return timeIso ? new Date(timeIso).toLocaleString('vi-VN') : '' } catch { return timeIso || '' } })()
    const name = order?.item?.name || ''
    const cycleRaw = order?.item?.cycle || ''
    const cycleVi = (() => {
      const map = { month: 'Theo tháng', year: 'Theo năm', day: 'Theo ngày' }
      return map[cycleRaw] || cycleRaw || ''
    })()
    const prevExpRaw = order?.prevExpiry || order?.item?.nextBillingDate || ''
    const prevExpStr = (() => { try { return prevExpRaw ? new Date(prevExpRaw).toLocaleDateString('vi-VN') : '' } catch { return prevExpRaw || '' } })()
    const amount = order?.total
    const a = Number(amount)
    const vnd = Number.isFinite(a) ? `${new Intl.NumberFormat('vi-VN').format(a)} VND` : (amount != null ? String(amount) : '')

    return [
      'Bạn có đơn hàng cần gia hạn:',
      ` Email: ${email}`,
      ` Thời gian submit: ${timeStr}`,
      ` Tên dịch vụ: ${name}`,
      ` Loại dịch vụ: ${cycleVi}`,
      ` Ngày hết hạn trước đó: ${prevExpStr}`,
      ` Giá tiền: ${vnd}`,
    ].join('\n')
  } catch (_) {
    return [
      'Bạn có đơn hàng cần gia hạn:',
      ' Email: ',
      ' Thời gian submit: ',
      ' Tên dịch vụ: ',
      ' Loại dịch vụ: ',
      ' Ngày hết hạn trước đó: ',
      ' Giá tiền:',
    ].join('\n')
  }
}