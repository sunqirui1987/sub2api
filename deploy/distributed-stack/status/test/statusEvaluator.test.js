const test = require('node:test')
const assert = require('node:assert/strict')
const { createStatusEvaluator } = require('../src/statusEvaluator')

function config(overrides = {}) {
  return {
    serviceName: 'test-status',
    windowSeconds: 180,
    thresholdPercent: 80,
    minRequests: 10,
    cacheTtlSeconds: 60,
    upstreamStatusCodes: [429, 500, 502, 503, 504, 529],
    targets: [{ id: 'a', name: 'A', baseUrl: 'http://a', authKey: 'k', enabled: true }],
    ...overrides
  }
}

function ok(total) {
  return { ok: true, status: 200, latency_ms: 1, data: { total, items: [] } }
}

function fail(error = 'timeout') {
  return { ok: false, latency_ms: 1, error }
}

function client({ requests, upstream, noAccounts, fails = false }) {
  return {
    listRequests: async () => fails ? fail() : ok(requests),
    listUpstreamErrors: async () => fails ? fail() : ok(upstream),
    listRequestErrors: async () => fails ? fail() : ok(noAccounts)
  }
}

test('80 percent upstream unavailable is service_unavailable', async () => {
  const evaluator = createStatusEvaluator(config(), client({ requests: 100, upstream: 80, noAccounts: 0 }))
  const result = await evaluator.evaluateTarget(config().targets[0], 100000)
  assert.equal(result.available, false)
  assert.equal(result.status, 'service_unavailable')
  assert.equal(result.reason, 'upstream_unavailable_rate_exceeded')
  assert.equal(result.upstream_unavailable_rate_percent, 80)
})

test('79 percent upstream unavailable is available', async () => {
  const evaluator = createStatusEvaluator(config(), client({ requests: 100, upstream: 79, noAccounts: 0 }))
  const result = await evaluator.evaluateTarget(config().targets[0], 100000)
  assert.equal(result.available, true)
  assert.equal(result.status, 'available')
  assert.equal(result.reason, 'ok')
})

test('insufficient sample does not mark unavailable', async () => {
  const evaluator = createStatusEvaluator(config(), client({ requests: 5, upstream: 5, noAccounts: 0 }))
  const result = await evaluator.evaluateTarget(config().targets[0], 100000)
  assert.equal(result.available, true)
  assert.equal(result.reason, 'insufficient_sample')
})

test('no available accounts contributes to unavailable rate', async () => {
  const evaluator = createStatusEvaluator(config(), client({ requests: 100, upstream: 70, noAccounts: 10 }))
  const result = await evaluator.evaluateTarget(config().targets[0], 100000)
  assert.equal(result.available, false)
  assert.equal(result.upstream_unavailable_total, 80)
})

test('target failure uses fresh cache inside ttl', async () => {
  const cfg = config()
  const target = cfg.targets[0]
  const evaluator = createStatusEvaluator(cfg, client({ requests: 100, upstream: 80, noAccounts: 0 }))
  await evaluator.evaluateTarget(target, 100000)
  const failing = createStatusEvaluator(cfg, client({ requests: 0, upstream: 0, noAccounts: 0, fails: true }))
  failing._cache.set(target.id, evaluator._cache.get(target.id))
  const result = await failing.evaluateTarget(target, 130000)
  assert.equal(result.source, 'cache')
  assert.equal(result.available, false)
  assert.equal(result.cache_age_seconds, 30)
})

test('target failure after cache ttl returns unknown', async () => {
  const cfg = config()
  const target = cfg.targets[0]
  const evaluator = createStatusEvaluator(cfg, client({ requests: 100, upstream: 80, noAccounts: 0 }))
  await evaluator.evaluateTarget(target, 100000)
  const failing = createStatusEvaluator(cfg, client({ requests: 0, upstream: 0, noAccounts: 0, fails: true }))
  failing._cache.set(target.id, evaluator._cache.get(target.id))
  const result = await failing.evaluateTarget(target, 200000)
  assert.equal(result.source, 'error')
  assert.equal(result.available, false)
  assert.equal(result.status, 'unknown')
})

test('previous unavailable remains unavailable when recovery sample is insufficient', async () => {
  const cfg = config()
  const target = cfg.targets[0]
  let nextClient = client({ requests: 100, upstream: 80, noAccounts: 0 })
  const evaluator = createStatusEvaluator(cfg, {
    listRequests: (...args) => nextClient.listRequests(...args),
    listUpstreamErrors: (...args) => nextClient.listUpstreamErrors(...args),
    listRequestErrors: (...args) => nextClient.listRequestErrors(...args)
  })
  await evaluator.evaluateTarget(target, 100000)
  nextClient = client({ requests: 3, upstream: 0, noAccounts: 0 })
  const result = await evaluator.evaluateTarget(target, 120000)
  assert.equal(result.available, false)
  assert.equal(result.reason, 'previous_unavailable_insufficient_sample')
})

test('evaluate one returns a single target status without targets array', async () => {
  const cfg = config()
  const evaluator = createStatusEvaluator(cfg, client({ requests: 100, upstream: 0, noAccounts: 0 }))
  const result = await evaluator.evaluateOne('a')
  assert.equal(result.ok, true)
  assert.equal(result.id, 'a')
  assert.equal(result.available, true)
  assert.equal(Array.isArray(result.targets), false)
})

test('evaluate one returns target_not_found for unknown target', async () => {
  const evaluator = createStatusEvaluator(config(), client({ requests: 100, upstream: 0, noAccounts: 0 }))
  const result = await evaluator.evaluateOne('missing')
  assert.equal(result.ok, false)
  assert.equal(result.error, 'target_not_found')
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'targets'), false)
})
