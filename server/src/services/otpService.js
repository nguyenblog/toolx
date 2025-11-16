import { setOtp, verifyOtp } from './otpStore.js'
import { sendOtpEmail } from './emailService.js'
import { __rememberOtp } from './testEndpoints.js'

export async function requestOtpCode(email) {
  const code = generateOtp(6)
  setOtp(email, code)
  if (process.env.NODE_ENV === 'test') {
    __rememberOtp(email, code)
  }
  await sendOtpEmail(email, code)
}

export async function verifyOtpCode(email, code) {
  return verifyOtp(email, code)
}

function generateOtp(length = 6) {
  const digits = '0123456789'
  let out = ''
  for (let i = 0; i < length; i++) out += digits[Math.floor(Math.random() * digits.length)]
  return out
}