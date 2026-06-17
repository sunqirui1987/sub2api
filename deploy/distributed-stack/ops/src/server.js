const http = require('http')
const { createSession, destroySession, isAuthenticated, verifyCredentials } = require('./auth')
const { loadConfig } = require('./config')
const { json, html, nowIso } = require('./format')
const { createLocalMetrics } = require('./localMetrics')
const { renderLoginPage, renderPage } = require('./render')
const { buildSnapshot } = require('./snapshot')
const { createTargetClient } = require('./targetClient')

const config = loadConfig()
const localMetrics = createLocalMetrics()
const targetClient = createTargetClient(config)

function notFound(res) {
  json(res, 404, { ok: false, error: 'not_found' })
}

function redirect(res, location) {
  res.writeHead(303, {
    location,
    'cache-control': 'no-store'
  })
  res.end()
}

function clampInteger(value, fallback, min, max) {
  const number = Number.parseInt(value, 10)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

function readForm(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk
      if (body.length > 8192) {
        reject(new Error('request_too_large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(new URLSearchParams(body)))
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  localMetrics.recordRequest(req)

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)

    if (req.method === 'GET' && (url.pathname === config.pagePath || url.pathname === `${config.pagePath}/`)) {
      if (!isAuthenticated(req, config)) {
        html(res, renderLoginPage(config, Boolean(url.searchParams.get('error'))))
        return
      }
      html(res, renderPage(config))
      return
    }

    if (req.method === 'POST' && url.pathname === `${config.pagePath}/login`) {
      const form = await readForm(req)
      if (verifyCredentials(config, form.get('username'), form.get('password'))) {
        createSession(res, config)
        redirect(res, config.pagePath || '/')
        return
      }
      html(res, renderLoginPage(config, true))
      return
    }

    if (req.method === 'POST' && url.pathname === `${config.pagePath}/logout`) {
      destroySession(req, res, config)
      redirect(res, config.pagePath || '/')
      return
    }

    if (url.pathname.startsWith(`${config.pagePath}/api/`) && !isAuthenticated(req, config)) {
      json(res, 401, { ok: false, error: 'unauthorized' })
      return
    }

    if (req.method === 'GET' && url.pathname === `${config.pagePath}/api/targets`) {
      json(res, 200, config.publicTargets)
      return
    }

    if (req.method === 'GET' && url.pathname === `${config.pagePath}/api/snapshot`) {
      const snapshot = await buildSnapshot({
        config,
        targetClient,
        localMetrics,
        targetID: url.searchParams.get('target'),
        timeRange: url.searchParams.get('time_range') || '1h'
      })
      json(res, 200, snapshot)
      return
    }

    if (req.method === 'GET' && url.pathname === `${config.pagePath}/api/realtime`) {
      const target = config.targets.find(item => item.id === url.searchParams.get('target')) || config.targets[0]
      const result = await targetClient.getRealtimeTraffic(target, url.searchParams.get('window') || '1min')
      json(res, result.ok ? 200 : 502, result)
      return
    }

    if (req.method === 'GET' && url.pathname === `${config.pagePath}/api/details`) {
      const target = config.targets.find(item => item.id === url.searchParams.get('target')) || config.targets[0]
      const type = url.searchParams.get('type') || 'requests'
      const params = {
        time_range: url.searchParams.get('time_range') || '1h',
        page: String(clampInteger(url.searchParams.get('page'), 1, 1, 100000)),
        page_size: String(clampInteger(url.searchParams.get('page_size'), 100, 20, 500)),
        sort: url.searchParams.get('sort') || 'created_at_desc',
        kind: url.searchParams.get('kind') || undefined,
        view: url.searchParams.get('view') || undefined,
        status: url.searchParams.get('status') || undefined,
        status_code: url.searchParams.get('status_code') || undefined,
        platform: url.searchParams.get('platform') || undefined,
        model: url.searchParams.get('model') || undefined,
        request_id: url.searchParams.get('request_id') || undefined,
        keyword: url.searchParams.get('keyword') || undefined
      }
      const result = await targetClient.listDetails(target, type, params)
      json(res, result.ok ? 200 : 502, result)
      return
    }

    if (req.method === 'GET' && url.pathname === `${config.pagePath}/api/error-detail`) {
      const target = config.targets.find(item => item.id === url.searchParams.get('target')) || config.targets[0]
      const id = url.searchParams.get('id')
      if (!id) {
        json(res, 400, { ok: false, error: 'id_required' })
        return
      }
      const requestedType = url.searchParams.get('type') || 'request-errors'
      const type = requestedType === 'upstream' ? 'upstream-errors' : requestedType === 'errors' ? 'request-errors' : requestedType
      const result = await targetClient.getDetail(target, type, id)
      json(res, result.ok ? 200 : 502, result)
      return
    }

    if (req.method === 'GET' && url.pathname === '/healthz') {
      json(res, 200, {
        ok: true,
        service: config.serviceName,
        targets: config.publicTargets.length,
        generated_at: nowIso()
      })
      return
    }

    notFound(res)
  } catch (err) {
    localMetrics.recordError()
    json(res, 500, {
      ok: false,
      error: String(err && err.message ? err.message : err)
    })
  }
})

server.on('clientError', (_err, socket) => {
  localMetrics.recordError()
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
})

server.on('error', err => {
  console.error(JSON.stringify({
    ts: nowIso(),
    level: 'error',
    message: 'ops server failed',
    error: err.message
  }))
  process.exitCode = 1
})

server.listen(config.port, config.host, () => {
  console.log(JSON.stringify({
    ts: nowIso(),
    level: 'info',
    message: 'ops server started',
    url: `http://${config.host === '0.0.0.0' ? '127.0.0.1' : config.host}:${config.port}${config.pagePath}`,
    page_path: config.pagePath,
    targets: config.publicTargets
  }))
})
