# Sub2API 升级镜像与回滚手册

本文用于线上升级 Sub2API App 镜像，并确保升级前有数据备份、升级后可验证、失败时可回滚。

PostgreSQL 和 Redis 数据默认保存在：

```text
$HOME/sub2api-postgres/data/postgres
$HOME/sub2api-redis/data/redis
```

App 配置默认保存在：

```text
$HOME/sub2api-app/.env
$HOME/sub2api-app/docker-compose.yml
```

## 一、本次升级镜像

新镜像：

```text
crpi-4p61yfj4kgj9iup9.cn-hangzhou.personal.cr.aliyuncs.com/lincanvas/sub2api:version-20260616115443
```

你当前线上旧镜像示例：

```text
crpi-4p61yfj4kgj9iup9.cn-hangzhou.personal.cr.aliyuncs.com/lincanvas/sub2api:version-20260606125919
```

实际升级时不要只看文档里的旧镜像，先在服务器上记录当前正在运行的镜像。

## 二、升级前检查

在服务器上确认当前容器状态：

```bash
docker ps
docker inspect -f '{{.Config.Image}}' sub2api
```

确认 App、PostgreSQL、Redis 都是 `healthy` 或至少处于正常运行状态：

```bash
docker ps --filter name=sub2api
```

确认部署目录存在：

```bash
ls -la "$HOME/sub2api-app" "$HOME/sub2api-postgres" "$HOME/sub2api-redis"
```

## 三、升级前备份

先创建本次升级备份目录：

```bash
export BACKUP_ROOT="$HOME/sub2api-backups/$(date +%Y%m%d%H%M%S)"
mkdir -p "$BACKUP_ROOT"
echo "$BACKUP_ROOT"
```

记录当前旧镜像，回滚时会用到：

```bash
docker inspect -f '{{.Config.Image}}' sub2api > "$BACKUP_ROOT/old-sub2api-image.txt"
cat "$BACKUP_ROOT/old-sub2api-image.txt"
```

备份 App 配置：

```bash
cp "$HOME/sub2api-app/.env" "$BACKUP_ROOT/app.env"
cp "$HOME/sub2api-app/docker-compose.yml" "$BACKUP_ROOT/app.docker-compose.yml"
```

备份 PostgreSQL：

```bash
docker exec sub2api-postgres pg_dump -U sub2api -d sub2api \
  -Fc -f "/tmp/sub2api-postgres.dump"

docker cp sub2api-postgres:/tmp/sub2api-postgres.dump \
  "$BACKUP_ROOT/sub2api-postgres.dump"
```

触发 Redis 持久化并备份 Redis 数据目录：

```bash
docker exec sub2api-redis redis-cli bgsave

# 等几秒后查看 bgsave 状态，rdb_bgsave_in_progress:0 表示完成
docker exec sub2api-redis redis-cli info persistence | grep rdb_bgsave_in_progress

tar -czf "$BACKUP_ROOT/sub2api-redis-data.tgz" \
  -C "$HOME/sub2api-redis/data" redis
```

建议再备份一份部署目录的关键文件：

```bash
tar -czf "$BACKUP_ROOT/sub2api-deploy-config.tgz" \
  -C "$HOME" sub2api-app/docker-compose.yml sub2api-app/.env
```

备份完成后确认文件存在：

```bash
ls -lh "$BACKUP_ROOT"
```

## 四、升级到新镜像

设置新镜像变量：

```bash
export NEW_IMAGE="crpi-4p61yfj4kgj9iup9.cn-hangzhou.personal.cr.aliyuncs.com/lincanvas/sub2api:version-20260616115443"
```

修改 App 部署目录里的镜像：

```bash
cd "$HOME/sub2api-app"

cp .env ".env.before-update.$(date +%Y%m%d%H%M%S)"
sed -i.bak "s#^SUB2API_IMAGE=.*#SUB2API_IMAGE=\"${NEW_IMAGE}\"#" .env
grep '^SUB2API_IMAGE=' .env
```

这里使用 `sed -i.bak`，macOS 和 Linux 都可执行，并会额外生成一个 `.env.bak` 备份文件。

拉取新镜像：

```bash
docker compose --env-file .env pull sub2api
```

如果拉取时报没有权限或需要登录，先登录镜像仓库后再执行 `pull`：

```bash
docker login crpi-4p61yfj4kgj9iup9.cn-hangzhou.personal.cr.aliyuncs.com
docker compose --env-file .env pull sub2api
```

切换到新镜像：

```bash
docker compose --env-file .env up -d sub2api
```

查看容器状态：

```bash
docker compose --env-file .env ps
docker inspect -f '{{.Config.Image}} {{.State.Status}} {{.State.Health.Status}}' sub2api
```

查看日志：

```bash
docker compose --env-file .env logs -f sub2api
```

## 五、升级后验证

健康检查：

```bash
curl -fsS http://127.0.0.1:8080/health
```

确认当前运行镜像已经是新镜像：

```bash
docker inspect -f '{{.Config.Image}}' sub2api
```

确认 PostgreSQL 和 Redis 仍然正常：

```bash
docker inspect -f '{{.Name}} {{.State.Status}} {{.State.Health.Status}}' \
  sub2api-postgres sub2api-redis sub2api
```

建议用浏览器访问后台，并至少验证：

```text
http://<服务器IP>:8080
```

- 管理员能登录。
- 账号列表和 Key 列表能打开。
- 用一个已有 API Key 发起一次测试请求。

## 六、快速回滚 App 镜像

如果新镜像启动失败、健康检查失败、登录异常或接口异常，先回滚 App 镜像。这个回滚不会动 PostgreSQL 和 Redis 数据。

读取升级前记录的旧镜像：

```bash
export BACKUP_ROOT="<第三步生成的备份目录>"
export OLD_IMAGE="$(cat "$BACKUP_ROOT/old-sub2api-image.txt")"
echo "$OLD_IMAGE"
```

把 `.env` 改回旧镜像：

```bash
cd "$HOME/sub2api-app"
sed -i.bak "s#^SUB2API_IMAGE=.*#SUB2API_IMAGE=\"${OLD_IMAGE}\"#" .env
grep '^SUB2API_IMAGE=' .env
```

重新拉起旧镜像：

```bash
docker compose --env-file .env up -d sub2api
docker compose --env-file .env ps
docker compose --env-file .env logs -f sub2api
```

验证回滚结果：

```bash
docker inspect -f '{{.Config.Image}} {{.State.Status}} {{.State.Health.Status}}' sub2api
curl -fsS http://127.0.0.1:8080/health
```

## 七、需要恢复数据库时

普通镜像升级失败通常只需要回滚 App 镜像，不要恢复数据库。

只有在确认新版本已经写坏数据，且必须回到备份点时，才恢复 PostgreSQL。恢复前建议先停止 App，避免恢复过程中继续写入：

```bash
cd "$HOME/sub2api-app"
docker compose --env-file .env stop sub2api
```

恢复 PostgreSQL 备份会覆盖数据库内容。执行前再次确认备份目录：

```bash
export BACKUP_ROOT="<第三步生成的备份目录>"
ls -lh "$BACKUP_ROOT/sub2api-postgres.dump"
```

把备份复制到 PostgreSQL 容器：

```bash
docker cp "$BACKUP_ROOT/sub2api-postgres.dump" \
  sub2api-postgres:/tmp/sub2api-postgres.dump
```

重建并恢复数据库：

```bash
docker exec sub2api-postgres sh -c '
set -e
dropdb -U sub2api sub2api
createdb -U sub2api sub2api
pg_restore -U sub2api -d sub2api --clean --if-exists /tmp/sub2api-postgres.dump
'
```

恢复 App：

```bash
cd "$HOME/sub2api-app"
docker compose --env-file .env up -d sub2api
docker compose --env-file .env logs -f sub2api
```

## 八、升级完成后保留什么

升级成功后建议保留：

- 本次新镜像地址。
- `old-sub2api-image.txt`。
- `app.env`。
- `sub2api-postgres.dump`。
- `sub2api-redis-data.tgz`。

至少保留到你确认新版本稳定运行一段时间后再清理。

## 九、本次线上命令速查

本次从线上旧镜像升级到新镜像，最短命令如下。执行前仍然建议完整走第三步备份。

```bash
export NEW_IMAGE="crpi-4p61yfj4kgj9iup9.cn-hangzhou.personal.cr.aliyuncs.com/lincanvas/sub2api:version-20260616115443"
export BACKUP_ROOT="$HOME/sub2api-backups/$(date +%Y%m%d%H%M%S)"
mkdir -p "$BACKUP_ROOT"

docker inspect -f '{{.Config.Image}}' sub2api > "$BACKUP_ROOT/old-sub2api-image.txt"
cp "$HOME/sub2api-app/.env" "$BACKUP_ROOT/app.env"
docker exec sub2api-postgres pg_dump -U sub2api -d sub2api -Fc -f /tmp/sub2api-postgres.dump
docker cp sub2api-postgres:/tmp/sub2api-postgres.dump "$BACKUP_ROOT/sub2api-postgres.dump"
docker exec sub2api-redis redis-cli bgsave
tar -czf "$BACKUP_ROOT/sub2api-redis-data.tgz" -C "$HOME/sub2api-redis/data" redis

cd "$HOME/sub2api-app"
sed -i.bak "s#^SUB2API_IMAGE=.*#SUB2API_IMAGE=\"${NEW_IMAGE}\"#" .env
docker compose --env-file .env pull sub2api
docker compose --env-file .env up -d sub2api
docker compose --env-file .env ps
curl -fsS http://127.0.0.1:8080/health
```

快速回滚：

```bash
export OLD_IMAGE="$(cat "$BACKUP_ROOT/old-sub2api-image.txt")"
cd "$HOME/sub2api-app"
sed -i.bak "s#^SUB2API_IMAGE=.*#SUB2API_IMAGE=\"${OLD_IMAGE}\"#" .env
docker compose --env-file .env up -d sub2api
curl -fsS http://127.0.0.1:8080/health
```
