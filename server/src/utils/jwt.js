import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-me'
const EXPIRES_IN = '7d'

export function signJwt(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN })
}

export function verifyJwt(token) {
  try {
    return jwt.verify(token, SECRET)
  } catch (_) {
    return null
  }
}