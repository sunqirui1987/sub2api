# Sub2API Status Server

这是一个独立的调度状态服务，用来给外部调度器判断每个 Sub2API 后端是否还应继续接流量。

它不提供页面，不依赖 `ops/` 服务，不使用 Docker。每个目标使用固定 `authKey` 调目标 Sub2API 的 admin ops 接口，按最近 2-3 分钟的上游错误情况计算状态。

对外调用 API 文档和实现说明见 [readme_status.md](./readme_status.md)。

## 启动

```bash
cd deploy/distributed-stack/status
cp config/auth.example.json config/auth.json
cp config/targets.example.json config/targets.json
node src/server.js
```

访问：

```bash
curl -sS http://127.0.0.1:3020/status/sub2apia \
  -H "X-Status-Key: replace_with_status_auth_key"
```

也可以通过发布入口生成运行目录：

```bash
cd deploy/distributed-stack
sh deploy.sh status --yes --force \
  --dir "$HOME/sub2api-status" \
  --status-auth-key "replace_with_status_auth_key" \
  --port 3020
```

生成后可直接运行：

```bash
cd "$HOME/sub2api-status"
./start.sh
```

如果脚本已经后台启动，日志在：

```bash
tail -f "$HOME/sub2api-status/status.log"
```

## auth.json

```json
{
  "userauthkey": "replace_with_status_auth_key"
}
```

`userauthkey` 是调度器访问 Status 服务的固定密钥，对应请求头 `X-Status-Key`。也可以用环境变量 `STATUS_AUTH_KEY` 临时覆盖它。

## targets.json

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

`authKey` 是目标 Sub2API 的管理员 API Key，用 `x-api-key` 请求 `/api/v1/admin/ops/*`。这里不用 `apiKey` 命名，避免和客户端模型 Key 混淆。

历史配置里如果仍写 `apiKey`，服务也会兼容读取，但新配置建议统一写 `authKey`。

## 接口

| 路径 | 说明 |
| --- | --- |
| `GET /status/sub2apia` | 返回 sub2apia 单个服务状态 |
| `GET /status/sub2apib` | 返回 sub2apib 单个服务状态 |

所有状态接口都需要：

```text
X-Status-Key: <STATUS_AUTH_KEY>
```

调度器只看 JSON 字段。只要 Status 服务自身能响应，HTTP 状态码固定为 `200`。

## 判定规则

默认策略：

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `STATUS_HOST` | `0.0.0.0` | Node 服务监听地址 |
| `STATUS_PORT` | `3020` | Node 服务监听端口 |
| `STATUS_WINDOW_SECONDS` | `180` | 统计窗口，限制在 `120-300` 秒 |
| `STATUS_THRESHOLD_PERCENT` | `80` | 上游不可用率达到该百分比时判不可用 |
| `STATUS_MIN_REQUESTS` | `10` | 最小样本数 |
| `STATUS_CACHE_TTL_SECONDS` | `60` | 目标查询失败时使用最近成功状态的最长时间 |
| `STATUS_UPSTREAM_STATUS_CODES` | `429,500,502,503,504,529` | 计入上游不可用的状态码 |
| `STATUS_TARGET_TIMEOUT_MS` | `8000` | 单个目标 ops 查询超时 |

每个目标使用精确 `start_time/end_time` 查询最近窗口：

- `/api/v1/admin/ops/requests`
- `/api/v1/admin/ops/upstream-errors?view=errors&status_codes=429,500,502,503,504,529`
- `/api/v1/admin/ops/request-errors?view=errors&status_codes=503&error_owner=platform&q=no available account`

`upstream_unavailable_total = upstream_errors + no_available_accounts`。

状态含义：

| status | available | 说明 |
| --- | --- | --- |
| `available` | `true` | 可调度 |
| `service_unavailable` | `false` | 最近窗口上游不可用率达到阈值 |
| `unknown` | `false` | 查询目标失败且缓存过期，调度器应切走 |

`source` 含义：

| source | 说明 |
| --- | --- |
| `fresh` | 本次查询目标成功 |
| `cache` | 本次目标查询失败，使用 60 秒内缓存 |
| `error` | 本次目标查询失败且无可用缓存 |

## 检查

```bash
npm run check
npm test
```
