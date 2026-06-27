const http = require('http')
const { loadConfig } = require('./config')
const { json, nowIso } = require('./format')
const { createStatusEvaluator } = require('./statusEvaluator')
const { createTargetClient } = require('./targetClient')

const config = loadConfig()
const targetClient = createTargetClient(config)
const evaluator = createStatusEvaluator(config, targetClient)

// 接口契约：调度器读取 JSON 字段，而不是 HTTP 状态码。
// 即使鉴权失败也返回 HTTP 200 + ok=false，避免中间代理把业务状态误判为传输失败。
function unauthorized(res) {
  json(res, 200, {
    ok: false,
    error: 'unauthorized',
    generated_at: nowIso()
  })
}

// 请求头 X-Status-Key 是调度器访问本服务的唯一对外凭据。
// 它和 target.authKey 不同；target.authKey 只在服务内部用于查询目标 Sub2API。
function isAuthorized(req) {
  const key = String(req.headers['x-status-key'] || '').trim()
  return key !== '' && key === config.authKey
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)

    // 调度器按服务 ID 请求状态，一个请求只返回一个服务状态。
    if (req.method === 'GET' && url.pathname.startsWith('/status/')) {
      const targetID = decodeURIComponent(url.pathname.slice('/status/'.length)).trim()
      if (!targetID) {
        json(res, 200, {
          ok: false,
          error: 'not_found',
          generated_at: nowIso()
        })
        return
      }
      if (!isAuthorized(req)) {
        unauthorized(res)
        return
      }
      const payload = await evaluator.evaluateOne(targetID)
      json(res, 200, payload)
      return
    }

    json(res, 200, {
      ok: false,
      error: 'not_found',
      generated_at: nowIso()
    })
  } catch (err) {
    // 最后一层进程级异常兜底。按接口契约仍保持 HTTP 200，
    // 但 JSON 返回 ok=false，让调度器把 Status 服务视为异常。
    json(res, 200, {
      ok: false,
      error: String(err && err.message ? err.message : err),
      generated_at: nowIso()
    })
  }
})

server.on('clientError', (_err, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
})

server.listen(config.port, config.host, () => {
  console.log(JSON.stringify({
    ts: nowIso(),
    level: 'info',
    message: 'status server started',
    url: `http://${config.host === '0.0.0.0' ? '127.0.0.1' : config.host}:${config.port}/status/<target-id>`,
    targets: config.publicTargets
  }))
})
