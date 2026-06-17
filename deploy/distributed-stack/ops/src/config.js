const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')

function envNumber(name, fallback, min) {
  const value = Number(process.env[name])
  if (!Number.isFinite(value)) return fallback
  return Math.max(min, value)
}

function normalizePath(value, fallback) {
  const raw = String(value || fallback)
  if (raw === '/') return ''
  return raw.startsWith('/') ? raw.replace(/\/+$/, '') : `/${raw.replace(/\/+$/, '')}`
}

function loadRawTargets(config) {
  if (process.env.OPS_TARGETS_JSON) {
    return JSON.parse(process.env.OPS_TARGETS_JSON)
  }

  if (fs.existsSync(config.targetsFile)) {
    return JSON.parse(fs.readFileSync(config.targetsFile, 'utf8'))
  }

  return [
    {
      id: 'qn-codex',
      name: 'qn-codex.tapsvc.com',
      baseUrl: 'https://qn-codex.tapsvc.com',
      apiKey: ''
    },
    {
      id: 'qn-codex-8002',
      name: 'qn-codex.tapsvc.com:8002',
      baseUrl: 'https://qn-codex.tapsvc.com:8002',
      apiKey: ''
    }
  ]
}

function loadAuthConfig(config) {
  const fallback = {
    username: process.env.OPS_USERNAME || 'admin',
    password: process.env.OPS_PASSWORD || 'sub2api-ops',
    cookieName: process.env.OPS_COOKIE_NAME || 'sub2api_ops_session',
    sessionTtlSeconds: envNumber('OPS_SESSION_TTL_SECONDS', 12 * 60 * 60, 60)
  }

  let raw = null
  if (process.env.OPS_AUTH_JSON) {
    raw = JSON.parse(process.env.OPS_AUTH_JSON)
  } else if (fs.existsSync(config.authFile)) {
    raw = JSON.parse(fs.readFileSync(config.authFile, 'utf8'))
  }

  if (!raw || typeof raw !== 'object') return fallback
  return {
    username: String(raw.username || raw.user || fallback.username),
    password: String(raw.password || fallback.password),
    cookieName: String(raw.cookieName || raw.cookie_name || fallback.cookieName),
    sessionTtlSeconds: envNumber('OPS_SESSION_TTL_SECONDS', Number(raw.sessionTtlSeconds || raw.session_ttl_seconds || fallback.sessionTtlSeconds), 60)
  }
}

function normalizeTarget(item, index) {
  if (!item || typeof item !== 'object') return null
  const baseUrl = String(item.baseUrl || item.base_url || '').replace(/\/+$/, '')
  if (!baseUrl) return null
  const apiKey = item.apiKey || item.api_key || ''
  return {
    id: String(item.id || `target-${index + 1}`),
    name: String(item.name || baseUrl),
    baseUrl,
    apiKey: String(apiKey || ''),
    healthPath: String(item.healthPath || item.health_path || '/healthz'),
    enabled: item.enabled !== false
  }
}

function publicTarget(target) {
  return {
    id: target.id,
    name: target.name,
    baseUrl: target.baseUrl,
    configured: Boolean(target.apiKey),
    enabled: target.enabled
  }
}

function loadConfig() {
  const config = {
    host: process.env.HOST || '0.0.0.0',
    port: envNumber('PORT', 3010, 1),
    pagePath: normalizePath(process.env.PAGE_PATH, '/admin/ops'),
    serviceName: process.env.SERVICE_NAME || 'Sub2API Ops',
    refreshSeconds: envNumber('REFRESH_SECONDS', 5, 1),
    targetTimeoutMs: envNumber('TARGET_TIMEOUT_MS', 8000, 1000),
    targetsFile: path.resolve(rootDir, process.env.TARGETS_FILE || 'config/targets.json'),
    authFile: path.resolve(rootDir, process.env.AUTH_FILE || 'config/auth.json')
  }

  const authConfig = loadAuthConfig(config)
  const rawTargets = loadRawTargets(config)
  if (!Array.isArray(rawTargets)) {
    throw new Error('targets config must be an array')
  }

  const targets = rawTargets.map(normalizeTarget).filter(Boolean).filter(target => target.enabled)
  return {
    ...config,
    authUsername: authConfig.username,
    authPassword: authConfig.password,
    authCookieName: authConfig.cookieName,
    authSessionTtlMs: authConfig.sessionTtlSeconds * 1000,
    targets,
    publicTargets: targets.map(publicTarget)
  }
}

module.exports = {
  loadConfig,
  publicTarget
}
