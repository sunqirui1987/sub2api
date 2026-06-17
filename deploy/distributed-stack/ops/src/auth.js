const crypto = require('crypto')

const sessions = new Map()

function cookiePath(config) {
  return config.pagePath || '/'
}

function parseCookies(req) {
  const header = req.headers.cookie || ''
  const cookies = {}
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index <= 0) continue
    const key = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (key) cookies[key] = decodeURIComponent(value)
  }
  return cookies
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''))
  const right = Buffer.from(String(b || ''))
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

function purgeExpired() {
  const now = Date.now()
  for (const [token, session] of sessions.entries()) {
    if (!session || session.expiresAt <= now) sessions.delete(token)
  }
}

function isAuthenticated(req, config) {
  purgeExpired()
  const token = parseCookies(req)[config.authCookieName]
  const session = token ? sessions.get(token) : null
  if (!session || session.expiresAt <= Date.now()) return false
  session.expiresAt = Date.now() + config.authSessionTtlMs
  return true
}

function createSession(res, config) {
  purgeExpired()
  const token = crypto.randomBytes(32).toString('hex')
  const maxAge = Math.floor(config.authSessionTtlMs / 1000)
  sessions.set(token, { expiresAt: Date.now() + config.authSessionTtlMs })
  res.setHeader('set-cookie', `${config.authCookieName}=${encodeURIComponent(token)}; Path=${cookiePath(config)}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`)
}

function destroySession(req, res, config) {
  const token = parseCookies(req)[config.authCookieName]
  if (token) sessions.delete(token)
  res.setHeader('set-cookie', `${config.authCookieName}=; Path=${cookiePath(config)}; Max-Age=0; HttpOnly; SameSite=Lax`)
}

function verifyCredentials(config, username, password) {
  return safeEqual(username, config.authUsername) && safeEqual(password, config.authPassword)
}

module.exports = {
  createSession,
  destroySession,
  isAuthenticated,
  verifyCredentials
}
