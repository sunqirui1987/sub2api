# Sub2API 分布式 Docker 启动说明

这份说明适用于服务器上已经安装 Docker，或者已经能看到本地镜像的情况。

例如：

```bash
docker images
```

能看到类似镜像：

```text
crpi-4p61yfj4kgj9iup9.cn-hangzhou.personal.cr.aliyuncs.com/lincanvas/sub2api:version-20260606125919
postgres:18-alpine
redis:8-alpine
```

## 一、已有部署目录时启动

如果已经执行过 `deploy.sh`，服务器上通常会有这些目录：

```bash
$HOME/sub2api-postgres
$HOME/sub2api-redis
$HOME/sub2api-app
```

直接进入对应目录启动即可。

PostgreSQL：

```bash
cd "$HOME/sub2api-postgres"
docker compose --env-file .env up -d
docker compose --env-file .env ps
```

Redis：

```bash
cd "$HOME/sub2api-redis"
docker compose --env-file .env up -d
docker compose --env-file .env ps
```

App：

```bash
cd "$HOME/sub2api-app"
docker compose --env-file .env up -d
docker compose --env-file .env ps
docker compose --env-file .env logs -f sub2api
```

如果只是容器停了，也可以用：

```bash
docker start sub2api-postgres
docker start sub2api-redis
docker start sub2api
```

## 二、已有 Docker 和镜像，但还没有部署目录

先进入同步到服务器的分布式部署目录：

```bash
cd ~/distributed-stack
```

或者你的实际目录：

```bash
cd ~/sub2api-distributed-stack
```

因为 Docker 已经安装，不需要加 `--install-docker`。

如果镜像已经在本地，不想重新拉取镜像，可以加 `--no-pull`。

### 1. 启动 PostgreSQL

```bash
sh deploy.sh postgres --yes --force --no-pull \
  --dir "$HOME/sub2api-postgres" \
  --bind-host 0.0.0.0 \
  --port 5432 \
  --password "sub2api-postgres"
```

启动后查看：

```bash
cd "$HOME/sub2api-postgres"
docker compose --env-file .env ps
docker compose --env-file .env logs -f postgres
```

### 2. 启动 Redis

```bash
sh deploy.sh redis --yes --force --no-pull \
  --dir "$HOME/sub2api-redis" \
  --bind-host 0.0.0.0 \
  --port 6379 \
  --password "sub2api-redis"
```

启动后查看：

```bash
cd "$HOME/sub2api-redis"
docker compose --env-file .env ps
docker compose --env-file .env logs -f redis
```

### 3. 启动 App

下面示例使用本地已有镜像 `version-20260606125919`，并把 Web 端口映射到 `8081`。

```bash
export SUB2API_IMAGE="crpi-4p61yfj4kgj9iup9.cn-hangzhou.personal.cr.aliyuncs.com/lincanvas/sub2api:version-20260606125919"
export POSTGRES_HOST="172.20.137.34"
export POSTGRES_PASSWORD="sub2api-postgres"
export REDIS_HOST="172.20.137.34"
export REDIS_PASSWORD="sub2api-redis"

sh deploy.sh app --yes --force --no-pull \
  --dir "$HOME/sub2api-app" \
  --image "$SUB2API_IMAGE" \
  --bind-host 0.0.0.0 \
  --server-port 8080 \
  --database-host "$POSTGRES_HOST" \
  --database-password "$POSTGRES_PASSWORD" \
  --redis-host "$REDIS_HOST" \
  --redis-password "$REDIS_PASSWORD"
```

启动后查看：

```bash
cd "$HOME/sub2api-app"
docker compose --env-file .env ps
docker compose --env-file .env logs -f sub2api
```

访问地址：

```text
http://<App服务器IP>:8081
```

默认管理员账号：

```text
admin@sub2api.local
```

默认管理员密码：

```text
68ac4b43d3938f1595ff0711c93a7ba4
```

## 三、同一台服务器部署时

如果 PostgreSQL、Redis、App 都在同一台服务器，推荐让 App 连接宿主机主网卡 IP，例如：

```bash
export POSTGRES_HOST="172.20.137.34"
export REDIS_HOST="172.20.137.34"
```

不要填 `127.0.0.1`。App 在容器里运行，`127.0.0.1` 指的是 App 容器自身，不是宿主机。

也可以使用：

```bash
export POSTGRES_HOST="host.docker.internal"
export REDIS_HOST="host.docker.internal"
```

`compose/app.yml` 已配置：

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

## 四、常用管理命令

查看容器：

```bash
docker ps -a
```

查看端口：

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}'
```

重启服务：

```bash
cd "$HOME/sub2api-postgres" && docker compose --env-file .env restart postgres
cd "$HOME/sub2api-redis" && docker compose --env-file .env restart redis
cd "$HOME/sub2api-app" && docker compose --env-file .env restart sub2api
```

停止服务但保留数据：

```bash
cd "$HOME/sub2api-app" && docker compose --env-file .env down --remove-orphans
cd "$HOME/sub2api-postgres" && docker compose --env-file .env down --remove-orphans
cd "$HOME/sub2api-redis" && docker compose --env-file .env down --remove-orphans
```

## 五、连通性检查

在能访问三项服务的机器上执行：

```bash
sh deploy.sh doctor \
  --pg-host "172.20.137.34" \
  --pg-port 5432 \
  --redis-host "172.20.137.34" \
  --redis-port 6379 \
  --app-host "<App服务器IP>" \
  --app-port 8081
```

