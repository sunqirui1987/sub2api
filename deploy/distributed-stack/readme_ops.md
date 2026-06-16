# Sub2API 运维监控 Webhook 对接说明

本文给第三方系统开发人员使用，只说明 Webhook 的请求、响应、签名和一个 Node.js 接收 demo。

## 1. 第三方需要提供什么

第三方系统提供一个 HTTP 接收地址：

```text
https://example.com/sub2api/ops-webhook
```

Sub2API 管理员在后台可以配置多个 Webhook，每个 Webhook 填写：

| 配置 | 说明 |
| --- | --- |
| Webhook 地址 | 第三方提供的接收地址 |
| Webhook 密钥 | 可选，用于 HMAC-SHA256 签名校验 |
| 超时 | 请求超时时间，建议 5 秒 |
| 通知规则 ID | 可选，多个规则 ID 用英文逗号分隔；留空表示接收所有启用通知的告警规则 |

## 2. Sub2API 请求第三方

### 2.1 请求方法

```http
POST <WEBHOOK_URL>
content-type: application/json
user-agent: Sub2API-Ops-Webhook/1.0
x-sub2api-event: ops.alert.firing
x-sub2api-timestamp: 2026-06-10T12:00:00Z
x-sub2api-signature: sha256=<signature>
```

说明：

| Header | 必填 | 说明 |
| --- | --- | --- |
| `content-type` | 是 | 固定为 `application/json` |
| `x-sub2api-event` | 是 | 事件类型，测试为 `ops.alert.test`，真实告警为 `ops.alert.firing` |
| `x-sub2api-timestamp` | 是 | 发送时间，RFC3339 格式 |
| `x-sub2api-signature` | 否 | 配置了 Webhook 密钥时才会发送 |

### 2.2 请求体示例

测试通知：

```json
{
  "schema_version": "ops-webhook.v1",
  "event": "ops.alert.test",
  "notification_category": "ops_alert",
  "notification_type": "ops_alert_test",
  "source": "sub2api",
  "test": true,
  "timestamp": "2026-06-10T12:00:00Z",
  "message": "Sub2API ops webhook test notification",
  "alert": {
    "id": 0,
    "rule_id": 0,
    "rule_name": "Webhook test",
    "severity": "P2",
    "status": "firing",
    "metric_type": "error_rate",
    "operator": ">",
    "metric_value": 12.34,
    "threshold_value": 10,
    "description": "This is a test notification sent from Ops monitoring settings.",
    "fired_at": "2026-06-10T12:00:00Z",
    "dimensions": {
      "test": true
    }
  }
}
```

真实告警：

```json
{
  "schema_version": "ops-webhook.v1",
  "event": "ops.alert.firing",
  "notification_category": "ops_alert",
  "notification_type": "ops_alert_firing",
  "source": "sub2api",
  "test": false,
  "timestamp": "2026-06-10T12:00:00Z",
  "alert": {
    "id": 1024,
    "rule_id": 12,
    "rule_name": "错误率极高",
    "severity": "P0",
    "status": "firing",
    "title": "P0: 错误率极高",
    "metric_type": "error_rate",
    "operator": ">",
    "metric_value": 23.5,
    "threshold_value": 20,
    "description": "error_rate > 20.00 (current 23.50) over last 1m (platform=openai group_id=1001)",
    "fired_at": "2026-06-10T12:00:00Z",
    "dimensions": {
      "platform": "openai",
      "group_id": 1001
    }
  }
}
```

## 3. 请求字段说明

### 3.1 顶层字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `schema_version` | string | 协议版本，当前固定为 `ops-webhook.v1` |
| `event` | string | 事件名：`ops.alert.test` 或 `ops.alert.firing` |
| `notification_category` | string | 通知分类，当前为 `ops_alert` |
| `notification_type` | string | 通知类型：`ops_alert_test` 或 `ops_alert_firing` |
| `source` | string | 固定为 `sub2api` |
| `test` | boolean | 是否为测试通知 |
| `timestamp` | string | Sub2API 发送时间，RFC3339 格式 |
| `message` | string | 测试通知时可能出现的说明文本 |
| `alert` | object | 本次告警事件 |

### 3.2 alert 字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 告警事件 ID |
| `rule_id` | number | 规则 ID |
| `rule_name` | string | 规则名称 |
| `severity` | string | 告警级别 |
| `status` | string | 当前为 `firing` |
| `title` | string | 告警标题 |
| `metric_type` | string | 触发告警的指标 |
| `operator` | string | 比较符 |
| `metric_value` | number | 当前值 |
| `threshold_value` | number | 阈值 |
| `description` | string | 告警描述 |
| `fired_at` | string | 触发时间 |
| `dimensions` | object | 告警维度，例如 `platform`、`group_id` |

常见 `metric_type`：

| 值 | 说明 |
| --- | --- |
| `success_rate` | 请求成功率 |
| `error_rate` | 请求错误率 |
| `upstream_error_rate` | 上游错误率 |
| `cpu_usage_percent` | CPU 使用率 |
| `memory_usage_percent` | 内存使用率 |
| `concurrency_queue_depth` | 并发队列深度 |
| `group_available_accounts` | 分组可用账号数 |
| `group_available_ratio` | 分组可用账号比例 |
| `group_rate_limit_ratio` | 分组限流账号比例 |
| `account_rate_limited_count` | 被限流账号数 |
| `account_error_count` | 异常账号数 |
| `account_error_ratio` | 异常账号比例 |
| `account_temp_unscheduled_count` | 临时不可调度账号数 |
| `overload_account_count` | 过载账号数 |
| `proxy_expired_count` | 已过期代理数 |
| `proxy_expiring_soon_count` | 即将过期代理数 |

## 4. 第三方响应 Sub2API

第三方接口返回任意 `2xx` HTTP 状态码，Sub2API 就认为发送成功。

推荐响应：

```http
HTTP/1.1 200 OK
content-type: application/json
```

```json
{
  "ok": true
}
```

失败响应示例：

```http
HTTP/1.1 401 Unauthorized
content-type: application/json
```

```json
{
  "ok": false,
  "error": "invalid_signature"
}
```

非 `2xx` 状态码会被 Sub2API 视为发送失败。

## 5. 签名校验

如果配置了 Webhook 密钥，Sub2API 会发送：

```text
x-sub2api-signature: sha256=<signature>
```

签名计算方式：

```text
signature = HMAC_SHA256(secret, x-sub2api-timestamp + "." + raw_body)
```

注意：

1. `raw_body` 必须使用原始请求体字节。
2. 不要把 JSON parse 后再 stringify，否则签名可能不一致。
3. 建议校验 `x-sub2api-timestamp`，避免重放请求。

## 6. Node.js 接收 Demo

仓库提供了可直接运行的 demo：

```text
deploy/distributed-stack/examples/ops_webhook_receiver.js
```

启动：

```bash
export PORT=3000
export WEBHOOK_SECRET="sub2api-webhook-secret"
node deploy/distributed-stack/examples/ops_webhook_receiver.js
```

Sub2API 后台 Webhook 地址填写：

```text
http://<第三方服务IP>:3000/sub2api/ops-webhook
```

demo 会打印 JSON 日志，包含：

| 日志 | 说明 |
| --- | --- |
| `request received` | 收到请求 |
| `request body received` | 收到请求体 |
| `signature verification completed` | 签名校验完成 |
| `payload parsed` | JSON 解析完成 |
| `received Sub2API test notification` | 收到测试通知 |
| `received Sub2API firing alert` | 收到真实告警 |
| `response sent` | 已返回响应 |

## 7. 最小 Node.js 示例

如果不使用仓库 demo，也可以用下面的最小版本：

```js
const http = require('http')
const crypto = require('crypto')

const PORT = Number(process.env.PORT || 3000)
const SECRET = process.env.WEBHOOK_SECRET || ''

function verify(headers, rawBody) {
  if (!SECRET) return true

  const ts = headers['x-sub2api-timestamp']
  const sig = headers['x-sub2api-signature']
  if (!ts || !sig) return false

  const mac = crypto.createHmac('sha256', SECRET)
  mac.update(`${ts}.`)
  mac.update(rawBody)
  const expected = `sha256=${mac.digest('hex')}`

  return Buffer.from(sig).length === Buffer.from(expected).length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
}

http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/sub2api/ops-webhook') {
    res.writeHead(404)
    res.end()
    return
  }

  const chunks = []
  req.on('data', chunk => chunks.push(chunk))
  req.on('end', () => {
    const rawBody = Buffer.concat(chunks)

    if (!verify(req.headers, rawBody)) {
      res.writeHead(401, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'invalid_signature' }))
      return
    }

    const payload = JSON.parse(rawBody.toString('utf8'))
    console.log('Sub2API webhook:', {
      event: payload.event,
      notification_type: payload.notification_type,
      test: payload.test,
      severity: payload.alert && payload.alert.severity,
      rule_name: payload.alert && payload.alert.rule_name,
      metric_type: payload.alert && payload.alert.metric_type,
      metric_value: payload.alert && payload.alert.metric_value,
      threshold_value: payload.alert && payload.alert.threshold_value
    })

    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
  })
}).listen(PORT, () => {
  console.log(`listening on http://127.0.0.1:${PORT}/sub2api/ops-webhook`)
})
```

## 8. 对接验收

1. 第三方服务能被 Sub2API 访问。
2. Sub2API 后台点击“测试通知”。
3. 第三方服务收到 `ops.alert.test`。
4. 第三方接口返回 `200 {"ok": true}`。
5. 配置低阈值规则后，第三方服务能收到 `ops.alert.firing`。
