// In-memory OTP store with expiry
const store = new Map()
const reuseEnabled = String(process.env.OTP_REUSE_ENABLED || 'true').toLowerCase() === 'true'

export function setOtp(email, code, ttlMs = 5 * 60 * 1000) {
  const expiresAt = Date.now() + ttlMs
  store.set(email, { code, expiresAt })
}

export function verifyOtp(email, code) {
  const item = store.get(email)
  if (!item) return false
  const valid = item.code === code && item.expiresAt > Date.now()
  // If reuse is disabled, delete after first successful verification (one-time use)
  if (valid && !reuseEnabled) store.delete(email)
  return valid
}