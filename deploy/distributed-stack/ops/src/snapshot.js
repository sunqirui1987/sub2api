const { firstNumber, nowIso } = require('./format')

function pickTarget(config, targetID) {
  if (!config.targets.length) return null
  if (!targetID) return config.targets[0]
  return config.targets.find(target => target.id === targetID) || config.targets[0]
}

function normalizeOverview(remoteOverview, fallbackOverview) {
  if (!remoteOverview || typeof remoteOverview !== 'object') return fallbackOverview
  return {
    ...fallbackOverview,
    ...remoteOverview,
    request_count_total: firstNumber(remoteOverview.request_count_total, fallbackOverview.request_count_total) || 0,
    token_consumed: firstNumber(remoteOverview.token_consumed, fallbackOverview.token_consumed) || 0,
    sla: firstNumber(remoteOverview.sla, fallbackOverview.sla) || 0,
    error_rate: firstNumber(remoteOverview.error_rate, fallbackOverview.error_rate) || 0,
    upstream_error_rate: firstNumber(remoteOverview.upstream_error_rate, fallbackOverview.upstream_error_rate) || 0,
    error_count_total: firstNumber(remoteOverview.error_count_total, fallbackOverview.error_count_total) || 0,
    error_count_sla: firstNumber(remoteOverview.error_count_sla, fallbackOverview.error_count_sla) || 0,
    upstream_error_count_excl_429_529: firstNumber(remoteOverview.upstream_error_count_excl_429_529, fallbackOverview.upstream_error_count_excl_429_529) || 0,
    upstream_429_count: firstNumber(remoteOverview.upstream_429_count, fallbackOverview.upstream_429_count) || 0,
    upstream_529_count: firstNumber(remoteOverview.upstream_529_count, fallbackOverview.upstream_529_count) || 0,
    qps: { ...fallbackOverview.qps, ...(remoteOverview.qps || {}) },
    tps: { ...fallbackOverview.tps, ...(remoteOverview.tps || {}) },
    duration: { ...fallbackOverview.duration, ...(remoteOverview.duration || {}) },
    ttft: { ...fallbackOverview.ttft, ...(remoteOverview.ttft || {}) }
  }
}

function normalizeSystemMetrics(remoteOverview, fallbackSystemMetrics) {
  const remoteMetrics = remoteOverview && remoteOverview.system_metrics
  if (!remoteMetrics || typeof remoteMetrics !== 'object') return fallbackSystemMetrics
  return { ...fallbackSystemMetrics, ...remoteMetrics }
}

function normalizeTrend(remoteSnapshot, fallbackTrend) {
  const points = remoteSnapshot && remoteSnapshot.throughput_trend && Array.isArray(remoteSnapshot.throughput_trend.points)
    ? remoteSnapshot.throughput_trend.points
    : null
  if (!points) return fallbackTrend
  return points.map(point => ({
    bucket_start: point.bucket_start,
    request_count: firstNumber(point.request_count, 0) || 0,
    token_consumed: firstNumber(point.token_consumed, 0) || 0,
    qps: firstNumber(point.qps, 0) || 0,
    tps: firstNumber(point.tps, 0) || 0
  }))
}

function ratioToPercent(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.abs(n) <= 1 ? n * 100 : n
}

function statusFromHealthScore(score, targetOK) {
  const n = Number(score)
  if (!Number.isFinite(n)) return targetOK ? '健康' : '异常'
  if (n >= 80) return '健康'
  if (n >= 60) return '风险'
  return '异常'
}

async function buildSnapshot({ config, targetClient, localMetrics, targetID, timeRange }) {
  const selectedTarget = pickTarget(config, targetID)
  const local = localMetrics.snapshot()
  const targetSnapshot = selectedTarget
    ? await targetClient.getSnapshot(selectedTarget, timeRange)
    : { ok: false, error: 'no_targets_configured' }

  const output = {
    service: config.serviceName,
    generated_at: local.generated_at,
    refresh_seconds: config.refreshSeconds,
    uptime_seconds: local.uptime_seconds,
    targets: config.publicTargets,
    target: selectedTarget ? {
      id: selectedTarget.id,
      name: selectedTarget.name,
      baseUrl: selectedTarget.baseUrl,
      configured: Boolean(selectedTarget.apiKey)
    } : null,
    target_status: {
      ok: targetSnapshot.ok,
      status: targetSnapshot.status,
      latency_ms: targetSnapshot.latency_ms,
      error: targetSnapshot.ok ? null : targetSnapshot.error
    },
    health: {
      status: targetSnapshot.ok ? '健康' : '异常',
      score: targetSnapshot.ok ? 100 : 60,
      checks: [
        {
          name: selectedTarget ? `${selectedTarget.name} API` : 'target',
          ok: Boolean(targetSnapshot.ok),
          status: targetSnapshot.status || null,
          latency_ms: targetSnapshot.latency_ms || null,
          error: targetSnapshot.ok ? null : targetSnapshot.error
        }
      ]
    },
    overview: local.overview,
    system_metrics: local.system_metrics,
    trend: local.trend
  }

  if (!targetSnapshot.ok || !targetSnapshot.data) {
    output.generated_at = nowIso()
    return output
  }

  const remoteSnapshot = targetSnapshot.data
  const remoteOverview = remoteSnapshot.overview || remoteSnapshot
  output.generated_at = remoteSnapshot.generated_at || output.generated_at
  output.overview = normalizeOverview(remoteOverview, output.overview)
  output.system_metrics = normalizeSystemMetrics(remoteOverview, output.system_metrics)
  output.trend = normalizeTrend(remoteSnapshot, output.trend)

  const healthScore = firstNumber(output.overview.health_score)
  if (healthScore !== null) {
    output.health.score = Math.round(healthScore)
    output.health.status = statusFromHealthScore(healthScore, true)
    return output
  }

  const errorRate = ratioToPercent(output.overview.error_rate) || 0
  const sla = ratioToPercent(output.overview.sla)
  const remoteHealthBad = errorRate >= 10 || (sla !== null && sla < 99)
  output.health.status = remoteHealthBad ? '异常' : '健康'
  output.health.score = remoteHealthBad
    ? Math.max(0, Math.round(100 - errorRate * 2 - (sla === null ? 0 : 100 - sla)))
    : 100

  return output
}

module.exports = {
  buildSnapshot
}
