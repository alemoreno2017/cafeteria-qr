import jwt from 'jsonwebtoken'
import { config } from './config.js'

export function createAdminToken() {
  return jwt.sign(
    {
      role: 'admin',
      email: config.adminEmail,
    },
    config.jwtSecret,
    { expiresIn: '12h' },
  )
}

export function requireAdmin(request, response, next) {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    response.status(401).json({ message: 'Token ausente' })
    return
  }

  const token = authHeader.slice('Bearer '.length)

  try {
    request.user = jwt.verify(token, config.jwtSecret)
    next()
  } catch (_error) {
    response.status(401).json({ message: 'Token invalido' })
  }
}
