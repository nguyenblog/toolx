// Test utilities and endpoints (only used in NODE_ENV=test)
import { setOtp } from './otpStore.js'

let lastOtps = new Map()

export function __rememberOtp(email, code) {
  lastOtps.set(email, code)
}

export function __getOtpForTest(email) {
  return lastOtps.get(email)
}

// Monkey patch setOtp to remember codes in test env
if (process.env.NODE_ENV === 'test') {
  const originalSetOtp = setOtp
  // override setOtp to remember OTPs
  // Note: ESLint disabled in MVP; make sure original behavior remains.
  // We cannot reassign imported function directly; tests will call requestOtpCode which uses setOtp internally.
}