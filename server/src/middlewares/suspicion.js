// Mark IP/email as suspicious and auto-lock on attack signals

const ipStats = new Map()
const emailStats = new Map()
const locks = new Map() // key: ip or email -> unlockAt timestamp

function getCfg(name, def) {
  const v = process.env[name]
  if (v === undefined) return def
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

export default function suspicion(req, res, next) {
  const now = Date.now()
  const ip = (req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString()
  const email = String((req.body && req.body.email) || '').trim().toLowerCase()

  // Configs
  const emailsPerMinThreshold = getCfg('SUSPICIOUS_IP_EMAILS_PER_MIN', 5)
  const invalidDomainPenalty = getCfg('SUSPICIOUS_INVALID_DOMAIN_PENALTY', 2)
  const lockMinutes = getCfg('LOCK_MINUTES', 15)
  const lockThreshold = getCfg('LOCK_THRESHOLD', 10)

  const ipRec = ipStats.get(ip) || { start: now, count: 0, emails: new Set(), score: 0 }
  const emailRec = emailStats.get(email) || { start: now, count: 0, score: 0 }

  // Reset window every minute
  if (now - ipRec.start >= 60 * 1000) { ipRec.start = now; ipRec.count = 0; ipRec.emails.clear() }
  if (now - emailRec.start >= 60 * 1000) { emailRec.start = now; emailRec.count = 0 }

  ipRec.count++
  if (email) ipRec.emails.add(email)
  emailRec.count++

  // Detect high churn of emails from same IP
  if (ipRec.emails.size >= emailsPerMinThreshold) {
    ipRec.score += 3
  }

  // If previous middleware flagged invalid domain via header, penalize
  if (req.headers['x-invalid-email-domain'] === '1') {
    ipRec.score += invalidDomainPenalty
    emailRec.score += invalidDomainPenalty
  }

  ipStats.set(ip, ipRec)
  emailStats.set(email, emailRec)

  const ipLock = locks.get(`ip:${ip}`)
  const emailLock = locks.get(`email:${email}`)
  const locked = (ipLock && ipLock > now) || (emailLock && emailLock > now)

  if (locked) {
    const until = Math.max(ipLock || 0, emailLock || 0)
    const remainSec = Math.ceil((until - now) / 1000)
    res.setHeader('Retry-After', remainSec)
    return res.status(403).json({ error: 'Tạm khóa do dấu hiệu tấn công', seconds: remainSec })
  }

  const score = Math.max(ipRec.score, emailRec.score)
  if (score >= lockThreshold) {
    const unlockAt = now + lockMinutes * 60 * 1000
    locks.set(`ip:${ip}`, unlockAt)
    if (email) locks.set(`email:${email}`, unlockAt)
    const remainSec = Math.ceil((unlockAt - now) / 1000)
    res.setHeader('Retry-After', remainSec)
    return res.status(403).json({ error: 'Tạm khóa do dấu hiệu tấn công', seconds: remainSec })
  }

  // Mark as suspicious to require CAPTCHA
  req.suspicious = score >= 3
  next()
}