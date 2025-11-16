// Validate email format and block invalid or disposable domains

const defaultDisposable = new Set([
  'mailinator.com', '10minutemail.com', 'temp-mail.org', 'guerrillamail.com',
  'yopmail.com', 'trashmail.com', 'getnada.com', 'tempmail.dev',
])

function parseList(envName) {
  const raw = process.env[envName]
  if (!raw) return []
  return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
}

export default function emailDomainGuard(req, res, next) {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase()
  if (!email) return res.status(400).json({ error: 'Email is required' })

  const allow = new Set(parseList('EMAIL_ALLOW_DOMAINS'))
  const deny = new Set(parseList('EMAIL_DENY_DOMAINS'))
  const [_, domain] = email.split('@')

  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Email không hợp lệ' })
  }

  if (!domain) {
    return res.status(400).json({ error: 'Domain email không hợp lệ' })
  }

  // Allowlist takes precedence if provided
  if (allow.size > 0 && !allow.has(domain)) {
    return res.status(400).json({ error: 'Domain email không nằm trong danh sách cho phép' })
  }

  // Deny disposable or configured denylist
  const isDisposable = defaultDisposable.has(domain) || deny.has(domain)
  if (isDisposable) {
    return res.status(400).json({ error: 'Domain email không được hỗ trợ' })
  }

  next()
}