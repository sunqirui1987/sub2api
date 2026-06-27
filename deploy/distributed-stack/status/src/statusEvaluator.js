const { firstNumber, nowIso } = require('./format')
const { publicTarget } = require('./config')

// 从目标 ops 分页响应里提取 total。当前 Sub2API 列表接口可能返回
// 兼容 data.total 或 data.pagination.total；兜底使用 items.length 可以兼容旧版本
// 或部分响应。
function resultTotal(result) {
  if (!result || !result.ok || !result.data) return 0
  const data = result.data
  const total = firstNumber(data.total, data.pagination && data.pagination.total)
  if (total !== null) return Math.max(0, Math.trunc(total))
  return Array.isArray(data.items) ? data.items.length : 0
}

// 只保留调度器/运维排障需要的信息。这样既能说明哪类目标查询失败，
// 又不会泄露任何鉴权材料。
function targetStatus(result) {
  return {
    ok: Boolean(result && result.ok),
    status: result && result.status ? result.status : null,
    latency_ms: result && result.latency_ms ? result.latency_ms : null,
    error: result && result.ok ? null : result && result.error ? result.error : null
  }
}

// 返回缓存内容前先深拷贝，避免调用方修改内存中的兜底状态，
// 影响后续状态判断。
function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

// 百分比保留两位小数，让机器读取的输出稳定。
function roundedPercent(value) {
  return Math.round(value * 100) / 100
}

// 构造保守的 unknown 状态。unknown 不是 Status 服务进程失败，
// 而是服务无法证明该目标健康，且没有可用的新鲜缓存；调度器应避开该目标。
function makeUnknown(target, reason, details, generatedAt) {
  return {
    id: target.id,
    name: target.name,
    baseUrl: target.baseUrl,
    available: false,
    status: 'unknown',
    reason,
    source: 'error',
    generated_at: generatedAt,
    request_total: 0,
    upstream_unavailable_total: 0,
    upstream_unavailable_rate_percent: 0,
    cache_age_seconds: null,
    target_status: details
  }
}

function createStatusEvaluator(config, targetClient) {
  // 按目标保存内存缓存。缓存刻意不持久化：服务重启后必须重新从目标 ops
  // 获取新鲜状态，避免旧状态跨进程生命周期继续影响调度。
  const cache = new Map()

  // 目标 ops 临时不可用时，使用最近一次成功计算的结果。
  // 这是应对外部系统不稳定的主要兜底：监控/查询链路短暂抖动时，
  // 不应该立刻导致调度大幅抖动。
  function cachedTarget(target, nowMs, fallbackReason, details) {
    const cached = cache.get(target.id)
    if (!cached) return null
    const ageSeconds = Math.floor((nowMs - cached.cachedAtMs) / 1000)
    if (ageSeconds > config.cacheTtlSeconds) return null
    const body = clone(cached.body)
    body.source = 'cache'
    body.cache_age_seconds = ageSeconds
    body.generated_at = nowIso()
    body.fallback_reason = fallbackReason
    body.target_status = details || body.target_status
    return body
  }

  // 计算单个目标最近精确窗口内的状态。这里使用 start_time/end_time，
  // 而不是后端预设 time_range，因此无需改 Go 后端也能支持 2-3 分钟窗口。
  async function evaluateTarget(target, nowMs = Date.now()) {
    const generatedAt = nowIso()
    const end = new Date(nowMs)
    const start = new Date(nowMs - config.windowSeconds * 1000)
    const baseParams = {
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      page: '1',
      page_size: '1'
    }

    // 三类目标查询相互独立，直接并发执行。这样调度器轮询延迟由最慢的一次
    // 目标 ops 查询决定，而不是三次查询时间相加。
    const [requests, upstreamErrors, noAvailableAccounts] = await Promise.all([
      targetClient.listRequests(target, baseParams),
      targetClient.listUpstreamErrors(target, {
        ...baseParams,
        view: 'errors',
        status_codes: config.upstreamStatusCodes.join(',')
      }),
      targetClient.listRequestErrors(target, {
        ...baseParams,
        view: 'errors',
        status_codes: '503',
        error_owner: 'platform',
        q: 'no available account'
      })
    ])

    const details = {
      requests: targetStatus(requests),
      upstream_errors: targetStatus(upstreamErrors),
      no_available_accounts: targetStatus(noAvailableAccounts)
    }

    // 任一目标查询失败时，继续计算会产生误导。此时优先使用新鲜缓存；
    // 没有缓存时返回 unknown/不可调度，让调度器切到其他目标。
    if (!requests.ok || !upstreamErrors.ok || !noAvailableAccounts.ok) {
      const cached = cachedTarget(target, nowMs, 'target_ops_query_failed', details)
      if (cached) return cached
      return makeUnknown(target, 'target_ops_query_failed', details, generatedAt)
    }

    const requestTotal = resultTotal(requests)
    const upstreamTotal = resultTotal(upstreamErrors)
    const noAccountTotal = resultTotal(noAvailableAccounts)
    const unavailableTotal = upstreamTotal + noAccountTotal
    const ratePercent = requestTotal > 0 ? roundedPercent((unavailableTotal * 100) / requestTotal) : 0
    const previous = cache.get(target.id)
    // 不可用状态带一点粘性：节点已经故障后，流量会被调走，当前样本可能变小。
    // 不能因为样本不足就立刻显示恢复，否则调度器会来回切。
    const previousUnavailable = previous && previous.body && previous.body.status === 'service_unavailable'
    const enoughSamples = requestTotal >= config.minRequests
    const unavailableByRate = enoughSamples && ratePercent >= config.thresholdPercent
    const stickyUnavailable = !enoughSamples && previousUnavailable

    let available = true
    let status = 'available'
    let reason = 'ok'
    if (unavailableByRate) {
      available = false
      status = 'service_unavailable'
      reason = 'upstream_unavailable_rate_exceeded'
    } else if (stickyUnavailable) {
      available = false
      status = 'service_unavailable'
      reason = 'previous_unavailable_insufficient_sample'
    } else if (!enoughSamples) {
      reason = 'insufficient_sample'
    }

    // 响应同时面向调度器和运维人员。调度器只需要读 available/status/reason；
    // 目标原始状态字段用于排障，路由逻辑可以忽略。
    const body = {
      id: target.id,
      name: target.name,
      baseUrl: target.baseUrl,
      available,
      status,
      reason,
      source: 'fresh',
      generated_at: generatedAt,
      window_seconds: config.windowSeconds,
      request_total: requestTotal,
      upstream_unavailable_total: unavailableTotal,
      upstream_unavailable_rate_percent: ratePercent,
      cache_age_seconds: 0,
      counts: {
        upstream_errors: upstreamTotal,
        no_available_accounts: noAccountTotal
      },
      policy: {
        threshold_percent: config.thresholdPercent,
        min_requests: config.minRequests,
        upstream_status_codes: config.upstreamStatusCodes
      },
      target: publicTarget(target),
      target_status: details
    }

    // 只有新鲜且成功的计算结果才更新缓存。错误或 unknown 不覆盖上一次
    // 成功状态，避免短暂失败污染兜底依据。
    cache.set(target.id, {
      cachedAtMs: nowMs,
      body: clone(body)
    })
    return body
  }

  // 计算单个目标。对外 API 一个请求只返回一个服务状态，
  // 因此这里直接把目标状态铺到顶层，不再返回 targets 数组。
  async function evaluateOne(targetID) {
    const target = config.targets.find(item => item.id === targetID)
    const generatedAt = nowIso()
    if (!target) {
      return {
        ok: false,
        error: 'target_not_found',
        generated_at: generatedAt,
        window_seconds: config.windowSeconds
      }
    }

    const status = await evaluateTarget(target)
    return {
      ok: true,
      service: config.serviceName,
      ...status
    }
  }

  return {
    evaluateTarget,
    evaluateOne,
    _cache: cache
  }
}

module.exports = {
  createStatusEvaluator,
  resultTotal
}
