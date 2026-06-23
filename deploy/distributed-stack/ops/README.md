# Sub2API Ops Server

这是一个独立的 Node.js 运维监控服务，公开暴露 `/admin/ops` 页面，同时在服务端持有多个 Sub2API 后端的管理员 API Key。

页面访问者只能看到服务器名称、地址和指标数据，不能拿到管理员 API Key。

## 启动

```bash
cd ops
npm start
```

访问：

```text
http://127.0.0.1:3010/admin/ops
```

独立日志面板：

```text
http://127.0.0.1:3010/admin/ops/logs
```

## Linux 安装 Node.js / npm / pm2

在 Linux 服务器上可以直接使用仓库里的安装脚本：

```bash
bash deploy/install-node-npm-pm2-linux.sh
```

脚本默认安装 Node.js 24.x、npm 和全局 `pm2`。如果服务器需要固定旧一点的 LTS 版本，可以这样安装 Node.js 22.x：

```bash
NODE_MAJOR=22 bash deploy/install-node-npm-pm2-linux.sh
```

安装完成后，用 `pm2` 托管 Ops Server：

```bash
cd ops
npm install --omit=dev
cp config/targets.example.json config/targets.json
cp config/auth.example.json config/auth.json
vi config/targets.json
vi config/auth.json

pm2 start src/server.js --name sub2api-ops --cwd "$(pwd)"
pm2 save
pm2 startup
```

`pm2 startup` 会输出一条需要复制执行的系统服务命令，执行后服务器重启也会自动拉起 `sub2api-ops`。

如果安装时报：

```text
Unsupported proxy configured: 172.20.136.10://3128
```

说明服务器的 `apt` 代理配置格式写错了。先找出配置文件：

```bash
grep -RIn 'Acquire::.*Proxy' /etc/apt/apt.conf /etc/apt/apt.conf.d 2>/dev/null
```

把类似下面这种错误格式：

```text
Acquire::http::Proxy "172.20.136.10://3128";
```

改成：

```text
Acquire::http::Proxy "http://172.20.136.10:3128/";
Acquire::https::Proxy "http://172.20.136.10:3128/";
```

如果服务器不需要代理，也可以删除对应的代理配置文件或注释这些行，然后重新执行安装脚本。

## 配置

默认读取 `config/targets.json`。本地已经可以写成下面这样：

| 名称 | 地址 | API Key |
| --- | --- | --- |
| `qn-codex.tapsvc.com` | `https://qn-codex.tapsvc.com` | `apiKey` 字段 |
| `qn-codex.tapsvc.com:8002` | `https://qn-codex.tapsvc.com:8002` | `apiKey` 字段 |

可以复制 `config/targets.example.json` 为 `config/targets.json`，在里面直接配置 `apiKey`。`config/targets.json` 已被忽略，不会进入 Git。

登录账号密码默认读取 `config/auth.json`，可以复制示例文件后修改：

```bash
cp config/auth.example.json config/auth.json
vi config/auth.json
```

```json
{
  "username": "admin",
  "password": "change-me",
  "cookieName": "sub2api_ops_session",
  "sessionTtlSeconds": 43200
}
```

`config/auth.json` 也已被忽略，不会进入 Git。没有配置文件时会 fallback 到环境变量；环境变量也没有时使用默认账号 `admin`、默认密码 `sub2api-ops`。

支持的环境变量：

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | 监听地址 |
| `PORT` | `3010` | 监听端口 |
| `PAGE_PATH` | `/admin/ops` | 公开页面路径 |
| `SERVICE_NAME` | `Sub2API Ops` | 页面服务名 |
| `REFRESH_SECONDS` | `5` | 页面自动刷新间隔 |
| `TARGET_TIMEOUT_MS` | `8000` | 拉取目标服务器指标超时 |
| `TARGETS_FILE` | `ops/config/targets.json` | 目标服务器配置文件 |
| `OPS_TARGETS_JSON` | 空 | JSON 格式目标服务器列表，优先级高于配置文件，支持直接写 `apiKey` |
| `AUTH_FILE` | `ops/config/auth.json` | 登录账号配置文件 |
| `OPS_AUTH_JSON` | 空 | JSON 格式登录配置，优先级高于 `AUTH_FILE` |
| `OPS_USERNAME` | `admin` | 没有登录配置文件时使用的账号 |
| `OPS_PASSWORD` | `sub2api-ops` | 没有登录配置文件时使用的密码 |
| `OPS_COOKIE_NAME` | `sub2api_ops_session` | 没有登录配置文件时使用的 Cookie 名称 |
| `OPS_SESSION_TTL_SECONDS` | `43200` | 登录会话有效期，单位秒 |

## 接口

| 路径 | 说明 |
| --- | --- |
| `GET /admin/ops` | 公开运维页面 |
| `GET /admin/ops/logs` | 独立日志面板，支持请求日志、请求错误、上游错误和系统日志 |
| `GET /admin/ops/api/targets` | 公开服务器列表，不包含 API Key |
| `GET /admin/ops/api/snapshot?target=<id>&time_range=1h` | 指定服务器聚合快照 |
| `GET /admin/ops/api/details?target=<id>&type=requests` | 指定服务器请求/错误明细代理 |
| `GET /admin/ops/api/system-logs?target=<id>&time_range=1h` | 指定服务器系统日志代理 |
| `GET /healthz` | Ops Server 自身健康检查 |

### 日志面板查询

`/admin/ops/logs` 支持请求日志、请求错误、上游错误和系统日志四类视图。常用筛选参数会同步到 URL：

| 参数 | 说明 |
| --- | --- |
| `target` | 目标服务器 ID |
| `type` | `requests`、`errors`、`upstream`、`system` |
| `time_range` | 相对时间范围，例如 `5m`、`30m`、`1h`、`6h`、`24h`、`7d`、`30d` |
| `start_time` / `end_time` | 可选绝对时间，RFC3339 格式；填写后优先于 `time_range` |
| `level` / `component` | 日志级别和组件，例如 `error`、`http.access` |
| `request_id` / `client_request_id` | 请求追踪 ID |
| `user_id` / `account_id` | 用户和账号筛选 |
| `platform` / `model` | 平台和模型筛选 |
| `q` | 关键词，匹配消息、请求 ID 等目标后端支持的字段 |
| `status_codes` / `view` | 错误类日志的状态码和视图筛选 |
| `page` / `page_size` | 分页参数 |

表格会完整显示 `request_id`、`client_request_id`、IP、User-Agent 等排障字段。成功请求日志的 IP/User-Agent 取决于目标 Sub2API 后端 `/api/v1/admin/ops/requests` 是否返回这些字段；如果目标后端未返回，页面显示 `-`，不会在 Ops Server 中伪造。系统日志会优先从顶层字段和 `extra.client_ip`、`extra.request_user_agent` 等字段中提取展示。
