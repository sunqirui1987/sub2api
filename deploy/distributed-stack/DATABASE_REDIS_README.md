# PostgreSQL 与 Redis 运维 README

本文档用于分布式部署后的数据库与 Redis 日常操作。命令默认使用 `deploy/distributed-stack/deploy.sh` 生成的目录：

- PostgreSQL：`$HOME/sub2api-postgres`
- Redis：`$HOME/sub2api-redis`
- App：`$HOME/sub2api-app`

生产环境请只允许 App 机器访问 PostgreSQL `5432` 和 Redis `6379`，不要直接暴露公网。

下文命令中的 `$POSTGRES_*`、`$REDIS_*` 变量来自首次发布时记录的连接信息。如果当前 shell 没有这些变量，请手动 `export` 后再执行；不要直接 `source .env`，因为部署脚本生成的 `.env` 面向 Docker Compose，包含 `$` 时会做转义。

## PostgreSQL

### 首次发布

在 PostgreSQL 机器执行：

```bash
sh deploy.sh postgres --yes --install-docker --force \
  --dir "$HOME/sub2api-postgres" \
  --bind-host 0.0.0.0 \
  --port 5432 \
  --password "sub2api-postgres"
```

记录输出中的连接信息：

```bash
export POSTGRES_HOST="<PostgreSQL 机器内网 IP>"
export POSTGRES_PORT="5432"
export POSTGRES_USER="sub2api"
export POSTGRES_PASSWORD="sub2api-postgres"
export POSTGRES_DB="sub2api"
```

如果 PostgreSQL 和 App 在同一台机器上，App 容器访问宿主机映射端口时推荐使用：

```bash
export POSTGRES_HOST="host.docker.internal"
```

如果使用机器 IP，则选择主网卡内网 IP。不要使用 `127.0.0.1`、`docker0`、`br-*`、`172.17.*` 这类 Docker bridge 地址。

### 查看状态与日志

```bash
cd "$HOME/sub2api-postgres"
docker compose --env-file .env ps
docker compose --env-file .env logs -f postgres
```

### 查看当前配置

```bash
cd "$HOME/sub2api-postgres"
sed -n '1,120p' .env
```

重点字段：

```text
POSTGRES_USER=sub2api
POSTGRES_PASSWORD=sub2api-postgres
POSTGRES_DB=sub2api
POSTGRES_BIND_HOST=0.0.0.0
POSTGRES_PORT=5432
```

注意：`.env` 里的 `POSTGRES_PASSWORD` 只在数据库目录首次初始化时生效。只改 `.env` 或用 `--force` 重建容器，不会自动修改已有数据目录里 `sub2api` 用户的真实密码。

### 验证密码是否真实可用

不要只用 `psql -h 127.0.0.1` 验证密码。当前 PostgreSQL 镜像的本地连接可能走 `trust`，错误密码也可能登录成功。

推荐在 PostgreSQL 容器内走 TCP 到容器 IP，强制触发密码认证：

```bash
cd "$HOME/sub2api-postgres"
PG_CONTAINER_IP="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' sub2api-postgres)"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" sub2api-postgres \
  psql -h "$PG_CONTAINER_IP" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c 'select 1;'
```

从 App 机器验证外部连通性：

```bash
docker run --rm -e PGPASSWORD="$POSTGRES_PASSWORD" postgres:18-alpine \
  psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c 'select 1;'
```

### 修改已有数据库用户密码

如果 App 日志出现：

```text
pq: password authentication failed for user "sub2api"
```

优先确认 App 使用的密码和 PostgreSQL 数据库内真实密码是否一致。保留数据的修复方式：

```bash
cd "$HOME/sub2api-postgres"
docker exec sub2api-postgres psql -U sub2api -d sub2api \
  -c "ALTER USER sub2api WITH PASSWORD 'sub2api-postgres';"
```

然后重启 App：

```bash
cd "$HOME/sub2api-app"
docker compose --env-file .env restart sub2api
docker compose --env-file .env logs -f sub2api
```

如果要改成新的密码，需要同时修改：

- PostgreSQL 数据库用户真实密码：`ALTER USER ... WITH PASSWORD ...`
- PostgreSQL 目录 `.env` 中的 `POSTGRES_PASSWORD`
- App 目录 `.env` 中的 `DATABASE_PASSWORD`
- 重启 PostgreSQL 和 App

示例：

```bash
NEW_PASSWORD="your-new-password"

cd "$HOME/sub2api-postgres"
docker exec sub2api-postgres psql -U sub2api -d sub2api \
  -c "ALTER USER sub2api WITH PASSWORD '${NEW_PASSWORD}';"
```

之后更新两个 `.env` 文件并重启：

```bash
cd "$HOME/sub2api-postgres"
docker compose --env-file .env restart postgres

cd "$HOME/sub2api-app"
docker compose --env-file .env restart sub2api
```

### 备份

```bash
cd "$HOME/sub2api-postgres"
docker exec sub2api-postgres pg_dump -U sub2api -d sub2api \
  --format=custom \
  --file=/tmp/sub2api.dump
docker cp sub2api-postgres:/tmp/sub2api.dump \
  "./sub2api_$(date +%Y%m%d_%H%M%S).dump"
```

### 恢复

恢复前先停止 App，避免写入中数据变化：

```bash
cd "$HOME/sub2api-app"
docker compose --env-file .env stop sub2api
```

复制备份文件到 PostgreSQL 容器：

```bash
cd "$HOME/sub2api-postgres"
docker cp ./sub2api_YYYYMMDD_HHMMSS.dump sub2api-postgres:/tmp/sub2api.dump
```

恢复到空库：

```bash
docker exec sub2api-postgres pg_restore -U sub2api -d sub2api \
  --clean \
  --if-exists \
  /tmp/sub2api.dump
```

恢复完成后启动 App：

```bash
cd "$HOME/sub2api-app"
docker compose --env-file .env up -d sub2api
```

### 只在空库时重建数据目录

如果确认数据库没有有效业务数据，可以重建空库。这个操作会删除 PostgreSQL 数据，请先备份或确认可丢弃：

```bash
cd "$HOME/sub2api-postgres"
docker compose --env-file .env down
mv data/postgres "data/postgres.bak.$(date +%Y%m%d_%H%M%S)"
docker compose --env-file .env up -d
```

重建后 `.env` 里的 `POSTGRES_PASSWORD` 会重新用于初始化数据库。

## Redis

### 首次发布

在 Redis 机器执行：

```bash
sh deploy.sh redis --yes --install-docker --force \
  --dir "$HOME/sub2api-redis" \
  --bind-host 0.0.0.0 \
  --port 6379 \
  --password "sub2api-redis"
```

记录输出中的连接信息：

```bash
export REDIS_HOST="<Redis 机器内网 IP>"
export REDIS_PORT="6379"
export REDIS_PASSWORD="sub2api-redis"
```

如果 Redis 和 App 在同一台机器上，App 容器访问宿主机映射端口时推荐使用：

```bash
export REDIS_HOST="host.docker.internal"
```

### 查看状态与日志

```bash
cd "$HOME/sub2api-redis"
docker compose --env-file .env ps
docker compose --env-file .env logs -f redis
```

### 查看当前配置

```bash
cd "$HOME/sub2api-redis"
sed -n '1,80p' .env
```

重点字段：

```text
REDIS_PASSWORD=sub2api-redis
REDIS_BIND_HOST=0.0.0.0
REDIS_PORT=6379
```

### 验证密码与连通性

在 Redis 机器本地验证：

```bash
cd "$HOME/sub2api-redis"
docker exec -e REDISCLI_AUTH="$REDIS_PASSWORD" sub2api-redis \
  redis-cli ping
```

从 App 机器验证：

```bash
docker run --rm -e REDISCLI_AUTH="$REDIS_PASSWORD" redis:8-alpine \
  redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping
```

正常返回：

```text
PONG
```

### 修改 Redis 密码

Redis 密码来自容器启动命令里的 `REDIS_PASSWORD`。修改步骤：

- 修改 Redis 目录 `.env` 中的 `REDIS_PASSWORD`
- 修改 App 目录 `.env` 中的 `REDIS_PASSWORD`
- 重启 Redis
- 重启 App

示例：

```bash
cd "$HOME/sub2api-redis"
docker compose --env-file .env up -d --force-recreate redis

cd "$HOME/sub2api-app"
docker compose --env-file .env restart sub2api
```

### 持久化与备份

当前 Redis 配置启用：

- RDB：`--save 60 1`
- AOF：`--appendonly yes`
- AOF 策略：`--appendfsync everysec`

数据目录位于：

```text
$HOME/sub2api-redis/data/redis
```

如果需要备份 Redis，可先触发持久化，再备份目录：

```bash
cd "$HOME/sub2api-redis"
docker exec -e REDISCLI_AUTH="$REDIS_PASSWORD" sub2api-redis \
  redis-cli bgsave
```

等待 `bgsave` 完成后备份 `data/redis` 目录。

## 管理员账号与密码

App 发布完成后，脚本会输出管理员账号和访问地址：

```text
管理员账号:
  ADMIN_EMAIL=admin@sub2api.local
  ADMIN_PASSWORD=68ac4b43d3938f1595ff0711c93a7ba4
访问地址:
  http://<应用机器IP>:8080
```

访问地址中的 `<应用机器IP>` 替换为 App 机器主网卡内网 IP。例如 App 机器 IP 是 `192.168.31.8`，则访问：

```text
http://192.168.31.8:8080
```

如果在 App 机器本机浏览器访问，也可以使用：

```text
http://127.0.0.1:8080
```

### 初始化账号不会覆盖已有用户

分布式部署脚本默认管理员账号为 `admin@sub2api.local`，默认密码固定为 `68ac4b43d3938f1595ff0711c93a7ba4`。如需改默认值，可以在部署 App 时传入 `--admin-email` / `--admin-password` 覆盖。

`ADMIN_EMAIL` 和 `ADMIN_PASSWORD` 只用于首次自动创建管理员用户。数据库已经存在用户时，App 启动不会用 `.env` 里的 `ADMIN_PASSWORD` 覆盖已有管理员密码。

因此，如果只是修改 `$HOME/sub2api-app/.env` 中的 `ADMIN_PASSWORD` 并重启 App，通常不会改变已有管理员账号的登录密码。

### 登录后修改密码

推荐方式是在页面上修改：

1. 使用部署输出的 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 登录后台。
2. 进入个人资料 / Profile。
3. 在修改密码区域输入当前密码和新密码。

也可以直接调用接口：

```bash
APP_URL="http://<应用机器IP>:8080"
ADMIN_EMAIL="admin@sub2api.local"
ADMIN_PASSWORD="<当前密码>"
NEW_ADMIN_PASSWORD="<新密码>"

TOKEN="$(curl -fsS "$APP_URL/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
  | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')"

curl -fsS -X PUT "$APP_URL/api/v1/user/password" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"old_password\":\"${ADMIN_PASSWORD}\",\"new_password\":\"${NEW_ADMIN_PASSWORD}\"}"
```

修改成功后，旧登录态会因为密码指纹变化而失效，需要用新密码重新登录。

### 忘记管理员密码

优先使用系统的“忘记密码”功能，但它依赖邮件和密码重置配置已经正确开启。

如果邮件重置不可用，不要指望修改 `ADMIN_PASSWORD` 后重启覆盖旧密码。可以使用部署目录里的脚本重置：

```bash
cd deploy/distributed-stack

sh deploy.sh admin-password \
  --dir "$HOME/sub2api-app" \
  --mode db \
  --new-password "<新密码>"
```

脚本会读取 App `.env` 中的数据库连接信息，更新 `users.password_hash`，并同步更新 `.env` 中的 `ADMIN_PASSWORD` 作为运维记录。直接改库前务必先备份 PostgreSQL。

## App 侧检查

查看 App 实际使用的数据库与 Redis 配置：

```bash
cd "$HOME/sub2api-app"
sed -n '1,160p' .env
```

重点字段：

```text
DATABASE_HOST=...
DATABASE_PORT=5432
DATABASE_USER=sub2api
DATABASE_PASSWORD=...
DATABASE_DBNAME=sub2api

REDIS_HOST=...
REDIS_PORT=6379
REDIS_PASSWORD=...
REDIS_DB=0
```

查看 App 是否启动成功：

```bash
cd "$HOME/sub2api-app"
docker compose --env-file .env ps
docker compose --env-file .env logs -f sub2api
```

如果 `sub2api` 容器一直 `Restarting`，先看日志里的第一条 `ERROR`。常见原因：

| 日志 | 处理 |
| --- | --- |
| `pq: password authentication failed for user "sub2api"` | PostgreSQL 用户真实密码和 App `.env` 中 `DATABASE_PASSWORD` 不一致，执行 `ALTER USER` 修复。 |
| `connection refused` / `no route to host` | `DATABASE_HOST` 或 `REDIS_HOST` 填错，或防火墙未放通。 |
| `NOAUTH Authentication required` | Redis 需要密码，但 App 没有配置或密码不一致。 |
| `WRONGPASS invalid username-password pair` | Redis 密码错误，重新同步 Redis `.env` 与 App `.env`。 |

## 常见坑

1. `POSTGRES_PASSWORD` 不是运行时强制密码。PostgreSQL 数据目录初始化后，环境变量不会覆盖已有用户密码。
2. `psql -h 127.0.0.1` 可能被 `pg_hba.conf` 配成 `trust`，不能作为密码正确的证据。
3. App 容器里的 `127.0.0.1` 指的是 App 容器自己，不是宿主机，也不是 PostgreSQL 容器。
4. 单机三角色部署时，App 连接宿主机端口推荐用 `host.docker.internal`。
5. 多机部署时，`POSTGRES_HOST` / `REDIS_HOST` 应使用服务机器主网卡内网 IP，不要使用 Docker bridge IP。
6. 改密码要同步改服务端真实密码、服务端 `.env`、App `.env`，然后重启相关容器。
