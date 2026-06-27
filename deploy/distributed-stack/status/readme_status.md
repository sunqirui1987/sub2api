# Status API

Status 服务给调度器判断两个 Sub2API 服务当前能不能接流量。

## 接口

```text
GET /status/sub2apia
GET /status/sub2apib
```

`sub2apia`、`sub2apib` 对应 `config/targets.json` 里的 `id`。

## 鉴权

请求头：

```text
X-Status-Key: <userauthkey>
```

密钥配置在：

```text
config/auth.json
```

示例：

```json
{
  "userauthkey": "replace_with_status_auth_key"
}
```

## 请求示例

```bash
curl -sS --max-time 3 "http://127.0.0.1:3020/status/sub2apia" \
  -H "X-Status-Key: replace_with_status_auth_key"
```

```bash
curl -sS --max-time 3 "http://127.0.0.1:3020/status/sub2apib" \
  -H "X-Status-Key: replace_with_status_auth_key"
```

## 响应示例

```json
{
  "ok": true,
  "id": "sub2apia",
  "available": false,
  "status": "service_unavailable",
  "reason": "upstream_unavailable_rate_exceeded",
  "generated_at": "2026-06-26T10:00:00.000Z",
  "window_seconds": 180,
  "request_total": 100,
  "upstream_unavailable_total": 82,
  "upstream_unavailable_rate_percent": 82
}
```

## 字段

| 字段 | 说明 |
| --- | --- |
| `ok` | 查询是否成功 |
| `id` | 服务 ID |
| `available` | 核心字段，`true` 表示可以调度 |
| `status` | `available`、`service_unavailable`、`unknown` |
| `reason` | 状态原因 |
| `window_seconds` | 统计最近多少秒 |
| `request_total` | 窗口内请求总数 |
| `upstream_unavailable_total` | 窗口内上游不可用数量 |
| `upstream_unavailable_rate_percent` | 上游不可用比例 |

## 调度判断

调度器只需要按这个规则处理：

```text
ok=true 且 available=true  => 可以调度
其他情况                  => 不调度，切到另一个服务
```

常见状态：

| status | 含义 |
| --- | --- |
| `available` | 可用 |
| `service_unavailable` | 最近窗口上游不可用比例达到阈值 |
| `unknown` | 查询目标失败且没有可用缓存 |

## 计算方式

默认统计最近 `180` 秒。

```text
upstream_unavailable_total = upstream_errors + no_available_accounts
upstream_unavailable_rate_percent = upstream_unavailable_total / request_total * 100
```

默认判定：

```text
request_total >= 10
upstream_unavailable_rate_percent >= 80
=> service_unavailable
```

计入不可用：

```text
429, 500, 502, 503, 504, 529
no available account
```

不计入不可用：

```text
unsupported tool
unsupported capability
unsupported model
客户端鉴权错误
```

## 兜底

目标查询失败时，Status 服务会先使用最近一次成功结果，默认缓存 `60` 秒。

缓存过期后返回：

```json
{
  "ok": true,
  "id": "sub2apia",
  "available": false,
  "status": "unknown",
  "reason": "target_ops_query_failed"
}
```

## targets 配置

```json
[
  {
    "id": "sub2apia",
    "name": "Sub2API A",
    "baseUrl": "http://10.0.0.21:8080",
    "authKey": "<admin-ops-auth-key>"
  },
  {
    "id": "sub2apib",
    "name": "Sub2API B",
    "baseUrl": "http://10.0.0.22:8080",
    "authKey": "<admin-ops-auth-key>"
  }
]
```

`authKey` 用来请求目标 Sub2API 的 admin ops API。

## 实现位置

| 文件 | 说明 |
| --- | --- |
| `src/server.js` | `/status/:target` 路由和鉴权 |
| `src/statusEvaluator.js` | 状态计算和缓存兜底 |
| `src/targetClient.js` | 请求目标 admin ops API |
| `src/config.js` | 读取 `auth.json`、`targets.json` 和环境变量 |
