const test = require('node:test')
const assert = require('node:assert/strict')

const { classifyUpstreamError } = require('./errorAnalysis')

test('attributes explicit IP authorization errors to the exit IP or region', () => {
  const result = classifyUpstreamError({
    status_code: 401,
    message: 'Recovered upstream error 401: Your IP is not authorized to make this request.'
  })

  assert.equal(result.key, 'ip_or_region_restricted')
  assert.equal(result.attribution, 'ip_region')
  assert.equal(result.confidence, 'high')
})

test('uses the response body before a misleading 502 status', () => {
  const result = classifyUpstreamError({
    status_code: 502,
    message: 'Your input exceeds the context window of this model. Please adjust your input and try again.'
  })

  assert.equal(result.key, 'context_limit')
  assert.equal(result.domain, 'request')
})

test('keeps a generic upstream 403 attribution unresolved', () => {
  const result = classifyUpstreamError({
    status_code: 403,
    message: 'Upstream access forbidden, please contact administrator'
  })

  assert.equal(result.key, 'permission_or_policy')
  assert.equal(result.attribution, 'account_or_ip_policy')
  assert.equal(result.confidence, 'low')
})
