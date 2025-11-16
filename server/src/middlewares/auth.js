import { verifyJwt } from '../utils/jwt.js'

// Express middleware: bảo vệ API bằng JWT Bearer
// - Lấy token từ header Authorization: "Bearer <token>"
// - Xác thực và gắn payload vào req.user
// - Trả 401 nếu thiếu/không hợp lệ
export default function authRequired(req, res, next) {
  try {
    const h = String(req.headers['authorization'] || '').trim()
    if (!h || !/^Bearer\s+/.test(h)) {
      res.setHeader('WWW-Authenticate', 'Bearer')
      return res.status(401).json({ error: 'authorization required' })
    }
    const token = h.replace(/^Bearer\s+/i, '')
    let payload
    try {
      payload = verifyJwt(token)
    } catch (e) {
      res.setHeader('WWW-Authenticate', 'Bearer error="invalid_token"')
      return res.status(401).json({ error: 'invalid or expired token' })
    }
    req.user = payload || null
    return next()
  } catch (e) {
    return res.status(500).json({ error: 'auth middleware error' })
  }
}