const { performance } = require('perf_hooks')

// 目标管理接口通常返回统一信封 { code, data, message }。
// 状态计算只需要 data；如果 code 非 0，则应当作为目标查询失败暴露出来。
function unwrapApiResponse(body) {
  if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'code')) {
    if (body.code === 0) return body.data
    throw new Error(body.message || `api error code ${body.code}`)
  }
  return body
}

function createTargetClient(config) {
  // 所有目标读取都走这个 helper，确保超时、鉴权头、JSON 解析、延迟记录
  // 和错误结构在三类 ops 查询中完全一致。
  async function getJson(target, pathname, params = {}) {
    if (!target) return { ok: false, error: 'target_not_found' }
    if (!target.authKey) return { ok: false, error: 'target_auth_key_not_configured' }
    if (typeof fetch !== 'function') return { ok: false, error: 'fetch_unavailable' }

    const url = new URL(pathname, target.baseUrl)
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), config.targetTimeoutMs)
    const started = performance.now()
    try {
      // 目标密钥 target.authKey 是目标 Sub2API 的管理员 API Key，只在服务端用于
      // 查询目标 admin ops；对调度器只返回脱敏后的目标元数据。
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'x-api-key': target.authKey
        },
        signal: controller.signal
      })
      const text = await response.text()
      let body = null
      try {
        body = text ? JSON.parse(text) : null
      } catch {
        // 响应解析失败时只保留有限长度的原文片段，既方便排障，
        // 又避免把大响应塞进内存或日志。
        body = { raw: text.slice(0, 500) }
      }
      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          latency_ms: Math.round(performance.now() - started),
          error: body && body.message ? body.message : `HTTP ${response.status}`,
          body
        }
      }
      return {
        ok: true,
        status: response.status,
        latency_ms: Math.round(performance.now() - started),
        data: unwrapApiResponse(body)
      }
    } catch (err) {
      return {
        ok: false,
        latency_ms: Math.round(performance.now() - started),
        error: err && err.name === 'AbortError' ? 'timeout' : String(err && err.message ? err.message : err)
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  return {
    // 请求总数是不可以用率计算的分母。
    listRequests(target, params) {
      return getJson(target, '/api/v1/admin/ops/requests', params)
    },
    // 指定状态码的 provider/upstream 错误是主要分子。
    // 后端 view=errors 会排除业务限制类错误。
    listUpstreamErrors(target, params) {
      return getJson(target, '/api/v1/admin/ops/upstream-errors', params)
    },
    // 账号不可用错误是账号池容量/路由失败，不一定有上游 HTTP
    // 响应，因此需要从 request-errors 里单独查询。
    listRequestErrors(target, params) {
      return getJson(target, '/api/v1/admin/ops/request-errors', params)
    }
  }
}

module.exports = {
  createTargetClient,
  unwrapApiResponse
}
