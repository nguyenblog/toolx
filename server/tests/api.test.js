import request from 'supertest'
import app from '../src/app.js'

test('health endpoint works', async () => {
  const res = await request(app).get('/api/health')
  expect(res.status).toBe(200)
  expect(res.body.ok).toBe(true)
})

test('auth request and verify code flow', async () => {
  const email = 'user@example.com'
  const resReq = await request(app).post('/api/auth/request-code').send({ email })
  expect(resReq.status).toBe(200)

  const resOtp = await request(app).get(`/api/__test__/otp/${encodeURIComponent(email)}`)
  expect(resOtp.status).toBe(200)
  const otp = resOtp.body.otp
  expect(otp).toBeTruthy()

  const resVerify = await request(app).post('/api/auth/verify-code').send({ email, otp })
  expect(resVerify.status).toBe(200)
  expect(resVerify.body.token).toBeTruthy()
})

test('subscriptions returns list filtered by email', async () => {
  const email = 'user@example.com'
  const res = await request(app).get(`/api/subscriptions?email=${encodeURIComponent(email)}`)
  expect(res.status).toBe(200)
  expect(Array.isArray(res.body.subscriptions)).toBe(true)
  expect(res.body.subscriptions.length).toBeGreaterThan(0)
})