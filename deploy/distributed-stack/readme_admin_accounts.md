# 外部账号接入与账号不足通知对接文档

本文面向外部系统开发人员，只定义两个需要对接的接口：

1. `POST /api/v1/admin/accounts`：外部系统调用 Sub2API，用来添加账号。
2. `POST <WEBHOOK_URL>`：外部系统提供通知地址，用来接收账号不足告警。

账号可用性查询由部署目录里的巡检脚本完成，外部业务系统不需要直接调用可用性查询接口。

## 一、对接架构

```text
外部账号系统
  |
  | 1. 调用添加账号接口
  v
Sub2API Admin API
  |
  | 2. 巡检脚本定时查询账号可用性
  v
account_availability_webhook.sh
  |
  | 3. POST 告警 JSON
  v
外部系统 Webhook 通知接口
```

认证方式统一使用管理员 API Key：

```http
x-api-key: <admin-api-key>
```

不要把管理员 API Key 放到：

```http
Authorization: Bearer <admin-api-key>
```

`Authorization: Bearer` 是管理员登录 JWT 的认证方式，不是管理员 API Key 的认证方式。

## 二、对接方拿到的固定参数

外部系统不需要生成管理员 API Key。部署方应直接提供以下固定参数：

| 参数 | 示例 | 说明 |
| --- | --- | --- |
| `SUB2API_HOSTNAME` | `172.20.137.34` | Sub2API 服务 hostname 或内网 IP |
| `SUB2API_PORT` | `8081` | Sub2API 服务端口 |
| `SUB2API_BASE_URL` | `http://172.20.137.34:8081` | Sub2API 完整访问地址，由 `scheme://hostname:port` 组成 |
| `ADMIN_API_KEY` | `admin-...` | 管理员 API Key，视为系统预置密钥 |
| `WEBHOOK_URL` | `https://example.com/sub2api-alert?token=...` | 外部系统提供的账号不足通知地址 |

`ADMIN_API_KEY` 默认已经存在，由部署方或平台配置提供。外部系统只负责使用它调用接口，不负责生成、刷新或删除它。

本文示例默认：

```bash
export SUB2API_HOSTNAME="172.20.137.34"
export SUB2API_PORT="8081"
export SUB2API_BASE_URL="http://${SUB2API_HOSTNAME}:${SUB2API_PORT}"
export ADMIN_API_KEY="<admin-api-key>"
```

## 三、接口 1：外部系统添加账号

### 3.1 请求定义

```http
POST /api/v1/admin/accounts
content-type: application/json
x-api-key: <admin-api-key>
Idempotency-Key: <source-system>-<account-unique-id>
```

完整 URL 示例：

```text
http://<SUB2API_HOSTNAME>:<SUB2API_PORT>/api/v1/admin/accounts
```

### 3.2 OpenAI API Key 推荐请求体

默认分组按 `openai` 处理。创建 OpenAI API Key 账号时，如果系统已经存在平台默认分组，可以不传 `group_ids`；后端会尝试绑定平台默认分组。

```json
{
  "name": "openai-account-001",
  "platform": "openai",
  "type": "apikey",
  "credentials": {
    "base_url": "https://api.openai.com",
    "api_key": "sk-..."
  },
  "concurrency": 5,
  "priority": 0,
  "rate_multiplier": 1
}
```

如果外部系统必须绑定指定分组，则追加 `group_ids`：

```json
{
  "name": "openai-account-001",
  "platform": "openai",
  "type": "apikey",
  "credentials": {
    "base_url": "https://api.openai.com",
    "api_key": "sk-..."
  },
  "group_ids": [123],
  "concurrency": 5,
  "priority": 0,
  "rate_multiplier": 1
}
```

分组 ID 由部署方提供。没有特殊分组要求时，不传 `group_ids`，使用 OpenAI 平台默认分组 `openai`。

### 3.3 curl 示例

```bash
export SUB2API_HOSTNAME="172.20.137.34"
export SUB2API_PORT="8081"
export SUB2API_BASE_URL="http://${SUB2API_HOSTNAME}:${SUB2API_PORT}"
export ADMIN_API_KEY="<admin-api-key>"
export OPENAI_UPSTREAM_KEY="sk-..."
export ACCOUNT_UNIQUE_ID="openai-account-001"

curl -fsS \
  -X POST "${SUB2API_BASE_URL}/api/v1/admin/accounts" \
  -H "content-type: application/json" \
  -H "x-api-key: ${ADMIN_API_KEY}" \
  -H "Idempotency-Key: external-openai-${ACCOUNT_UNIQUE_ID}" \
  -d @- <<EOF
{
  "name": "${ACCOUNT_UNIQUE_ID}",
  "platform": "openai",
  "type": "apikey",
  "credentials": {
    "base_url": "https://api.openai.com",
    "api_key": "${OPENAI_UPSTREAM_KEY}"
  },
  "concurrency": 5,
  "priority": 0,
  "rate_multiplier": 1
}
EOF
```

### 3.4 参数说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | string | 是 | 账号名称，建议外部系统保持唯一，例如 `openai-account-001` |
| `platform` | string | 是 | 平台，OpenAI 填 `openai` |
| `type` | string | 是 | 账号类型，OpenAI API Key 填 `apikey` |
| `credentials` | object | 是 | 上游账号凭证 |
| `credentials.base_url` | string | 是 | OpenAI 官方填 `https://api.openai.com`；兼容服务填对应 Base URL |
| `credentials.api_key` | string | 是 | 上游 OpenAI API Key |
| `credentials.openai_capabilities` | string[] | 否 | OpenAI API Key 能力限制；不传表示默认能力 |
| `group_ids` | number[] | 否 | 指定绑定分组；不传时使用平台默认分组，OpenAI 默认分组为 `openai` |
| `concurrency` | number | 否 | 账号并发上限，建议显式传 `5` |
| `priority` | number | 否 | 调度优先级，数字越小越靠前；默认 `0` |
| `rate_multiplier` | number | 否 | 账号费率倍率，必须大于等于 `0`；默认 `1` |
| `proxy_id` | number/null | 否 | 绑定代理 ID |
| `expires_at` | number/null | 否 | Unix 秒级过期时间 |
| `auto_pause_on_expired` | boolean | 否 | 到期后是否自动暂停，默认 `true` |
| `confirm_mixed_channel_risk` | boolean | 否 | 混合渠道风险确认；外部系统通常不需要传 |

### 3.5 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 456,
    "name": "openai-account-001",
    "platform": "openai",
    "type": "apikey",
    "status": "active",
    "group_ids": [123]
  }
}
```

### 3.6 幂等与重试

外部系统必须传稳定的 `Idempotency-Key`：

```http
Idempotency-Key: <source-system>-<account-unique-id>
```

建议规则：

- 同一个外部账号记录，创建重试时使用同一个 `Idempotency-Key`。
- 不同账号必须使用不同 `Idempotency-Key`。
- 网络超时、502、503、504 时可以用同一个 `Idempotency-Key` 重试。

### 3.7 错误处理

| HTTP 状态 | 场景 | 外部系统处理 |
| --- | --- | --- |
| `401` | `x-api-key` 缺失或错误 | 检查管理员 API Key |
| `400` | 参数错误 | 修正请求体 |
| `409` | 混合渠道风险 | 如确认风险，可重试并传 `confirm_mixed_channel_risk: true` |
| `429` | 写入幂等或限流类保护 | 读取 `Retry-After` 后重试 |
| `5xx` | 服务端或依赖异常 | 使用同一个 `Idempotency-Key` 重试 |

## 四、接口 2：外部系统接收账号不足通知

这个接口由外部系统提供，Sub2API 部署侧通过巡检脚本调用它。

### 4.1 请求定义

```http
POST <WEBHOOK_URL>
content-type: application/json
```

外部系统返回任意 `2xx` 表示接收成功。非 `2xx` 会导致巡检脚本本轮失败，状态文件不会写入成功状态，下一轮会继续尝试通知。

如果需要鉴权，推荐使用以下方式之一：

- 给 `WEBHOOK_URL` 增加签名 token，例如 `https://example.com/sub2api-alert?token=...`
- 在接收方网关做固定出口 IP 白名单。
- 在内网环境提供只允许巡检机器访问的通知地址。

### 4.2 firing 告警 payload

账号不足时发送：

```json
{
  "event": "sub2api.account_availability.low",
  "status": "firing",
  "group_name": "openai-main",
  "platform": "openai",
  "group_id": 123,
  "available_count": 1,
  "total_count": 8,
  "available_ratio": 12.5,
  "thresholds": {
    "min_available": 2,
    "min_ratio": 30
  },
  "reasons": [
    "available_count 1 < min_available 2",
    "available_ratio 12.5 < min_ratio 30"
  ],
  "checked_at": "2026-06-09T12:00:00Z"
}
```

### 4.3 resolved 恢复 payload

恢复后发送一次：

```json
{
  "event": "sub2api.account_availability.low",
  "status": "resolved",
  "group_name": "openai-main",
  "platform": "openai",
  "group_id": 123,
  "available_count": 4,
  "total_count": 8,
  "available_ratio": 50,
  "thresholds": {
    "min_available": 2,
    "min_ratio": 30
  },
  "reasons": [],
  "checked_at": "2026-06-09T12:10:00Z"
}
```

### 4.4 payload 字段说明

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `event` | string | 固定为 `sub2api.account_availability.low` |
| `status` | string | `firing` 表示触发告警；`resolved` 表示恢复 |
| `group_name` | string | 监控分组展示名 |
| `platform` | string | 平台，例如 `openai` |
| `group_id` | number | Sub2API 分组 ID |
| `available_count` | number | 当前可用账号数 |
| `total_count` | number | 当前账号总数 |
| `available_ratio` | number | 当前可用率百分比 |
| `thresholds.min_available` | number/null | 可用账号数下限 |
| `thresholds.min_ratio` | number/null | 可用率下限 |
| `reasons` | string[] | 触发原因；恢复通知为空数组 |
| `checked_at` | string | UTC 检查时间，ISO 8601 格式 |

外部系统建议按 `event + platform + group_id` 做告警聚合，按 `status` 更新告警状态。

## 五、通知巡检脚本配置

仓库提供脚本：

```bash
deploy/distributed-stack/examples/account_availability_webhook.sh
```

脚本内部会调用 Sub2API 账号可用性接口：

```text
GET /api/v1/admin/ops/account-availability?platform=<platform>&group_id=<group_id>
```

这是部署侧实现细节，不作为外部业务系统对接接口。

### 5.1 前置条件

- Sub2API 后台已开启 Ops 监控和实时监控。
- 巡检机器安装了 `curl` 和 `jq`。
- 巡检机器能访问 Sub2API 管理员 API 和外部系统 `WEBHOOK_URL`。

如果可用性接口返回 `data.enabled=false`，脚本会跳过并输出提示。

### 5.2 环境变量

| 变量 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `SUB2API_BASE_URL` | 条件必填 | - | Sub2API 完整访问地址，例如 `http://172.20.137.34:8081` |
| `SUB2API_HOSTNAME` | 条件必填 | - | Sub2API hostname 或内网 IP；未配置 `SUB2API_BASE_URL` 时必填 |
| `SUB2API_PORT` | 否 | - | Sub2API 端口；和 `SUB2API_HOSTNAME` 一起使用，例如 `8081` |
| `SUB2API_SCHEME` | 否 | `http` | 和 `SUB2API_HOSTNAME` 一起使用，通常为 `http` 或 `https` |
| `ADMIN_API_KEY` | 是 | - | 管理员 API Key，用于脚本内部查询账号可用性 |
| `WEBHOOK_URL` | 是 | - | 外部系统提供的通知接口地址 |
| `WATCH_GROUPS_JSON` | 二选一 | - | 直接传入分组阈值 JSON |
| `WATCH_GROUPS_FILE` | 二选一 | - | 分组阈值 JSON 文件路径 |
| `STATE_FILE` | 否 | `/tmp/sub2api-account-watch.state` | 告警状态文件，用于去重 |

`WATCH_GROUPS_JSON` 和 `WATCH_GROUPS_FILE` 至少配置一个。两者都配置时，优先使用 `WATCH_GROUPS_JSON`。

### 5.3 分组阈值配置

示例文件：

```bash
cp examples/watch_groups.example.json /root/sub2api-watch-groups.json
```

内容示例：

```json
[
  {
    "name": "openai-main",
    "platform": "openai",
    "group_id": 123,
    "min_available": 2,
    "min_ratio": 30
  },
  {
    "name": "openai-backup",
    "platform": "openai",
    "group_id": 124,
    "min_available": 1,
    "min_ratio": 20
  }
]
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | string | 否 | 告警展示名；不填时使用 `<platform>-<group_id>`，如果接口返回分组名则使用接口分组名 |
| `platform` | string | 是 | 平台，例如 `openai` |
| `group_id` | number | 是 | 分组 ID |
| `min_available` | number | 二选一 | 可用账号数下限；实际可用数小于该值时告警 |
| `min_ratio` | number | 二选一 | 可用率百分比下限；实际可用率小于该值时告警 |

`min_available` 和 `min_ratio` 可以同时配置，任一条件触发都会发送告警。

### 5.4 手动执行

```bash
cd ~/distributed-stack

export SUB2API_HOSTNAME="172.20.137.34"
export SUB2API_PORT="8081"
export SUB2API_SCHEME="http"
export ADMIN_API_KEY="<admin-api-key>"
export WEBHOOK_URL="https://example.com/sub2api-alert?token=<token>"
export WATCH_GROUPS_FILE="/root/sub2api-watch-groups.json"
export STATE_FILE="/var/lib/sub2api-account-watch/state.json"

bash examples/account_availability_webhook.sh
```

也可以直接传 JSON：

```bash
export WATCH_GROUPS_JSON='[{"name":"openai-main","platform":"openai","group_id":123,"min_available":2,"min_ratio":30}]'
bash examples/account_availability_webhook.sh
```

### 5.5 crontab 定时执行

推荐使用 env 文件：

```bash
cat >/root/sub2api-account-watch.env <<'EOF'
SUB2API_HOSTNAME="172.20.137.34"
SUB2API_PORT="8081"
SUB2API_SCHEME="http"
ADMIN_API_KEY="<admin-api-key>"
WEBHOOK_URL="https://example.com/sub2api-alert?token=<token>"
WATCH_GROUPS_FILE="/root/sub2api-watch-groups.json"
STATE_FILE="/var/lib/sub2api-account-watch/state.json"
EOF
```

创建状态目录：

```bash
mkdir -p /var/lib/sub2api-account-watch
```

加入 crontab：

```bash
crontab -e
```

```cron
* * * * * . /root/sub2api-account-watch.env; bash /root/distributed-stack/examples/account_availability_webhook.sh >> /var/log/sub2api-account-watch.log 2>&1
```

### 5.6 去重规则

脚本使用 `STATE_FILE` 记录每个分组的状态：

- 第一次低于阈值：发送 `status=firing`。
- 持续低于阈值：不重复发送，只更新状态检查时间。
- 恢复到阈值以上：发送一次 `status=resolved`，然后清除该分组状态。

状态维度为：

```text
<platform>:<group_id>
```

## 六、联调清单

1. 确认已经拿到部署方提供的 `SUB2API_HOSTNAME`、`SUB2API_PORT` 和 `ADMIN_API_KEY`。
2. 外部系统用 `POST /api/v1/admin/accounts` 创建一个 OpenAI API Key 账号。
3. 同一个账号重复使用同一个 `Idempotency-Key` 重试，确认不会重复创建。
4. 外部系统准备 `POST <WEBHOOK_URL>` 通知接口，并返回 `2xx`。
5. 配置 `WATCH_GROUPS_FILE`，设置较高阈值验证 `firing`。
6. 恢复账号可用数后验证 `resolved`。
7. 确认 crontab 日志没有 `missing required`、`non-success response` 或 webhook 非 `2xx` 错误。

## 七、安全建议

- 管理员 API Key 权限很高，不要写入前端代码、公开仓库或客户端 App。
- 生产环境建议只允许外部系统固定出口 IP 访问 Sub2API 管理员接口。
- Webhook 接收方应做来源校验，避免任何人伪造告警。
- 如果管理员 API Key 泄露，应立即联系部署方替换预置密钥。
