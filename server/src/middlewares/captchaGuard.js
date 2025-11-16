import fetch from 'node-fetch'

function enabled() {
  return String(process.env.CAPTCHA_ENABLED || 'false').toLowerCase() === 'true'
}

function alwaysOn() {
  return String(process.env.CAPTCHA_ALWAYS_ON || 'false').toLowerCase() === 'true'
}

function provider() {
  return String(process.env.CAPTCHA_PROVIDER || 'recaptcha_v3')
}

export default async function captchaGuard(req, res, next) {
  if (process.env.NODE_ENV === 'test') return next()
  if (!enabled()) return next()

  const needCaptcha = alwaysOn() || !!req.suspicious
  if (!needCaptcha) return next()

  const token = req.body?.captchaToken
  if (!token) {
    return res.status(401).json({
      error: 'Yêu cầu CAPTCHA',
      requireCaptcha: true,
      captchaProvider: provider(),
      siteKey: process.env.CAPTCHA_SITE_KEY || null,
    })
  }

  try {
    const prov = provider()
    if (prov === 'recaptcha_v3') {
      const secret = process.env.CAPTCHA_SECRET
      const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret, response: token, remoteip: req.ip || '' }),
      })
      const data = await resp.json()
      const minScore = Number(process.env.CAPTCHA_MIN_SCORE || '0.5')
      if (!data.success || (data.score !== undefined && data.score < minScore)) {
        return res.status(401).json({ error: 'CAPTCHA không hợp lệ', requireCaptcha: true })
      }
    } else if (prov === 'hcaptcha') {
      const secret = process.env.CAPTCHA_SECRET
      const resp = await fetch('https://hcaptcha.com/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret, response: token, remoteip: req.ip || '' }),
      })
      const data = await resp.json()
      if (!data.success) {
        return res.status(401).json({ error: 'CAPTCHA không hợp lệ', requireCaptcha: true })
      }
    } else {
      return res.status(500).json({ error: 'CAPTCHA provider không được hỗ trợ' })
    }
    next()
  } catch (e) {
    console.error('captchaGuard error:', e)
    return res.status(500).json({ error: 'Xác thực CAPTCHA thất bại' })
  }
}