import nodemailer from 'nodemailer'

// Send OTP via SMTP (Gmail App Password recommended)
export async function sendOtpEmail(email, code) {
  // Skip actual sending in test environment
  if (process.env.NODE_ENV === 'test') {
    console.log(`[Email:test] OTP ${code} to ${email}`)
    return true
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = Number(process.env.SMTP_PORT || 465)
  const secure = port === 465
  const user = process.env.SMTP_USER || ''
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '')
  const from = process.env.SMTP_FROM || user

  if (!user || !pass) {
    console.warn('[Email] SMTP credentials missing; falling back to console log')
    console.log(`[Email:fallback] OTP ${code} to ${email}`)
    return true
  }

  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } })

  const subject = 'ToolX OTP Code'
  const html = `
    <div style="font-family:Arial, sans-serif;line-height:1.6">
      <h2>ToolX Verification</h2>
      <p>Mã OTP của bạn là:</p>
      <div style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</div>
      <p>Mã có hiệu lực trong 5 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    </div>
  `
  const text = `ToolX Verification\nOTP: ${code}\nValid for 5 minutes.`

  try {
    await transporter.sendMail({ from, to: email, subject, text, html })
    return true
  } catch (e) {
    // Dev-friendly fallback: không làm thất bại toàn bộ luồng nếu SMTP gặp lỗi
    console.warn('[Email] SMTP send failed, falling back to console:', e?.message || e)
    console.log(`[Email:fallback] OTP ${code} to ${email}`)
    return true
  }
}

// Send renewal reminder via SMTP
// tag: 'remind-5' | 'remind-1'
export async function sendReminderEmail(toEmail, row, tag) {
  if (process.env.NODE_ENV === 'test') {
    console.log(`[Email:test] Reminder ${tag} to ${toEmail} for ${row?.name}`)
    return true
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = Number(process.env.SMTP_PORT || 465)
  const secure = port === 465
  const user = process.env.SMTP_USER || ''
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '')
  const from = process.env.SMTP_FROM || user
  const cc = process.env.ALERT_CC || ''

  if (!user || !pass) {
    console.warn('[Email] SMTP credentials missing; reminder fallback to console log')
    console.log(`[Email:fallback] Reminder ${tag} to ${toEmail} for ${row?.name}`)
    return true
  }

  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } })

  const tagDays = { 'remind-7': 7, 'remind-4': 4, 'remind-2': 2, 'remind-1': 1 }
  const days = tagDays[tag] ?? null
  const subject = days != null
    ? `ToolX • Nhắc gia hạn ${row?.name} (${days} ngày nữa)`
    : `ToolX • Nhắc gia hạn ${row?.name}`

  const nextStr = (() => { try { return row?.nextBillingDate ? new Date(row.nextBillingDate).toLocaleDateString('vi-VN') : '' } catch { return row?.nextBillingDate || '' } })()
  const amount = Number(row?.cost)
  const amountVnd = Number.isFinite(amount) ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount) : ''
  const cycleVi = (() => {
    const c = String(row?.cycle || '').toLowerCase()
    if (c === 'year') return 'Theo năm'
    if (c === 'day') return 'Theo ngày'
    return 'Theo tháng'
  })()

  const baseUrl = process.env.CTA_RENEW_URL || ''
  const supportEmail = process.env.SUPPORT_EMAIL || ''
  const logoUrl = process.env.LOGO_URL || ''
  const renewUrl = baseUrl ? `${baseUrl}?email=${encodeURIComponent(row?.email || '')}&service=${encodeURIComponent(row?.name || '')}` : ''

  const preheader = `Gia hạn ${row?.name || ''} trước ngày ${nextStr}`
  const html = `
  <div style="margin:0;padding:0;background:#f5f7fb">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f7fb">
      <tr>
        <td align="center" style="padding:24px 12px">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background:#ffffff;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.06);overflow:hidden">
            <tr>
              <td style="background:#111827;color:#ffffff;padding:20px 24px">
                <div style="display:flex;align-items:center;gap:12px">
                  ${logoUrl ? `<img src="${logoUrl}" alt="ToolX" width="28" height="28" style="display:block"/>` : ''}
                  <span style="font-size:18px;font-weight:700;letter-spacing:.3px">ToolX</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px">
                <div style="font-family:Arial,Helvetica,sans-serif;color:#111827">
                  <p style="margin:0 0 4px;color:#6b7280;font-size:13px">${preheader}</p>
                  <h2 style="margin:0 0 12px;font-size:22px">Nhắc gia hạn dịch vụ</h2>
                  <p style="margin:0 0 16px">Xin chào ${row?.email || ''}, dịch vụ <strong>${row?.name || ''}</strong> sẽ đến hạn ${days === 1 ? 'trong <strong>1 ngày</strong>' : `trong <strong>${days} ngày</strong>`}.</p>
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e5e7eb;border-radius:8px">
                    <tr>
                      <td style="padding:12px 16px;width:40%;color:#6b7280">Chu kỳ</td>
                      <td style="padding:12px 16px;color:#111827">${cycleVi}</td>
                    </tr>
                    <tr style="background:#f9fafb">
                      <td style="padding:12px 16px;width:40%;color:#6b7280">Ngày đến hạn</td>
                      <td style="padding:12px 16px;color:#111827">${nextStr}</td>
                    </tr>
                    <tr>
                      <td style="padding:12px 16px;width:40%;color:#6b7280">Giá tiền</td>
                      <td style="padding:12px 16px;color:#111827">${amountVnd}</td>
                    </tr>
                  </table>
                  ${renewUrl ? `<div style="margin:20px 0"><a href="${renewUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600">Gia hạn ngay</a></div>` : ''}
                  ${supportEmail ? `<p style="margin:0;color:#6b7280;font-size:13px">Cần hỗ trợ? Liên hệ <a href="mailto:${supportEmail}" style="color:#2563eb;text-decoration:none">${supportEmail}</a>.</p>` : ''}
                </div>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e5e7eb;padding:16px 24px;color:#6b7280;font-size:12px">© ToolX • Email tự động, vui lòng bỏ qua nếu đã gia hạn.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`
  const text = `Nhắc gia hạn dịch vụ\nDịch vụ: ${row?.name || ''}\nCòn: ${days ?? ''} ngày\nChu kỳ: ${cycleVi}\nNgày đến hạn: ${nextStr}\nGiá tiền: ${amountVnd}${renewUrl ? `\nGia hạn: ${renewUrl}` : ''}`

  const mail = { from, to: toEmail, subject, text, html }
  if (cc) mail.cc = cc

  try {
    await transporter.sendMail(mail)
    return true
  } catch (e) {
    console.warn('[Email] Reminder send failed, fallback to console:', e?.message || e)
    console.log(`[Email:fallback] Reminder ${tag} to ${toEmail} for ${row?.name}`)
    return true
  }
}