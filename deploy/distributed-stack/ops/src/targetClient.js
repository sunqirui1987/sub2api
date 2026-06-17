const { performance } = require('perf_hooks')

function unwrapApiResponse(body) {
  if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'code')) {
    if (body.code === 0) return body.data
    throw new Error(body.message || `api error code ${body.code}`)
  }
  return body
}

function createTargetClient(config) {
  async function getJson(target, pathname, params = {}) {
    if (!target) return { ok: false, error: 'target_not_found' }
    if (!target.apiKey) return { ok: false, error: 'admin_api_key_not_configured' }
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
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'x-api-key': target.apiKey
        },
        signal: controller.signal
      })
      const text = await response.text()
      let body = null
      try {
        body = text ? JSON.parse(text) : null
      } catch {
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
    getSnapshot(target, timeRange) {
      return getJson(target, '/api/v1/admin/ops/dashboard/snapshot-v2', { time_range: timeRange || '1h', mode: 'auto' })
    },
    getRealtimeTraffic(target, window) {
      return getJson(target, '/api/v1/admin/ops/realtime-traffic', { window: window || '1min' })
    },
    listDetails(target, type, params) {
      const paths = {
        requests: '/api/v1/admin/ops/requests',
        'request-errors': '/api/v1/admin/ops/request-errors',
        'upstream-errors': '/api/v1/admin/ops/upstream-errors',
        errors: '/api/v1/admin/ops/errors'
      }
      return getJson(target, paths[type] || paths.requests, params)
    },
    getDetail(target, type, id) {
      const safeID = encodeURIComponent(String(id || ''))
      const paths = {
        'request-errors': `/api/v1/admin/ops/request-errors/${safeID}`,
        'upstream-errors': `/api/v1/admin/ops/upstream-errors/${safeID}`,
        errors: `/api/v1/admin/ops/errors/${safeID}`
      }
      return getJson(target, paths[type] || paths['request-errors'])
    },
    getHealth(target) {
      return getJson(target, target.healthPath || '/healthz')
    }
  }
}

module.exports = {
  createTargetClient
}
