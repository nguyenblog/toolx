import { signJwt, verifyJwt } from '../src/utils/jwt.js'

test('sign and verify jwt', () => {
  const token = signJwt({ email: 'user@example.com' })
  const decoded = verifyJwt(token)
  expect(decoded.email).toBe('user@example.com')
})

test('verify returns null on invalid token', () => {
  expect(verifyJwt('invalid.token.here')).toBeNull()
})