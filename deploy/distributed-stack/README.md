# Sub2API 分布式部署

部署分成两部分：

1. **构建与推送**：在有完整源码的构建机上执行。
2. **发布**：在云服务器上执行；云服务器不需要源码，只需要同步 `deploy/distributed-stack/` 这个目录。

PostgreSQL 与 Redis 的日常操作、密码修改、备份恢复和故障排查见 [PostgreSQL 与 Redis 运维 README](./DATABASE_REDIS_README.md)。

Docker 容器管理、停止、删除与彻底清理见 [Docker 管理手册](./readme_admin.md)。

服务器已有 Docker 或本地镜像时的启动方式见 [Docker 启动说明](./readme_docker.md)。

外部系统添加账号接口、账号不足通知接口见 [外部账号接入说明](./readme_admin_accounts.md)。

## 一、构建与推送

这一步在源码仓库根目录执行。

### 1. 第一次初始化 latest 镜像

第一次发布时，先构建并推送 `latest` 基础镜像：

```bash
export IMAGE_REPO="crpi-4p61yfj4kgj9iup9.cn-hangzhou.personal.cr.aliyuncs.com/lincanvas/sub2api"
export latestimage="${IMAGE_REPO}:latest"

sh deploy/distributed-stack/build.sh \
  --image "$latestimage"
sh deploy/distributed-stack/push.sh \
  --image "$latestimage"
```

### 2. 后续发布版本镜像

日常发布时，基于 `latest` 生成一个带时间戳的版本镜像：

```bash
export IMAGE_REPO="crpi-4p61yfj4kgj9iup9.cn-hangzhou.personal.cr.aliyuncs.com/lincanvas/sub2api"
export deployimage="${IMAGE_REPO}:version-$(date +%Y%m%d%H%M%S)"

sh deploy/distributed-stack/build.sh \
  --baseimage "${IMAGE_REPO}:latest"
sh deploy/distributed-stack/push.sh

echo "$deployimage"
```

记下最后输出的 `$deployimage`，发布应用服务器时会用到。

### 3. 本地直接 go run

如果只是本地验证代码，不需要构建镜像，也不需要执行 `push.sh` 上传到镜像仓库。确认 PostgreSQL 和 Redis 已经可访问后，在源码仓库根目录执行：

```bash
export AUTO_SETUP=true
export SERVER_HOST=0.0.0.0
export SERVER_PORT=8080

export DATABASE_HOST=127.0.0.1
export DATABASE_PORT=5432
export DATABASE_USER=sub2api
export DATABASE_PASSWORD=sub2api-postgres
export DATABASE_DBNAME=sub2api
export DATABASE_SSLMODE=disable

export REDIS_HOST=127.0.0.1
export REDIS_PORT=6379
export REDIS_PASSWORD=sub2api-redis
export REDIS_DB=0

export ADMIN_EMAIL=admin@sub2api.local
export ADMIN_PASSWORD=68ac4b43d3938f1595ff0711c93a7ba4

cd backend
go run ./cmd/server
```

如果要让 `go run` 同时提供前端页面，先构建前端 dist，然后带 `embed` tag 启动：

```bash
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend run build

cd backend
go run -tags embed ./cmd/server
```

本机 `go run` 是宿主机进程，连接本机映射出来的 PostgreSQL / Redis 端口时使用 `127.0.0.1`。如果连接的是其他服务器上的 PostgreSQL / Redis，把 `DATABASE_HOST` 和 `REDIS_HOST` 改成对应机器的内网 IP。

需要推送或拉取镜像时，构建机和 App 服务器需要先登录镜像仓库：

```bash
docker login --username='sunqirui@1130078726852283' \
  crpi-4p61yfj4kgj9iup9.cn-hangzhou.personal.cr.aliyuncs.com
```

## 二、发布

云服务器不需要完整源码。只需要把 `deploy/distributed-stack/` 同步到服务器即可。

例如同步到服务器的 `~/sub2api-distributed-stack`：

```bash
rsync -av deploy/distributed-stack/ root@<server-ip>:~/sub2api-distributed-stack/
```

之后在云服务器上进入该目录：

```bash
cd ~/sub2api-distributed-stack
```

下面命令都在这个目录执行。

### 1. 发布 PostgreSQL

在 PostgreSQL 服务器执行：

```bash
sh deploy.sh postgres --yes --install-docker --force \
  --dir "$HOME/sub2api-postgres" \
  --bind-host 0.0.0.0 \
  --port 5432 \
  --password "sub2api-postgres"
```

记下 PostgreSQL 服务器内网 IP，例如：

```bash
export POSTGRES_HOST="10.0.0.10"
export POSTGRES_PASSWORD="sub2api-postgres"
```

如果用 `ifconfig` 查看 IP，通常选择主网卡（例如 `eth0`）上的 `inet`。不要选择 `docker0`、`br-*` 这类 Docker bridge 网段，也不要选择 `127.0.0.1`。例如 `eth0 inet 172.20.137.36`，就应使用 `172.20.137.36`。

### 2. 发布 Redis

在 Redis 服务器执行：

```bash
sh deploy.sh redis --yes --install-docker --force \
  --dir "$HOME/sub2api-redis" \
  --bind-host 0.0.0.0 \
  --port 6379 \
  --password "sub2api-redis"
```

记下 Redis 服务器内网 IP，例如：

```bash
export REDIS_HOST="10.0.0.11"
export REDIS_PASSWORD="sub2api-redis"
```

如果 Redis 和 PostgreSQL 部署在同一台服务器，并且 `eth0 inet` 是 `172.20.137.36`，那么 `REDIS_HOST` 和 `POSTGRES_HOST` 都可以填 `172.20.137.36`。

### 3. 发布 App

在 App 服务器执行。把 `SUB2API_IMAGE` 换成构建机输出的版本镜像。

```bash
export SUB2API_IMAGE="crpi-4p61yfj4kgj9iup9.cn-hangzhou.personal.cr.aliyuncs.com/lincanvas/sub2api:version-YYYYMMDDHHMMSS"
export POSTGRES_HOST="10.0.0.10"
export POSTGRES_PASSWORD="sub2api-postgres"
export REDIS_HOST="10.0.0.11"
export REDIS_PASSWORD="sub2api-redis"

sh deploy.sh app --yes --install-docker --force \
  --dir "$HOME/sub2api-app" \
  --image "$SUB2API_IMAGE" \
  --bind-host 0.0.0.0 \
  --server-port 8080 \
  --database-host "$POSTGRES_HOST" \
  --database-password "$POSTGRES_PASSWORD" \
  --redis-host "$REDIS_HOST" \
  --redis-password "$REDIS_PASSWORD"
```

脚本会输出管理员账号和访问地址。默认管理员账号为 `admin@sub2api.local`，默认密码固定为 `68ac4b43d3938f1595ff0711c93a7ba4`；如需覆盖，可追加 `--admin-email` / `--admin-password`。`http://<应用机器IP>:8080` 中的 `<应用机器IP>` 替换为 App 机器主网卡内网 IP。管理员密码登录后可在个人资料页修改；已有用户不会因为后续修改 `.env` 中的 `ADMIN_PASSWORD` 而被覆盖。

### 4. 修改管理员密码

如果知道当前管理员密码，推荐通过应用接口修改：

```bash
cd deploy/distributed-stack

sh deploy.sh admin-password \
  --dir "$HOME/sub2api-app" \
  --mode api \
  --old-password "<当前密码>" \
  --new-password "<新密码>"
```

如果忘记了当前密码，可以直接重置数据库里的管理员密码：

```bash
cd deploy/distributed-stack

sh deploy.sh admin-password \
  --dir "$HOME/sub2api-app" \
  --mode db \
  --new-password "<新密码>"
```

脚本默认读取 `$HOME/sub2api-app/.env` 中的 `ADMIN_EMAIL`、数据库连接信息，并在成功后同步更新 `.env` 里的 `ADMIN_PASSWORD`。注意：`ADMIN_PASSWORD` 只在首次初始化账号时生效；已有管理员用户必须用上面的命令或后台个人资料页修改密码。

### 5. 更新到新镜像

在 App 服务器修改 `$HOME/sub2api-app/.env` 里的 `SUB2API_IMAGE`，把它换成新的镜像地址：

```bash
cd "$HOME/sub2api-app"

# 示例：改成你的新版本镜像
sed -i.bak 's#^SUB2API_IMAGE=.*#SUB2API_IMAGE="crpi-4p61yfj4kgj9iup9.cn-hangzhou.personal.cr.aliyuncs.com/lincanvas/sub2api:version-YYYYMMDDHHMMSS"#' .env

docker compose --env-file .env pull
docker compose --env-file .env up -d
docker compose --env-file .env logs -f sub2api
```

如果新镜像启动异常，可以把 `.env` 里的 `SUB2API_IMAGE` 改回旧镜像，然后重新执行：

```bash
docker compose --env-file .env up -d
docker compose --env-file .env logs -f sub2api
```

### 6. 检查连通性

在任意能访问三台服务器的机器上执行：

```bash
sh deploy.sh doctor \
  --pg-host "$POSTGRES_HOST" \
  --pg-port 5432 \
  --redis-host "$REDIS_HOST" \
  --redis-port 6379 \
  --app-host "<app-private-ip>" \
  --app-port 8080
```

## 单机部署补充

如果 PostgreSQL、Redis、App 都部署在同一台服务器，App 容器访问宿主机上的 PostgreSQL / Redis 时，不要使用 `127.0.0.1`，要使用 `host.docker.internal`。

App 发布命令改成：

```bash
export POSTGRES_HOST="host.docker.internal"
export REDIS_HOST="host.docker.internal"
```

`compose/app.yml` 已经配置了：

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

所以 Linux Docker 和 Docker Desktop 都可以通过 `host.docker.internal` 从 App 容器访问宿主机映射端口。

## 常用命令

PostgreSQL：

```bash
cd "$HOME/sub2api-postgres"
docker compose --env-file .env ps
docker compose --env-file .env logs -f postgres
docker compose --env-file .env restart postgres
```

Redis：

```bash
cd "$HOME/sub2api-redis"
docker compose --env-file .env ps
docker compose --env-file .env logs -f redis
docker compose --env-file .env restart redis
```

App：

```bash
cd "$HOME/sub2api-app"
docker compose --env-file .env ps
docker compose --env-file .env logs -f sub2api | grep -Ev '"path":"/","method":"HEAD"|"method":"HEAD","path":"/"'
docker compose --env-file .env restart sub2api
```

如果直接查询容器日志，也可以过滤掉首页 `HEAD /` 探活日志：

```bash
docker logs sub2api -f 2>&1 | grep -Ev '"path":"/","method":"HEAD"|"method":"HEAD","path":"/"'
```

## 端口

| 服务 | 映射 |
| --- | --- |
| PostgreSQL | `0.0.0.0:5432 -> container:5432` |
| Redis | `0.0.0.0:6379 -> container:6379` |
| Sub2API | `0.0.0.0:8080 -> container:8080` |

生产环境请用安全组、防火墙或内网 ACL 限制 PostgreSQL `5432` 和 Redis `6379` 只允许 App 服务器访问。
