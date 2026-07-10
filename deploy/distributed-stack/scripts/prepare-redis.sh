#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${SCRIPT_DIR}/common.sh"

TARGET_DIR="${TARGET_DIR:-${HOME:-$(pwd)}/sub2api-redis}"
REDIS_IMAGE="${REDIS_IMAGE:-redis:8-alpine}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
REDIS_BIND_HOST="${REDIS_BIND_HOST:-0.0.0.0}"
REDIS_PORT="${REDIS_PORT:-6379}"
TZ_VALUE="${TZ:-Asia/Shanghai}"
ASSUME_YES=0
FORCE=0
START=1
PULL=1
INSTALL_DOCKER=0

usage() {
    cat <<'EOF'
Redis 节点准备脚本

用法:
  ./scripts/prepare-redis.sh [options]

参数:
  --dir DIR                    部署目录，默认 ~/sub2api-redis
  --password PASSWORD          Redis 密码，留空自动生成
  --bind-host HOST             默认 0.0.0.0，分布式部署需要应用机器可访问
  --port PORT                  默认 6379
  --install-docker             空 Linux/macOS 上尝试安装 Docker
  --no-pull                    不拉镜像
  --no-start                   只生成文件不启动
  --yes, -y                    非交互模式
  --force                      覆盖已有 .env
EOF
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        --dir) TARGET_DIR="$2"; shift 2 ;;
        --password) REDIS_PASSWORD="$2"; shift 2 ;;
        --bind-host) REDIS_BIND_HOST="$2"; shift 2 ;;
        --port) REDIS_PORT="$2"; shift 2 ;;
        --install-docker) INSTALL_DOCKER=1; shift ;;
        --no-pull) PULL=0; shift ;;
        --no-start) START=0; shift ;;
        --yes|-y) ASSUME_YES=1; shift ;;
        --force) FORCE=1; shift ;;
        --help|-h) usage; exit 0 ;;
        *) print_error "未知参数: $1"; usage; exit 1 ;;
    esac
done

if [ "$ASSUME_YES" -eq 0 ] && has_tty; then
    TARGET_DIR="$(prompt_value "$ASSUME_YES" "部署目录" "$TARGET_DIR")"
    REDIS_BIND_HOST="$(prompt_value "$ASSUME_YES" "监听地址" "$REDIS_BIND_HOST")"
    REDIS_PORT="$(prompt_value "$ASSUME_YES" "监听端口" "$REDIS_PORT")"
    REDIS_PASSWORD="$(prompt_secret "$ASSUME_YES" "Redis 密码" "$REDIS_PASSWORD")"
fi

if ! validate_port "$REDIS_PORT"; then print_error "端口无效: $REDIS_PORT"; exit 1; fi
need_cmd openssl
REDIS_PASSWORD="${REDIS_PASSWORD:-$(generate_secret)}"

if [ "$START" -eq 1 ] || [ "$PULL" -eq 1 ]; then
    ensure_docker "$INSTALL_DOCKER"
fi

mkdir -p "$TARGET_DIR/data/redis"
copy_template "$STACK_DIR/compose/redis.yml" "$TARGET_DIR"
ENV_FILE="$TARGET_DIR/.env"
check_overwrite_env "$ENV_FILE" "$FORCE"
: > "$ENV_FILE"
write_env_line "$ENV_FILE" REDIS_IMAGE "$REDIS_IMAGE"
write_env_line "$ENV_FILE" REDIS_CONTAINER_NAME "sub2api-redis"
write_env_line "$ENV_FILE" REDIS_PASSWORD "$REDIS_PASSWORD"
write_env_line "$ENV_FILE" REDIS_BIND_HOST "$REDIS_BIND_HOST"
write_env_line "$ENV_FILE" REDIS_PORT "$REDIS_PORT"
write_env_line "$ENV_FILE" REDIS_MAXCLIENTS "10000"
write_env_line "$ENV_FILE" TZ "$TZ_VALUE"
chmod 600 "$ENV_FILE"

if [ "$PULL" -eq 1 ]; then
    (cd "$TARGET_DIR" && compose --env-file .env pull)
fi
if [ "$START" -eq 1 ]; then
    (cd "$TARGET_DIR" && compose --env-file .env up -d)
fi

print_success "Redis 节点已准备完成: $TARGET_DIR"
HOST_IP="$(detect_host_ip)"
echo "连接信息:"
echo "  host=$HOST_IP"
echo "  port=$REDIS_PORT"
echo "  password=$REDIS_PASSWORD"
print_warning "请只允许应用机器访问 Redis 端口，不要直接暴露公网"
