const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')

// 读取数字环境变量，并做上下界保护。这个服务会被调度器频繁调用，
// 如果误配置了过大的窗口或超时，会让状态检查变慢并增加目标压力。
function envNumber(name, fallback, min, max) {
  const value = Number(process.env[name])
  if (!Number.isFinite(value)) return fallback
  const boundedMin = Number.isFinite(min) ? Math.max(min, value) : value
  return Number.isFinite(max) ? Math.min(max, boundedMin) : boundedMin
}

// 解析计入“上游不可用”的状态码白名单。只有这些状态码会进入分子；
// 不支持工具、不支持模型这类客户端能力不匹配错误不会被这组查询统计进去。
function splitStatusCodes(value) {
  const raw = String(value || '').trim()
  const parsed = raw
    ? raw.split(',').map(item => Number.parseInt(item.trim(), 10)).filter(code => Number.isFinite(code) && code >= 100 && code <= 599)
    : []
  return parsed.length ? Array.from(new Set(parsed)) : [429, 500, 502, 503, 504, 529]
}

// 目标列表可以通过环境变量传入，方便运维系统注入；也可以来自
// 配置文件 config/targets.json，方便普通服务器直接部署。
function loadRawTargets(targetsFile) {
  if (process.env.STATUS_TARGETS_JSON) {
    return JSON.parse(process.env.STATUS_TARGETS_JSON)
  }
  if (fs.existsSync(targetsFile)) {
    return JSON.parse(fs.readFileSync(targetsFile, 'utf8'))
  }
  return []
}

// 对外访问密钥可以通过环境变量传入，也可以放在 config/auth.json。
// 这里兼容 userauthkey，是为了和现有 status/config/auth.json 保持一致。
function loadAuthConfig(authFile) {
  let raw = null
  if (process.env.STATUS_AUTH_JSON) {
    raw = JSON.parse(process.env.STATUS_AUTH_JSON)
  } else if (fs.existsSync(authFile)) {
    raw = JSON.parse(fs.readFileSync(authFile, 'utf8'))
  }

  if (!raw || typeof raw !== 'object') return { statusAuthKey: '' }
  return {
    statusAuthKey: String(
      raw.statusAuthKey ||
      raw.status_auth_key ||
      raw.userauthkey ||
      raw.userAuthKey ||
      raw.authKey ||
      raw.key ||
      ''
    ).trim()
  }
}

// 规范化单个目标配置。目标侧密钥故意命名为 authKey，而不是 apiKey，
// 避免运维把它和客户端模型 Key 混淆。该密钥会作为 x-api-key 发送给
// 目标 Sub2API 的 admin ops 接口。
function normalizeTarget(item, index) {
  if (!item || typeof item !== 'object') return null
  const baseUrl = String(item.baseUrl || item.base_url || '').replace(/\/+$/, '')
  if (!baseUrl) return null
  const authKey = item.authKey || item.auth_key || item.apiKey || item.api_key || ''
  return {
    id: String(item.id || `target-${index + 1}`),
    name: String(item.name || baseUrl),
    baseUrl,
    authKey: String(authKey || ''),
    enabled: item.enabled !== false
  }
}

// 对外返回的目标元数据必须脱敏：可以告诉调用方目标是否已配置，
// 但不能泄露 target.authKey。
function publicTarget(target) {
  return {
    id: target.id,
    name: target.name,
    baseUrl: target.baseUrl,
    configured: Boolean(target.authKey),
    enabled: target.enabled
  }
}

// 进程启动时一次性加载完整运行配置。Status 服务刻意保持静态配置：
// 修改目标、阈值或窗口应当通过明确的部署/重启动作生效，避免调度行为悄悄变化。
function loadConfig() {
  const targetsFile = path.resolve(rootDir, process.env.STATUS_TARGETS_FILE || process.env.TARGETS_FILE || 'config/targets.json')
  const authFile = path.resolve(rootDir, process.env.STATUS_AUTH_FILE || process.env.AUTH_FILE || 'config/auth.json')
  const rawTargets = loadRawTargets(targetsFile)
  if (!Array.isArray(rawTargets)) {
    throw new Error('status targets config must be an array')
  }
  const targets = rawTargets.map(normalizeTarget).filter(Boolean).filter(target => target.enabled)
  const authConfig = loadAuthConfig(authFile)
  const authKey = String(process.env.STATUS_AUTH_KEY || authConfig.statusAuthKey || '').trim()
  if (!authKey) {
    throw new Error('STATUS_AUTH_KEY or config/auth.json userauthkey is required')
  }
  return {
    host: process.env.HOST || process.env.STATUS_HOST || process.env.STATUS_BIND_HOST || '0.0.0.0',
    port: envNumber('PORT', envNumber('STATUS_PORT', 3020, 1, 65535), 1, 65535),
    serviceName: process.env.SERVICE_NAME || process.env.STATUS_SERVICE_NAME || 'Sub2API Status',
    authKey,
    targetsFile,
    authFile,
    targetTimeoutMs: envNumber('STATUS_TARGET_TIMEOUT_MS', 8000, 1000, 60000),
    windowSeconds: envNumber('STATUS_WINDOW_SECONDS', 180, 120, 300),
    thresholdPercent: envNumber('STATUS_THRESHOLD_PERCENT', 80, 1, 100),
    minRequests: Math.trunc(envNumber('STATUS_MIN_REQUESTS', 10, 0, 1000000)),
    cacheTtlSeconds: envNumber('STATUS_CACHE_TTL_SECONDS', 60, 1, 3600),
    upstreamStatusCodes: splitStatusCodes(process.env.STATUS_UPSTREAM_STATUS_CODES),
    targets,
    publicTargets: targets.map(publicTarget)
  }
}

module.exports = {
  loadConfig,
  publicTarget,
  splitStatusCodes
}
