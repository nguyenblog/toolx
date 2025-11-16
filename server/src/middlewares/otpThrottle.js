// Simple in-memory throttle per email to prevent OTP spam
// Config via ENV: OTP_MIN_INTERVAL_SEC, OTP_MAX_PER_HOUR, OTP_MAX_PER_DAY

const store = new Map()

export default function otpThrottle(req, res, next) {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase()
  if (!email) return res.status(400).json({ error: 'Email is required' })
  if (process.env.NODE_ENV === 'test') return next()

  const now = Date.now()
  const minIntervalSec = parseInt(process.env.OTP_MIN_INTERVAL_SEC || '30', 10)
  const maxPerHour = parseInt(process.env.OTP_MAX_PER_HOUR || '5', 10)
  const maxPerDay = parseInt(process.env.OTP_MAX_PER_DAY || '20', 10)

  const rec = store.get(email) || { lastAt: 0, hourly: { start: 0, count: 0 }, daily: { start: 0, count: 0 } }

  // Enforce minimum interval between requests
  if (rec.lastAt && (now - rec.lastAt) < minIntervalSec * 1000) {
    const waitMs = minIntervalSec * 1000 - (now - rec.lastAt)
    res.setHeader('Retry-After', Math.ceil(waitMs / 1000))
    return res.status(429).json({ error: 'Vui lòng chờ trước khi yêu cầu OTP tiếp theo', seconds: Math.ceil(waitMs / 1000) })
  }

  // Reset windows if elapsed
  if (!rec.hourly.start || now - rec.hourly.start >= 60 * 60 * 1000) { rec.hourly.start = now; rec.hourly.count = 0 }
  if (!rec.daily.start || now - rec.daily.start >= 24 * 60 * 60 * 1000) { rec.daily.start = now; rec.daily.count = 0 }

  // Enforce hourly limit
  if (rec.hourly.count >= maxPerHour) {
    const remainSec = Math.ceil((rec.hourly.start + 60 * 60 * 1000 - now) / 1000)
    res.setHeader('Retry-After', remainSec)
    return res.status(429).json({ error: 'Bạn đã vượt quá số lần yêu cầu OTP trong 1 giờ', seconds: remainSec })
  }

  // Enforce daily limit
  if (rec.daily.count >= maxPerDay) {
    const remainSec = Math.ceil((rec.daily.start + 24 * 60 * 60 * 1000 - now) / 1000)
    res.setHeader('Retry-After', remainSec)
    return res.status(429).json({ error: 'Bạn đã vượt quá số lần yêu cầu OTP trong 1 ngày', seconds: remainSec })
  }

  // Update counters optimistically to protect against abuse
  rec.lastAt = now
  rec.hourly.count++
  rec.daily.count++
  store.set(email, rec)

  next()
}