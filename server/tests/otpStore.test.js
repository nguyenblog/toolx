import { setOtp, verifyOtp } from '../src/services/otpStore.js'

test('OTP set and verify succeeds before expiry', () => {
  const email = 'test@demo.local'
  setOtp(email, '123456', 10000)
  expect(verifyOtp(email, '123456')).toBe(true)
})

test('OTP fails after expiry', async () => {
  const email = 'expired@demo.local'
  setOtp(email, '999999', 1)
  await new Promise((r) => setTimeout(r, 10))
  expect(verifyOtp(email, '999999')).toBe(false)
})