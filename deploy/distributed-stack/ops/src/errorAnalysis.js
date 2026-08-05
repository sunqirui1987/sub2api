function readPath(source, path) {
  if (!source || !path) return undefined
  return String(path).split('.').reduce((value, key) => (value && typeof value === 'object' ? value[key] : undefined), source)
}

function rowValue(row, keys, fallback = '') {
  for (const key of keys) {
    const value = String(key).includes('.') ? readPath(row, key) : row && row[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return fallback
}

function numberValue(row, keys, fallback = 0) {
  const value = rowValue(row, keys, '')
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function textForRow(row) {
  const fields = [
    'message',
    'detail',
    'error_message',
    'response_body',
    'upstream_body',
    'error',
    'extra.message',
    'extra.error',
    'extra.response_body'
  ]
  return fields.map(key => {
    const value = rowValue(row, [key], '')
    if (value === undefined || value === null || value === '') return ''
    if (typeof value === 'string') return value
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }).filter(Boolean).join(' ')
}

function normalizeMessage(text) {
  const raw = String(text || '').trim()
  if (!raw) return '无错误消息'
  let value = raw
  try {
    const parsed = JSON.parse(raw)
    value = rowValue(parsed, ['error.message', 'message', 'detail', 'error'], raw)
    if (typeof value !== 'string') value = JSON.stringify(value)
  } catch {}
  return String(value)
    .replace(/[a-f0-9]{16,}/gi, '<hex>')
    .replace(/\breq_[a-z0-9_-]+\b/gi, '<request_id>')
    .replace(/\b[0-9]{6,}\b/g, '<number>')
    .replace(/\s+/g, ' ')
    .slice(0, 220)
}

function classifyUpstreamError(row) {
  const statusCode = numberValue(row, ['status_code', 'upstream_status_code'], 0)
  const text = textForRow(row).toLowerCase()

  if (/your ip is not authorized|ip (?:address )?is not authorized|unauthorized ip|unsupported country|country .*not supported|region .*not supported|geo(?:graphic)?(?:al)? restriction/.test(text)) {
    return { key: 'ip_or_region_restricted', label: '出口 IP/区域限制', domain: 'upstream', attribution: 'ip_region', confidence: 'high' }
  }
  if (/context length|context window|maximum context|too many tokens|token limit/.test(text)) {
    return { key: 'context_limit', label: '上下文过长', domain: 'request', attribution: 'request_payload', confidence: 'high' }
  }
  if (statusCode === 529 || /overload|overloaded|capacity|server is busy|too busy/.test(text)) {
    return { key: 'upstream_overload', label: '上游过载' }
  }
  if (statusCode === 429 || /rate limit|too many requests|ratelimit|throttle|quota exceeded/.test(text)) {
    return { key: 'rate_limited', label: '限流/配额限制' }
  }
  if (/insufficient_quota|billing|credit balance|payment required|quota has been exhausted/.test(text)) {
    return { key: 'quota_or_billing', label: '额度/计费不足' }
  }
  if (statusCode === 401 || /unauthorized|invalid api key|invalid token|expired token|authentication/.test(text)) {
    return { key: 'auth_failed', label: '上游认证失败' }
  }
  if (statusCode === 403 || /forbidden|permission|not allowed|policy/.test(text)) {
    return { key: 'permission_or_policy', label: '上游账号/IP策略限制', domain: 'upstream', attribution: 'account_or_ip_policy', confidence: 'low' }
  }
  if (statusCode === 404 || /model .*not found|not found.*model|unknown model/.test(text)) {
    return { key: 'model_not_found', label: '模型不可用' }
  }
  if (statusCode === 408 || statusCode === 504 || /timeout|deadline exceeded|context deadline|timed out/.test(text)) {
    return { key: 'timeout', label: '上游超时' }
  }
  if (/connection reset|eof|broken pipe|dial tcp|tls|handshake|network|no such host|socket/.test(text)) {
    return { key: 'transport_error', label: '网络/连接错误' }
  }
  if (statusCode === 400 || statusCode === 422 || /invalid request|bad request|invalid parameter|schema/.test(text)) {
    return { key: 'request_invalid', label: '请求参数错误' }
  }
  if (statusCode >= 500) {
    return { key: 'upstream_server_error', label: '上游服务端错误' }
  }
  if (statusCode >= 400) {
    return { key: 'upstream_client_error', label: '上游客户端错误' }
  }
  return { key: 'unknown_error', label: '未知错误' }
}

function matchesErrorClass(row, keyword) {
  const query = String(keyword || '').trim().toLowerCase()
  if (!query) return true
  const errorClass = classifyUpstreamError(row)
  return String(errorClass.key || '').toLowerCase().includes(query) ||
    String(errorClass.label || '').toLowerCase().includes(query)
}

function createdAt(row) {
  const value = rowValue(row, ['created_at', 'at', 'timestamp'], '')
  if (value) return value
  const unixMs = Number(rowValue(row, ['at_unix_ms'], 0))
  return Number.isFinite(unixMs) && unixMs > 0 ? new Date(unixMs).toISOString() : ''
}

function addBucket(map, key, label, row, extra = {}) {
  const safeKey = key || '-'
  if (!map.has(safeKey)) {
    map.set(safeKey, {
      key: safeKey,
      label: label || safeKey,
      count: 0,
      status_codes: new Map(),
      classes: new Map(),
      models: new Map(),
      accounts: new Map(),
      platforms: new Map(),
      targets: new Map(),
      proxy_ips: new Map(),
      proxy_classes: new Map(),
      sources: new Map(),
      latest_at: '',
      ...extra
    })
  }
  const bucket = map.get(safeKey)
  bucket.count += 1
  const statusCode = String(numberValue(row, ['status_code', 'upstream_status_code'], 0) || '未知')
  const errorClass = classifyUpstreamError(row)
  const model = String(rowValue(row, ['upstream_model', 'requested_model', 'model'], '未知模型'))
  const account = String(rowValue(row, ['account_name', 'account_id'], '未知账号'))
  const platform = String(rowValue(row, ['platform'], '未知平台'))
  const target = String(rowValue(row, ['_target_name'], '未知池'))
  const proxyIP = String(rowValue(row, ['_proxy_label'], '未关联'))
  const source = `${target} · #${rowValue(row, ['account_id'], '-')}`
  increment(bucket.status_codes, statusCode)
  increment(bucket.classes, errorClass.label)
  increment(bucket.models, model)
  increment(bucket.accounts, account)
  increment(bucket.platforms, platform)
  increment(bucket.targets, target)
  increment(bucket.proxy_ips, proxyIP)
  increment(bucket.proxy_classes, String(rowValue(row, ['_proxy_class'], '未分类')))
  increment(bucket.sources, source)
  const at = createdAt(row)
  if (at && (!bucket.latest_at || at > bucket.latest_at)) bucket.latest_at = at
}

function increment(map, key) {
  map.set(key || '-', (map.get(key || '-') || 0) + 1)
}

function topEntries(map, limit = 5) {
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label)))
    .slice(0, limit)
}

function serializeBucket(bucket, total) {
  return {
    ...bucket,
    percent: total > 0 ? bucket.count / total : 0,
    status_codes: topEntries(bucket.status_codes),
    classes: topEntries(bucket.classes),
    models: topEntries(bucket.models),
    accounts: topEntries(bucket.accounts),
    platforms: topEntries(bucket.platforms),
    targets: topEntries(bucket.targets),
    proxy_ips: topEntries(bucket.proxy_ips),
    proxy_classes: topEntries(bucket.proxy_classes),
    sources: topEntries(bucket.sources)
  }
}

function sortedBuckets(map, total, limit) {
  return Array.from(map.values())
    .map(bucket => serializeBucket(bucket, total))
    .sort((a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label)))
    .slice(0, limit)
}

async function mapLimit(items, limit, fn) {
  const results = []
  let next = 0
  async function worker() {
    while (next < items.length) {
      const index = next
      next += 1
      results[index] = await fn(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

function totalFromListResult(result) {
  if (!result || !result.ok) return null
  const data = result.data || {}
  const total = Number(data.total)
  if (Number.isFinite(total)) return total
  return Array.isArray(data.items) ? data.items.length : null
}

async function fetchAccountTotal(targetClient, target, type, options, accountID) {
  if (!accountID || String(accountID) === 'unknown') return null
  const params = {
    time_range: options.timeRange || '1h',
    start_time: options.startTime || undefined,
    end_time: options.endTime || undefined,
    page: '1',
    page_size: '1',
    sort: 'created_at_desc',
    account_id: String(accountID),
    platform: options.filters.platform || undefined,
    model: options.filters.model || undefined
  }
  if (type !== 'requests') {
    params.view = options.filters.view || 'errors'
    params.status_codes = options.filters.statusCodes || undefined
  }
  const result = await targetClient.listDetails(target, type, params)
  return totalFromListResult(result)
}

function accountIdentity(row) {
  const targetID = String(rowValue(row, ['_target_id'], 'unknown'))
  const accountID = String(rowValue(row, ['account_id'], 'unknown'))
  const accountName = String(rowValue(row, ['account_name'], '')).trim()
  const proxyIP = String(rowValue(row, ['_proxy_ip'], '')).trim()
  const proxyID = String(rowValue(row, ['_proxy_id'], '')).trim()
  const accountPart = accountName ? `name:${accountName.toLowerCase()}` : `local:${targetID}:${accountID}`
  const egressPart = proxyIP
    ? `ip:${proxyIP}`
    : proxyID
      ? `proxy:${targetID}:${proxyID}`
      : `direct:${targetID}`
  return `${accountPart}::${egressPart}`
}

function isUsableExitIP(value) {
  const ip = String(value || '').trim()
  if (!ip) return false
  if (ip.includes(':')) return !ip.startsWith('::1') && !ip.toLowerCase().startsWith('fe80:') && !ip.toLowerCase().startsWith('fc') && !ip.toLowerCase().startsWith('fd')
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false
  if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0) return false
  if (parts[0] === 192 && parts[1] === 168) return false
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false
  return true
}

function matchesAccount(row, keyword) {
  const query = String(keyword || '').trim().toLowerCase()
  if (!query) return true
  const values = [
    rowValue(row, ['account_name'], ''),
    rowValue(row, ['account_id'], ''),
    rowValue(row, ['_proxy_ip'], ''),
    rowValue(row, ['_proxy_name'], ''),
    rowValue(row, ['_target_name'], '')
  ].map(value => String(value).toLowerCase())
  return query.split(/\s+/).filter(Boolean).every(token => values.some(value => value.includes(token)))
}

async function fetchTargetRows(options, target) {
  const rows = []
  let remoteTotal = 0
  let pagesRead = 0
  for (let page = 1; ; page += 1) {
    const result = await options.targetClient.listDetails(target, 'upstream-errors', {
      time_range: options.timeRange || '1h',
      start_time: options.startTime || undefined,
      end_time: options.endTime || undefined,
      page: String(page),
      page_size: String(options.pageSize),
      sort: 'created_at_desc',
      view: options.filters.view || 'errors',
      phase: options.filters.phase || 'upstream',
      platform: options.filters.platform || undefined,
      model: options.filters.model || undefined,
      status_codes: options.filters.statusCodes || undefined,
      q: options.filters.q || undefined
    })
    if (!result.ok) {
      return {
        ok: false,
        target_id: target.id,
        target_name: target.name,
        error: result.error || `HTTP ${result.status || 502}`,
        rows: [],
        remoteTotal: 0,
        pagesRead
      }
    }
    const data = result.data || {}
    const items = Array.isArray(data.items) ? data.items : []
    pagesRead = page
    rows.push(...items.map(row => ({ ...row, _target_id: target.id, _target_name: target.name })))
    remoteTotal = Math.max(remoteTotal, Number(data.total || 0))
    if (remoteTotal > 0 && rows.length >= remoteTotal) break
    if (items.length < options.pageSize) break
  }
  if (!remoteTotal) remoteTotal = rows.length
  return {
    ok: true,
    target_id: target.id,
    target_name: target.name,
    rows,
    remoteTotal,
    pagesRead
  }
}

async function enrichTargetRows(options, target, rows) {
  const accountIDs = Array.from(new Set(rows.map(row => String(rowValue(row, ['account_id'], ''))).filter(Boolean)))
  const proxyResultPromise = options.targetClient.listProxies(target)
  const accountResults = await mapLimit(accountIDs, 6, async accountID => {
    const [detail, requestCount, requestErrorCount] = await Promise.all([
      options.targetClient.getAccount(target, accountID),
      fetchAccountTotal(options.targetClient, target, 'requests', options, accountID),
      fetchAccountTotal(options.targetClient, target, 'request-errors', options, accountID)
    ])
    return {
      accountID,
      detail: detail && detail.ok ? detail.data || {} : {},
      requestCount,
      requestErrorCount
    }
  })
  const proxyResult = await proxyResultPromise
  const proxyItems = proxyResult && proxyResult.ok && Array.isArray(proxyResult.data) ? proxyResult.data : []
  const proxies = new Map(proxyItems.map(proxy => [String(proxy.id), proxy]))
  const accounts = new Map(accountResults.map(item => [String(item.accountID), item]))

  rows.forEach(row => {
    const accountID = String(rowValue(row, ['account_id'], ''))
    const account = accounts.get(accountID) || {}
    const detail = account.detail || {}
    const proxyID = rowValue(detail, ['proxy_id', 'proxy.id'], '')
    const proxy = proxies.get(String(proxyID)) || detail.proxy || {}
    const rawProxyIP = String(rowValue(proxy, ['ip_address'], '')).trim()
    const proxyHost = String(rowValue(proxy, ['host'], '')).trim()
    const proxyConfigAddress = rawProxyIP || proxyHost
    const proxyIP = isUsableExitIP(rawProxyIP) ? rawProxyIP : ''
    if (!row.account_name && detail.name) row.account_name = detail.name
    row._proxy_id = proxyID
    row._proxy_name = rowValue(proxy, ['name'], '')
    row._proxy_ip = proxyIP
    row._proxy_config_ip = proxyConfigAddress
    row._proxy_host = proxyHost
    row._proxy_class = proxyID
      ? (proxyIP ? '代理出口 IP' : String(proxy.status || '').toLowerCase() === 'inactive' ? '代理不可用' : '代理未探测')
      : '直连'
    row._proxy_label = proxyIP
      ? `出口 IP ${proxyIP}`
      : proxyConfigAddress
        ? `${row._proxy_class} · 配置地址 ${proxyConfigAddress}`
        : row._proxy_class
    row._request_count = account.requestCount
    row._request_error_count = account.requestErrorCount
    row._account_key = accountIdentity(row)
  })
  return rows
}

function exampleForRow(row) {
  return {
    created_at: createdAt(row),
    request_id: rowValue(row, ['request_id', 'upstream_request_id', 'id'], ''),
    status_code: numberValue(row, ['status_code', 'upstream_status_code'], 0),
    platform: rowValue(row, ['platform'], ''),
    model: rowValue(row, ['upstream_model', 'requested_model', 'model'], ''),
    account_id: rowValue(row, ['account_id'], ''),
    account_name: rowValue(row, ['account_name'], ''),
    target_id: rowValue(row, ['_target_id'], ''),
    target_name: rowValue(row, ['_target_name'], ''),
    proxy_id: rowValue(row, ['_proxy_id'], ''),
    proxy_name: rowValue(row, ['_proxy_name'], ''),
    proxy_ip: rowValue(row, ['_proxy_ip'], ''),
    proxy_config_ip: rowValue(row, ['_proxy_config_ip'], ''),
    proxy_label: rowValue(row, ['_proxy_label'], ''),
    proxy_class: rowValue(row, ['_proxy_class'], ''),
    endpoint: rowValue(row, ['upstream_endpoint', 'inbound_endpoint'], ''),
    error_class: classifyUpstreamError(row).label,
    message: normalizeMessage(textForRow(row))
  }
}

function buildAnalysis(rows, meta) {
  const total = rows.length
  const byClass = new Map()
  const byStatus = new Map()
  const byAccount = new Map()
  const byAccountClass = new Map()
  const byModel = new Map()
  const byAccountModel = new Map()
  const byMessage = new Map()
  const byEndpoint = new Map()
  const byPlatform = new Map()
  const byProxyClass = new Map()
  const accountMembers = new Map()

  rows.forEach(row => {
    const errorClass = classifyUpstreamError(row)
    const statusCode = String(numberValue(row, ['status_code', 'upstream_status_code'], 0) || '未知')
    const accountID = String(rowValue(row, ['account_id'], ''))
    const accountName = String(rowValue(row, ['account_name'], ''))
    const accountLabel = accountName || (accountID ? `账号 ${accountID}` : '未知账号')
    const accountKey = String(rowValue(row, ['_account_key'], accountIdentity(row)))
    const model = String(rowValue(row, ['upstream_model', 'requested_model', 'model'], '未知模型'))
    const platform = String(rowValue(row, ['platform'], '未知平台'))
    const endpoint = String(rowValue(row, ['upstream_endpoint', 'inbound_endpoint'], '未知端点'))
    const message = normalizeMessage(textForRow(row))
    addBucket(byClass, errorClass.key, errorClass.label, row)
    addBucket(byStatus, statusCode, statusCode, row)
    addBucket(byAccount, accountKey, accountLabel, row, {
      account_id: accountID,
      account_name: accountName,
      proxy_id: rowValue(row, ['_proxy_id'], ''),
      proxy_name: rowValue(row, ['_proxy_name'], ''),
      proxy_ip: rowValue(row, ['_proxy_ip'], ''),
      proxy_config_ip: rowValue(row, ['_proxy_config_ip'], ''),
      proxy_label: rowValue(row, ['_proxy_label'], ''),
      proxy_class: rowValue(row, ['_proxy_class'], ''),
      target_id: rowValue(row, ['_target_id'], ''),
      target_name: rowValue(row, ['_target_name'], '')
    })
    addBucket(byAccountClass, `${accountKey}::${errorClass.key}`, `${accountLabel} / ${errorClass.label}`, row, { account_id: accountID, account_name: accountName, error_class: errorClass.label, error_class_key: errorClass.key })
    addBucket(byModel, model, model, row, { model })
    addBucket(byAccountModel, `${accountKey}::${model}`, `${accountLabel} / ${model}`, row, { account_id: accountID, account_name: accountName, model })
    addBucket(byMessage, message, message, row)
    addBucket(byEndpoint, endpoint, endpoint, row)
    addBucket(byPlatform, platform, platform, row)
    const proxyClass = String(rowValue(row, ['_proxy_class'], '未分类'))
    addBucket(byProxyClass, proxyClass, proxyClass, row)

    if (!accountMembers.has(accountKey)) accountMembers.set(accountKey, new Map())
    const localKey = `${rowValue(row, ['_target_id'], '')}::${accountID}`
    accountMembers.get(accountKey).set(localKey, {
      request_count: row._request_count,
      request_error_count: row._request_error_count
    })
  })

  for (const [accountKey, members] of accountMembers.entries()) {
    const bucket = byAccount.get(accountKey)
    if (!bucket) continue
    let requestCount = 0
    let requestErrorCount = 0
    let hasRequestCount = false
    let hasRequestErrorCount = false
    for (const member of members.values()) {
      if (member.request_count !== null && member.request_count !== undefined) {
        requestCount += Number(member.request_count || 0)
        hasRequestCount = true
      }
      if (member.request_error_count !== null && member.request_error_count !== undefined) {
        requestErrorCount += Number(member.request_error_count || 0)
        hasRequestErrorCount = true
      }
    }
    bucket.request_count = hasRequestCount ? requestCount : null
    bucket.request_error_count = hasRequestErrorCount ? requestErrorCount : null
    bucket.upstream_error_count = bucket.count
    bucket.request_error_rate = hasRequestCount && requestCount > 0 && hasRequestErrorCount ? requestErrorCount / requestCount : null
    bucket.upstream_error_rate = hasRequestCount && requestCount > 0 ? bucket.count / requestCount : null
    bucket.pool_count = members.size
  }

  const examples = rows
    .slice()
    .sort((a, b) => String(createdAt(b)).localeCompare(String(createdAt(a))))
    .slice(0, 12)
    .map(exampleForRow)

  return {
    ok: true,
    generated_at: new Date().toISOString(),
    time_range: meta.timeRange,
    start_time: meta.startTime || '',
    end_time: meta.endTime || '',
    items_analyzed: total,
    scanned_total: meta.scannedTotal,
    remote_total: meta.remoteTotal,
    limited: meta.remoteTotal > meta.scannedTotal,
    page_size: meta.pageSize,
    pages_read: meta.pagesRead,
    target_statuses: meta.targetStatuses || [],
    target_count: (meta.targetStatuses || []).filter(item => item.ok).length,
    target_total: (meta.targetStatuses || []).length,
    dimensions: {
      classes: sortedBuckets(byClass, total, 20),
      status_codes: sortedBuckets(byStatus, total, 20),
      accounts: sortedBuckets(byAccount, total, Number.MAX_SAFE_INTEGER),
      account_classes: sortedBuckets(byAccountClass, total, Number.MAX_SAFE_INTEGER),
      models: sortedBuckets(byModel, total, Number.MAX_SAFE_INTEGER),
      account_models: sortedBuckets(byAccountModel, total, Number.MAX_SAFE_INTEGER),
      messages: sortedBuckets(byMessage, total, 50),
      endpoints: sortedBuckets(byEndpoint, total, 30),
      platforms: sortedBuckets(byPlatform, total, 20),
      proxy_classes: sortedBuckets(byProxyClass, total, 10)
    },
    examples
  }
}

async function analyzeUpstreamErrors(options) {
  const {
    targetClient,
    target,
    targets,
    timeRange,
    startTime,
    endTime,
    pageSize,
    filters
  } = options
  const targetList = (Array.isArray(targets) && targets.length ? targets : [target]).filter(Boolean)
  const loadOptions = { targetClient, timeRange, startTime, endTime, pageSize, filters }
  const targetResults = await mapLimit(targetList, 4, targetItem => fetchTargetRows(loadOptions, targetItem))
  const successful = targetResults.filter(result => result.ok)
  if (!successful.length) {
    return {
      ok: false,
      status: 502,
      error: 'all_targets_failed',
      targets: targetResults.map(result => ({ id: result.target_id, name: result.target_name, ok: false, error: result.error }))
    }
  }
  await mapLimit(successful, 3, result => {
    const targetItem = targetList.find(item => item.id === result.target_id)
    return enrichTargetRows(loadOptions, targetItem, result.rows)
  })
  const rows = successful.flatMap(result => result.rows)
  const filteredRows = rows.filter(row => matchesErrorClass(row, filters.errorClass) && matchesAccount(row, filters.accountQuery || filters.accountID))
  const remoteTotal = successful.reduce((sum, result) => sum + Number(result.remoteTotal || 0), 0)
  const pagesRead = successful.reduce((sum, result) => sum + Number(result.pagesRead || 0), 0)
  const targetStatuses = targetResults.map(result => ({
    id: result.target_id,
    name: result.target_name,
    ok: Boolean(result.ok),
    error: result.ok ? '' : result.error
  }))
  const analysis = buildAnalysis(filteredRows, {
    timeRange,
    startTime,
    endTime,
    scannedTotal: rows.length,
    remoteTotal,
    pageSize,
    pagesRead,
    targetStatuses
  })
  return {
    ok: true,
    status: 200,
    data: analysis
  }
}

module.exports = {
  analyzeUpstreamErrors,
  classifyUpstreamError,
  matchesErrorClass,
  normalizeMessage
}
