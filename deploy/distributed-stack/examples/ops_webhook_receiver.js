const http = require('http')
const crypto = require('crypto')

const PORT = Number(process.env.PORT || 3000)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || ''
const PATHNAME = process.env.PATHNAME || '/sub2api/ops-webhook'
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 1024 * 1024)
const MAX_CLOCK_SKEW_MS = Number(process.env.MAX_CLOCK_SKEW_MS || 5 * 60 * 1000)
const LOG_RAW_BODY = process.env.LOG_RAW_BODY === '1'
const LOG_HEADERS = process.env.LOG_HEADERS === '1'

function nowIso() {
  return new Date().toISOString()
}

function requestId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return crypto.randomBytes(16).toString('hex')
}

function log(level, message, fields) {
  const entry = {
    ts: nowIso(),
    level,
    service: 'sub2api-ops-webhook-receiver',
    message,
    ...(fields || {})
  }
  console.log(JSON.stringify(entry))
}

function hashBody(rawBody) {
  return crypto.createHash('sha256').update(rawBody).digest('hex')
}

function maskHeaderValue(name, value) {
  if (!value) return value
  const lower = name.toLowerCase()
  if (lower.includes('authorization') || lower.includes('token') || lower.includes('secret')) {
    return '<redacted>'
  }
  if (lower === 'x-sub2api-signature') {
    return value.length > 24 ? `${value.slice(0, 24)}...` : value
  }
  return value
}

function sanitizeHeaders(headers) {
  const sanitized = {}
  for (const [key, value] of Object.entries(headers)) {
    sanitized[key] = Array.isArray(value)
      ? value.map(item => maskHeaderValue(key, item))
      : maskHeaderValue(key, value)
  }
  return sanitized
}

function timingSafeEqualString(a, b) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

function verifySignature(headers, rawBody, reqId) {
  if (!WEBHOOK_SECRET) {
    return { ok: true, reason: 'secret_not_configured' }
  }

  const timestamp = headers['x-sub2api-timestamp']
  const signature = headers['x-sub2api-signature']
  if (!timestamp) {
    return { ok: false, reason: 'missing_timestamp' }
  }
  if (!signature) {
    return { ok: false, reason: 'missing_signature' }
  }

  const sentAt = Date.parse(timestamp)
  if (!Number.isFinite(sentAt)) {
    return { ok: false, reason: 'invalid_timestamp', timestamp }
  }

  const clockSkewMs = Math.abs(Date.now() - sentAt)
  if (clockSkewMs > MAX_CLOCK_SKEW_MS) {
    return { ok: false, reason: 'timestamp_out_of_window', timestamp, clock_skew_ms: clockSkewMs }
  }

  const mac = crypto.createHmac('sha256', WEBHOOK_SECRET)
  mac.update(`${timestamp}.`)
  mac.update(rawBody)
  const expected = `sha256=${mac.digest('hex')}`
  const ok = timingSafeEqualString(signature, expected)

  log(ok ? 'info' : 'warn', 'signature verification completed', {
    request_id: reqId,
    signature_ok: ok,
    timestamp,
    clock_skew_ms: clockSkewMs,
    received_signature_prefix: signature.slice(0, 24),
    expected_signature_prefix: expected.slice(0, 24)
  })

  return ok
    ? { ok: true, reason: 'signature_matched', clock_skew_ms: clockSkewMs }
    : { ok: false, reason: 'signature_mismatch', clock_skew_ms: clockSkewMs }
}

function sendJson(res, statusCode, body, reqId, startedAt) {
  const durationMs = Date.now() - startedAt
  const responseBody = JSON.stringify(body)
  res.writeHead(statusCode, { 'content-type': 'application/json' })
  res.end(responseBody)
  log(statusCode >= 200 && statusCode < 300 ? 'info' : 'warn', 'response sent', {
    request_id: reqId,
    status_code: statusCode,
    duration_ms: durationMs,
    response: body
  })
}

function alertSummary(payload) {
  const alert = payload && payload.alert ? payload.alert : {}
  return {
    schema_version: payload && payload.schema_version,
    event: payload && payload.event,
    notification_category: payload && payload.notification_category,
    notification_type: payload && payload.notification_type,
    source: payload && payload.source,
    test: payload && payload.test,
    message: payload && payload.message,
    payload_timestamp: payload && payload.timestamp,
    alert_id: alert.id,
    rule_id: alert.rule_id,
    rule_name: alert.rule_name,
    severity: alert.severity,
    status: alert.status,
    title: alert.title,
    metric_type: alert.metric_type,
    operator: alert.operator,
    metric_value: alert.metric_value,
    threshold_value: alert.threshold_value,
    fired_at: alert.fired_at,
    resolved_at: alert.resolved_at,
    dimensions: alert.dimensions,
    description: alert.description
  }
}

function handlePayload(payload, req, rawBody, reqId) {
  const eventHeader = req.headers['x-sub2api-event']
  const summary = alertSummary(payload)

  log('info', 'payload parsed', {
    request_id: reqId,
    event_header: eventHeader,
    event_body: payload.event,
    event_mismatch: Boolean(eventHeader && payload.event && eventHeader !== payload.event),
    raw_body_bytes: rawBody.length,
    raw_body_sha256: hashBody(rawBody),
    raw_body: LOG_RAW_BODY ? rawBody.toString('utf8') : undefined,
    payload_summary: summary
  })

  if (!payload.event) {
    return { ok: false, statusCode: 400, error: 'missing_event' }
  }

  if (payload.event === 'ops.alert.test') {
    log('info', 'received Sub2API test notification', {
      request_id: reqId,
      payload_summary: summary
    })
    return { ok: true, statusCode: 200, action: 'test_logged' }
  }

  if (payload.event === 'ops.alert.firing') {
    log('warn', 'received Sub2API firing alert', {
      request_id: reqId,
      alert: summary
    })

    // TODO: Integrate with the third-party incident system here.
    // For example: create ticket, send IM message, update dashboard, or enqueue a job.
    return { ok: true, statusCode: 200, action: 'alert_logged' }
  }

  log('warn', 'unsupported event type', {
    request_id: reqId,
    event: payload.event,
    payload_summary: summary
  })
  return { ok: false, statusCode: 400, error: 'unsupported_event' }
}

const server = http.createServer((req, res) => {
  const reqId = requestId()
  const startedAt = Date.now()
  const remote = `${req.socket.remoteAddress || ''}:${req.socket.remotePort || ''}`

  log('info', 'request received', {
    request_id: reqId,
    remote_addr: remote,
    method: req.method,
    url: req.url,
    expected_path: PATHNAME,
    user_agent: req.headers['user-agent'],
    content_type: req.headers['content-type'],
    content_length: req.headers['content-length'],
    event_header: req.headers['x-sub2api-event'],
    timestamp_header: req.headers['x-sub2api-timestamp'],
    signature_present: Boolean(req.headers['x-sub2api-signature']),
    secret_configured: Boolean(WEBHOOK_SECRET),
    headers: LOG_HEADERS ? sanitizeHeaders(req.headers) : undefined
  })

  if (req.method !== 'POST' || req.url !== PATHNAME) {
    sendJson(res, 404, { ok: false, error: 'not_found', request_id: reqId }, reqId, startedAt)
    return
  }

  const chunks = []
  let totalBytes = 0

  req.on('data', chunk => {
    totalBytes += chunk.length
    if (totalBytes > MAX_BODY_BYTES) {
      log('warn', 'request body too large', {
        request_id: reqId,
        total_bytes: totalBytes,
        max_body_bytes: MAX_BODY_BYTES
      })
      req.destroy()
      return
    }
    chunks.push(chunk)
  })

  req.on('end', () => {
    const rawBody = Buffer.concat(chunks)
    log('info', 'request body received', {
      request_id: reqId,
      raw_body_bytes: rawBody.length,
      raw_body_sha256: hashBody(rawBody)
    })

    const signatureResult = verifySignature(req.headers, rawBody, reqId)
    if (!signatureResult.ok) {
      log('warn', 'request rejected by signature verification', {
        request_id: reqId,
        signature_result: signatureResult
      })
      sendJson(res, 401, { ok: false, error: 'invalid_signature', reason: signatureResult.reason, request_id: reqId }, reqId, startedAt)
      return
    }

    let payload
    try {
      payload = JSON.parse(rawBody.toString('utf8'))
    } catch (err) {
      log('warn', 'invalid JSON body', {
        request_id: reqId,
        error: err.message,
        raw_body_bytes: rawBody.length,
        raw_body_sha256: hashBody(rawBody)
      })
      sendJson(res, 400, { ok: false, error: 'invalid_json', request_id: reqId }, reqId, startedAt)
      return
    }

    const result = handlePayload(payload, req, rawBody, reqId)
    sendJson(res, result.statusCode, { ...result, request_id: reqId }, reqId, startedAt)
  })

  req.on('error', err => {
    log('error', 'request stream error', {
      request_id: reqId,
      error: err.message
    })
  })
})

server.on('clientError', (err, socket) => {
  log('warn', 'client error', { error: err.message })
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
})

server.listen(PORT, () => {
  log('info', 'Sub2API ops webhook receiver started', {
    listen: `http://127.0.0.1:${PORT}${PATHNAME}`,
    port: PORT,
    pathname: PATHNAME,
    secret_configured: Boolean(WEBHOOK_SECRET),
    max_clock_skew_ms: MAX_CLOCK_SKEW_MS,
    max_body_bytes: MAX_BODY_BYTES,
    log_raw_body: LOG_RAW_BODY,
    log_headers: LOG_HEADERS
  })
})
