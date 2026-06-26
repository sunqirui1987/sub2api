# Sub2API 分布式 Docker 管理手册

本手册用于管理 `deploy/distributed-stack/` 部署出来的 Docker 服务，并提供安全删除与彻底清理命令。

默认部署目录：

| 节点 | 默认目录 | 容器名 | Compose 文件 |
| --- | --- | --- | --- |
| App | `$HOME/sub2api-app` | `sub2api` | `app.yml` |
| PostgreSQL | `$HOME/sub2api-postgres` | `sub2api-postgres` | `postgres.yml` |
| Redis | `$HOME/sub2api-redis` | `sub2api-redis` | `redis.yml` |

下面命令需要在对应服务器上执行。如果三类服务部署在三台机器，就分别登录对应机器操作；如果部署在同一台机器，可以在同一台机器依次执行。

## 一、查看状态

查看当前机器上所有 Docker 容器：

```bash
docker ps -a
```

查看当前机器上所有 Docker 镜像、网络、数据卷：

```bash
docker images
docker network ls
docker volume ls
```

查看 Sub2API 三个默认容器：

```bash
docker ps -a --filter "name=sub2api"
```

## 二、日常管理

### App

```bash
cd "$HOME/sub2api-app"

docker compose --env-file .env ps
docker compose --env-file .env logs -f sub2api
docker compose --env-file .env restart sub2api
docker compose --env-file .env stop sub2api
docker compose --env-file .env start sub2api
```

### PostgreSQL

```bash
cd "$HOME/sub2api-postgres"

docker compose --env-file .env ps
docker compose --env-file .env logs -f postgres
docker compose --env-file .env restart postgres
docker compose --env-file .env stop postgres
docker compose --env-file .env start postgres
```

### Redis

```bash
cd "$HOME/sub2api-redis"

docker compose --env-file .env ps
docker compose --env-file .env logs -f redis
docker compose --env-file .env restart redis
docker compose --env-file .env stop redis
docker compose --env-file .env start redis
```

## 三、更新镜像并重启

App 更新到新的镜像时，先修改 `$HOME/sub2api-app/.env` 里的 `SUB2API_IMAGE`，然后执行：

```bash
cd "$HOME/sub2api-app"

docker compose --env-file .env pull
docker compose --env-file .env up -d
docker compose --env-file .env logs -f sub2api
```

PostgreSQL / Redis 通常不需要频繁更新基础镜像。更新前建议先备份数据。

## 四、只删除容器，保留配置和数据

这些命令会停止并删除 compose 创建的容器和默认网络，但保留部署目录、`.env`、PostgreSQL 数据和 Redis 数据。

App：

```bash
cd "$HOME/sub2api-app"
docker compose --env-file .env down --remove-orphans
```

PostgreSQL：

```bash
cd "$HOME/sub2api-postgres"
docker compose --env-file .env down --remove-orphans
```

Redis：

```bash
cd "$HOME/sub2api-redis"
docker compose --env-file .env down --remove-orphans
```

恢复启动：

```bash
cd "$HOME/sub2api-app" && docker compose --env-file .env up -d
cd "$HOME/sub2api-postgres" && docker compose --env-file .env up -d
cd "$HOME/sub2api-redis" && docker compose --env-file .env up -d
```

## 五、彻底删除本项目 Docker 与本项目数据

危险：下面命令会删除 Sub2API 的容器、配置文件和本地数据目录。PostgreSQL 与 Redis 数据删除后无法恢复，除非你已经有备份。

建议先确认目录：

```bash
ls -la "$HOME/sub2api-app" "$HOME/sub2api-postgres" "$HOME/sub2api-redis"
```

停止并删除容器：

```bash
cd "$HOME/sub2api-app" && docker compose --env-file .env down --remove-orphans
cd "$HOME/sub2api-postgres" && docker compose --env-file .env down --remove-orphans
cd "$HOME/sub2api-redis" && docker compose --env-file .env down --remove-orphans
```

删除部署目录和数据：

```bash
rm -rf "$HOME/sub2api-app"
rm -rf "$HOME/sub2api-postgres"
rm -rf "$HOME/sub2api-redis"
```

删除本项目默认容器名残留：

```bash
docker rm -f sub2api sub2api-postgres sub2api-redis 2>/dev/null || true
```

删除本项目镜像：

```bash
docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | grep 'sub2api' || true
docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | grep 'sub2api' | awk '{print $2}' | xargs -r docker rmi -f
```

清理未使用的 Docker 网络、构建缓存和悬空镜像：

```bash
docker system prune -f
```

## 六、删除当前机器上的所有 Docker 容器

危险：这会停止并删除当前机器上的所有容器，不只 Sub2API。

```bash
docker ps -aq
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
```

如果当前没有容器，上面的 `docker stop` / `docker rm` 可能会提示缺少参数。可以使用更稳妥的写法：

```bash
docker ps -aq | xargs -r docker stop
docker ps -aq | xargs -r docker rm
```

## 七、删除当前机器上的所有 Docker 数据

极度危险：这会删除当前机器上的所有容器、镜像、网络、构建缓存和未被容器使用的数据卷。不要在还有其他业务运行的机器上执行。

```bash
docker ps -aq | xargs -r docker stop
docker ps -aq | xargs -r docker rm
docker system prune -a --volumes -f
```

如果还需要删除 Docker 默认数据目录，需要先确认系统没有任何 Docker 业务依赖，并停止 Docker 服务后再操作：

```bash
sudo systemctl stop docker
sudo rm -rf /var/lib/docker
sudo systemctl start docker
```

## 八、常见排查

查看容器最近 200 行日志：

```bash
docker logs --tail 200 sub2api
docker logs --tail 200 sub2api-postgres
docker logs --tail 200 sub2api-redis
```

进入容器：

```bash
docker exec -it sub2api sh
docker exec -it sub2api-postgres sh
docker exec -it sub2api-redis sh
```

查看端口占用：

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}'
```

重新检查服务连通性：

```bash
sh deploy.sh doctor \
  --pg-host "<postgres-ip>" \
  --pg-port 5432 \
  --redis-host "<redis-ip>" \
  --redis-port 6379 \
  --app-host "<app-ip>" \
  --app-port 8080
```

