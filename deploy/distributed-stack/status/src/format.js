// 统一返回 ISO 时间，方便调度器日志、Status 服务日志和目标 ops 时间直接对齐。
function nowIso() {
  return new Date().toISOString()
}

// 统一写 JSON 响应，并禁止缓存。Status API 的业务契约在 JSON 字段里，
// 所有路由都走同一个序列化逻辑，避免响应格式漂移。
function json(res, statusCode, body) {
  const data = JSON.stringify(body)
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(data)
  })
  res.end(data)
}

// 从多个候选字段里取第一个有效数字。目标后端不同版本可能返回 total
// 或 pagination.total，这里保持兼容。
function firstNumber(...values) {
  for (const value of values) {
    const number = Number(value)
    if (Number.isFinite(number)) return number
  }
  return null
}

module.exports = {
  nowIso,
  json,
  firstNumber
}
