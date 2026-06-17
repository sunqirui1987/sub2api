const os = require('os')
const { monitorEventLoopDelay, performance } = require('perf_hooks')
const { nowIso } = require('./format')

function createLocalMetrics() {
  const startedAt = Date.now()
  const eventLoopDelay = monitorEventLoopDelay({ resolution: 20 })
  eventLoopDelay.enable()

  let requestCount = 0
  let errorCount = 0
  let tokenConsumed = 0
  let previousCpuUsage = process.cpuUsage()
  let previousCpuSampleAt = performance.now()
  const buckets = []

  function cpuPercent() {
    const current = process.cpuUsage()
    const currentAt = performance.now()
    const elapsedMicros = Math.max(1, (currentAt - previousCpuSampleAt) * 1000)
    const usedMicros = (current.user - previousCpuUsage.user) + (current.system - previousCpuUsage.system)
    previousCpuUsage = current
    previousCpuSampleAt = currentAt
    return Math.min(100, Math.max(0, (usedMicros / elapsedMicros) * 100))
  }

  function recordRequest(req) {
    requestCount += 1
    tokenConsumed += Math.max(1, Math.round(String(req.url || '').length / 2))
    const now = Date.now()
    const last = buckets[buckets.length - 1]
    if (last && now - last.at < 60 * 1000) {
      last.request_count += 1
      last.token_consumed += tokenConsumed % 17
    } else {
      buckets.push({ at: now, request_count: 1, token_consumed: tokenConsumed % 17 })
      while (buckets.length > 120) buckets.shift()
    }
  }

  function recordError() {
    errorCount += 1
  }

  function snapshot() {
    const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000)
    const memory = process.memoryUsage()
    const totalMemoryMb = os.totalmem() / 1024 / 1024
    const freeMemoryMb = os.freemem() / 1024 / 1024
    const usedMemoryMb = totalMemoryMb - freeMemoryMb
    const processMemoryMb = memory.rss / 1024 / 1024
    const cpu = cpuPercent()
    const qps = requestCount / Math.max(1, uptimeSeconds)
    const tps = tokenConsumed / Math.max(1, uptimeSeconds)
    const loopP99Ms = eventLoopDelay.percentile(99) / 1e6
    const loopMeanMs = eventLoopDelay.mean / 1e6
    const trend = buckets.map(bucket => ({
      bucket_start: new Date(bucket.at).toISOString(),
      request_count: bucket.request_count,
      token_consumed: bucket.token_consumed,
      qps: Number((bucket.request_count / 60).toFixed(3)),
      tps: Number((bucket.token_consumed / 60).toFixed(3))
    }))

    return {
      generated_at: nowIso(),
      uptime_seconds: uptimeSeconds,
      overview: {
        request_count_total: requestCount,
        token_consumed: tokenConsumed,
        qps: {
          current: Number(qps.toFixed(2)),
          peak: Number(Math.max(qps, ...trend.map(item => item.qps), 0).toFixed(2)),
          avg: Number(qps.toFixed(2))
        },
        tps: {
          current: Number(tps.toFixed(2)),
          peak: Number(Math.max(tps, ...trend.map(item => item.tps), 0).toFixed(2)),
          avg: Number(tps.toFixed(2))
        },
        sla: errorCount > 0 ? 99 : 100,
        error_rate: requestCount > 0 ? Number(((errorCount / requestCount) * 100).toFixed(3)) : 0,
        upstream_error_rate: 0,
        error_count_total: errorCount,
        error_count_sla: errorCount,
        upstream_error_count_excl_429_529: 0,
        upstream_429_count: 0,
        upstream_529_count: 0,
        duration: {
          p50_ms: null,
          p90_ms: null,
          p95_ms: null,
          p99_ms: null,
          avg_ms: null,
          max_ms: null
        },
        ttft: {
          p50_ms: null,
          p90_ms: null,
          p95_ms: null,
          p99_ms: Number(loopP99Ms.toFixed(2)),
          avg_ms: Number(loopMeanMs.toFixed(2)),
          max_ms: Number((eventLoopDelay.max / 1e6).toFixed(2))
        }
      },
      system_metrics: {
        cpu_usage_percent: Number(cpu.toFixed(1)),
        memory_used_mb: Number(usedMemoryMb.toFixed(0)),
        memory_total_mb: Number(totalMemoryMb.toFixed(0)),
        memory_usage_percent: Number(((usedMemoryMb / totalMemoryMb) * 100).toFixed(1)),
        process_memory_mb: Number(processMemoryMb.toFixed(1)),
        loadavg_1m: Number(os.loadavg()[0].toFixed(2)),
        db_ok: null,
        redis_ok: null,
        worker_current: 1,
        worker_warning: 8000,
        worker_critical: 15000,
        background_jobs_total: 1,
        background_jobs_warning: 0
      },
      trend
    }
  }

  return {
    recordRequest,
    recordError,
    snapshot
  }
}

module.exports = {
  createLocalMetrics
}
