import express from 'express'
import cors from 'cors'
import { requestOtpCode, verifyOtpCode } from './services/otpService.js'
import { signJwt } from './utils/jwt.js'
import { getUserSubscriptions, checkExpiringAndNotify, readRowsFromSheets, normalizeRow } from './services/googleSheetsService.js'
import { __getOtpForTest } from './services/testEndpoints.js'
import authRequired from './middlewares/auth.js'
import otpThrottle from './middlewares/otpThrottle.js'
import emailDomainGuard from './middlewares/emailDomainGuard.js'
import suspicion from './middlewares/suspicion.js'
import captchaGuard from './middlewares/captchaGuard.js'
import { sendConfirmNotification } from './services/botNotifier.js'
import { sendReminderEmail } from './services/emailService.js'

const app = express()
app.disable('x-powered-by')
// Try to enable security middlewares if installed; degrade gracefully if not
let helmet
let rateLimit
try { const m = await import('helmet'); helmet = m.default || m } catch {}
try { const m = await import('express-rate-limit'); rateLimit = m.default || m } catch {}
if (helmet) {
  app.use(helmet({
    contentSecurityPolicy: false, // API responses; CSP for HTML can be set at frontend hosting
    crossOriginResourcePolicy: { policy: 'same-site' },
  }))
}
if (rateLimit) {
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
  app.use(limiter)
}
// Route-specific limiter for OTP requests (per email instead of IP)
// This ensures changing email resets the limiter window for that email.
const otpRouteLimiter = rateLimit ? rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req /*, res*/) => {
    try {
      const email = String((req.body && req.body.email) || '').trim().toLowerCase()
      if (email) return `email:${email}`
    } catch {}
    // Fallback to IP when email is missing
    const ip = (req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString()
    return `ip:${ip}`
  },
}) : null
// Limit CORS by env if provided
const allowed = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
app.use(cors({
  origin: (origin, cb) => {
    if (!allowed.length) return cb(null, true)
    if (!origin) return cb(null, true)
    return cb(null, allowed.includes(origin))
  },
  credentials: true,
}))
app.use(express.json())

// Toggle to disable all limits/guards for OTP route (dev/testing only)
const limitsDisabled = String(process.env.LIMITS_DISABLED || '').toLowerCase() === 'true'
const passThrough = (_, __, next) => next()

// Health
app.get('/api/health', (_, res) => res.json({ ok: true }))

// Auth: Request OTP
app.post(
  '/api/auth/request-code',
  limitsDisabled ? passThrough : (otpRouteLimiter ? otpRouteLimiter : passThrough),
  limitsDisabled ? passThrough : emailDomainGuard,
  limitsDisabled ? passThrough : suspicion,
  limitsDisabled ? passThrough : captchaGuard,
  limitsDisabled ? passThrough : otpThrottle,
  async (req, res) => {
  const { email } = req.body || {}
  if (!email) return res.status(400).json({ error: 'Email is required' })
  try {
    await requestOtpCode(email)
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to send OTP' })
  }
}
)

// Auth: Verify OTP -> issue JWT
app.post('/api/auth/verify-code', async (req, res) => {
  const { email, otp } = req.body || {}
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' })
  try {
    const ok = await verifyOtpCode(email, otp)
    if (!ok) return res.status(401).json({ error: 'Invalid or expired OTP' })
    const token = signJwt({ email })
    res.json({ token })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Verification failed' })
  }
})

// Subscriptions: Get by user (email)
// Optionally protect with JWT depending on ENV
const requireAuth = String(process.env.ENABLE_AUTH || '').toLowerCase() === 'true'
const maybeAuth = (req, res, next) => (requireAuth ? authRequired(req, res, next) : next())
app.get('/api/subscriptions', maybeAuth, async (req, res) => {
  const email = req.query.email || (req.user && req.user.email)
  if (!email) return res.status(400).json({ error: 'Email is required' })
  try {
    const subs = await getUserSubscriptions(email)
    res.json({ subscriptions: subs })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to load subscriptions' })
  }
})

// Test-only endpoint to fetch current OTP for an email
if (process.env.NODE_ENV === 'test') {
  app.get('/api/__test__/otp/:email', (req, res) => {
    const code = __getOtpForTest(req.params.email)
    res.json({ otp: code || null })
  })
}

// Optional: expose cron trigger for demo (not scheduled here to avoid side effects in tests)
app.post('/api/__demo__/trigger-reminders', async (_, res) => {
  try {
    await checkExpiringAndNotify(new Date())
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Failed to run reminders' })
  }
})

// Demo: send a sample reminder email to a specific address
app.post('/api/__demo__/send-sample', async (req, res) => {
  try {
    const { email, tag } = req.body || {}
    if (!email) return res.status(400).json({ error: 'email is required' })
    const allowedTags = new Set(['remind-7','remind-4','remind-2','remind-1'])
    const chosenTag = allowedTags.has(String(tag)) ? String(tag) : 'remind-4'
    const daysMap = { 'remind-7': 7, 'remind-4': 4, 'remind-2': 2, 'remind-1': 1 }
    const days = daysMap[chosenTag]
    const next = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    const row = {
      email,
      name: 'ToolX Premium',
      cycle: 'month',
      nextBillingDate: next.toISOString().slice(0, 10),
      cost: 99000,
      status: 'active',
    }
    await sendReminderEmail(email, row, chosenTag)
    res.json({ ok: true, tag: chosenTag })
  } catch (e) {
    console.error('[demo send-sample] error', e)
    res.status(500).json({ error: 'Failed to send sample email' })
  }
})

// Link Preview: fetch metadata (Open Graph/Twitter/meta) from a URL
app.get('/api/link-preview', async (req, res) => {
  try {
    const rawUrl = (req.query.url || '').trim()
    if (!rawUrl) return res.status(400).json({ error: 'url is required' })
    let target
    try { target = new URL(rawUrl) } catch { return res.status(400).json({ error: 'invalid url' }) }

    // Fetch HTML (server-side to bypass CORS)
    const r = await fetch(target.toString(), { redirect: 'follow' })
    if (!r.ok) return res.status(502).json({ error: 'failed to fetch target' })
    const html = await r.text()

    const pickMeta = (name, attr = 'property') => {
      const re = new RegExp(`<meta[^>]+${attr}=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')
      const m = re.exec(html)
      return m && m[1] ? m[1].trim() : ''
    }
    const pickMetaName = (name) => pickMeta(name, 'name')
    const getTitle = () => {
      return (
        pickMeta('og:title') ||
        pickMetaName('twitter:title') ||
        (() => { const m = /<title[^>]*>([^<]+)<\/title>/i.exec(html); return m && m[1] ? m[1].trim() : '' })()
      )
    }
    const getDesc = () => {
      return (
        pickMeta('og:description') ||
        pickMetaName('twitter:description') ||
        (() => { const m = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i.exec(html); return m && m[1] ? m[1].trim() : '' })()
      )
    }
    const getImage = () => {
      const src = pickMeta('og:image') || pickMetaName('twitter:image')
      return src ? src.trim() : ''
    }
    const getSite = () => {
      const ogSite = pickMeta('og:site_name')
      if (ogSite) return ogSite.trim()
      return target.hostname
    }
    const getFavicon = () => {
      // Try link rel icons
      const rels = ['icon', 'shortcut icon', 'apple-touch-icon']
      for (const rel of rels) {
        const re = new RegExp(`<link[^>]+rel=["']${rel}["'][^>]+href=["']([^"']+)["']`, 'i')
        const m = re.exec(html)
        if (m && m[1]) return m[1].trim()
      }
      // Default fallback
      return `${target.origin}/favicon.ico`
    }
    const absolutize = (u) => {
      try {
        if (!u) return ''
        // data URLs are fine as-is
        if (/^data:/i.test(u)) return u
        return new URL(u, target.origin).toString()
      } catch { return '' }
    }

    const payload = {
      ok: true,
      url: target.toString(),
      title: getTitle(),
      description: getDesc(),
      image: absolutize(getImage()),
      siteName: getSite(),
      favicon: absolutize(getFavicon()),
    }
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.json(payload)
  } catch (e) {
    console.error('[link-preview] error', e)
    res.status(500).json({ error: 'internal error' })
  }
})

// Debug: inspect headers and normalized rows read from Google Sheets
app.get('/api/__debug__/normalized', async (_, res) => {
  try {
    const { header, rows } = await readRowsFromSheets()
    const normalized = rows.map((r) => normalizeRow(r, header)).filter(Boolean)
    const canon = header.map((h) => String(h || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ''))
    res.json({ header, canon, rows, normalizedCount: normalized.length, normalized })
  } catch (e) {
    console.error('[debug normalized] error', e)
    res.status(500).json({ error: 'failed to read sheets' })
  }
})

// Notify bot upon successful user confirmation
app.post('/api/notify/confirm', async (req, res) => {
  try {
    const { order } = req.body || {}
    if (!order) return res.status(400).json({ error: 'order is required' })
    try { console.log('[notify confirm] incoming order:', order) } catch {}
    const result = await sendConfirmNotification(order)
    try { console.log('[notify confirm] bot response:', result) } catch {}
    res.json({ ok: true, result })
  } catch (e) {
    console.error('[notify confirm] error', e)
    const status = e.status || 500
    res.status(status).json({ error: e.message || 'failed to notify bot', status, response: e.response })
  }
})

export default app